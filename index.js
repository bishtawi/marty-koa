"use strict";
var React = require('react');
var Router = require('react-router');
var ServerCookies = require('./serverCookies');
var _ = require('lodash');

var HEADERS_TO_IGNORE = [
  'accept',
  'accept-encoding',
  'host',
  'connection'
];

module.exports = function (options) {
  options = options || {};

  if (!options.routes) {
    throw new Error('routes is required');
  }

  if (!options.view) {
    throw new Error('view is required');
  }

  var Marty = options.marty || require('marty');

  Marty.CookieStateSource.setCookieFactory(function (context) {
    return new ServerCookies(context.koaContext);
  });

  Marty.LocationStateSource.setLocationFactory(function (context) {
    return _.pick(context.koaContext, 'url', 'protocol', 'query', 'path', 'hostname');
  });

  Marty.HttpStateSource.addHook({
    priority: 0.00000000001,
    before: function (req) {
      var context = this.context;

      if (!context || !context.koaContext) {
        console.error("missing koa context");
        return;
      }

      // Don't change fully qualified urls
      if (!/^https?:\/\//.test(req.url)) {
        req.url = getBaseUrl(context.koaContext) + req.url;
      }

      // Add all headers from original request
      _.extend(req.headers, headers());

      function getBaseUrl(ctx) {
        return ctx.protocol + '://' + ctx.host;
      }

      function headers() {
        return _.omit(context.koaContext.headers, HEADERS_TO_IGNORE);
      }
    }
  });

  return function *() {
    var url = this.url;
    var koaContext = this;

    function renderReact() {
      return new Promise(function (resolve, reject) {
        var router = Router.create({
          location: url,
          routes: options.routes,
          onAbort: function (abortReason) {
            console.error("Routing Abort", abortReason);
            if (abortReason && abortReason.to) {
              reject({
                redirect: router.makePath(abortReason.to, abortReason.params, abortReason.query)
              })
            } else {
              reject({
                status: 500
              })
            }
          },
          onError: function (err) {
            console.error('Routing Error', err);
            reject({
              status: 500
            })
          }
        });

        router.run(function (Handler, state) {
          var context = Marty.createContext();
          context.koaContext = koaContext;

          var renderOptions = {
            type: Handler,
            context: context,
            props: state.params,
            timeout: options.timeout
          };

          Marty
            .renderToString(renderOptions)
            .then(function (renderResult) {
              var data = {};
              if (options.getProps) {
                data = options.getProps.call(koaContext, state, renderResult) || {};
              }
              data[options.local || 'body'] = renderResult.html;
              var doctype = options.doctype || '<!DOCTYPE html>';
              var View = React.createFactory(options.view);

              var html = doctype + React.renderToStaticMarkup(View(data));

              if (data.is404 || state.routes.some(function (route) {
                  return route.isNotFound;
                })) {
                console.warn('404', state.path);
                reject({
                  status: 404,
                  html: html
                })
              } else if (data.is500) {
                console.warn('500', state.path);
                reject({
                  status: 500,
                  html: html
                })
              } else {
                resolve(html);
              }
            })
            .catch(function (error) {
              console.error('Failed to render', url);
              console.error(error.stack)
              reject({
                status: 500
              })
            });
        });
      });
    }

    try {
      this.body = yield renderReact();
      console.info('PAGE SENT')
    } catch (error) {
      if (error.redirect) {
        this.redirect(error.redirect)
      } else if (error.status) {
        this.status = error.status;
      } else {
        console.error(error);
        this.status = 500;
      }
      if (error.html) {
        this.body = error.html;
      }
    }
  };
};
