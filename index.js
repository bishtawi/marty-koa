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

  if (!_.isFunction(options.application)) {
    throw new Error('Must specify application type');
  }

  var Marty = options.marty || require('marty');

  Marty.CookieStateSource.setCookieFactory(function (app) {
    return new ServerCookies(app.koa);
  });

  Marty.LocationStateSource.setLocationFactory(function (app) {
    return _.pick(app.koa, 'url', 'protocol', 'query', 'path', 'hostname');
  });

  Marty.HttpStateSource.addHook({
    id: 'marty-koa-http-state-source',
    priority: 0.00000000001,
    before: function (req) {
      var app = this.app;

      if (!app || !app.koa) {
        console.error("missing koa context");
        return;
      }

      // Don't change fully qualified urls
      if (!/^https?:\/\//.test(req.url)) {
        req.url = getBaseUrl(app.koa) + req.url;
      }

      // Add all headers from original request
      _.extend(req.headers, headers());

      function getBaseUrl(ctx) {
        return ctx.protocol + '://' + ctx.host;
      }

      function headers() {
        return _.omit(app.koa.headers, HEADERS_TO_IGNORE);
      }
    }
  });

  return function *() {
    var url = this.url;
    var koa = this;

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
          var app = new options.application({
            koa: koa
          });

          var element = React.createElement(Marty.ApplicationContainer, {app: app},
            React.createElement(Handler, state.params)
          );

          app.renderToString(element, options)
            .then(function (renderResult) {
              var data = {};
              if (_.isFunction(options.getProps)) {
                data = options.getProps.call(koa, state, renderResult) || {};
              }
              data[options.body || 'body'] = renderResult.htmlBody.trim();
              data[options.state || 'state'] = renderResult.htmlState.trim();

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
