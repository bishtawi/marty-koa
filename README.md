# marty-koa

Forked from [marty-express](https://github.com/martyjs/marty-express) by [jhollingworth](https://github.com/jhollingworth) to work with koa instead of express

## Marty compatibility
* Works with Marty v0.10.x
* For 0.9 support, you can use the [old version here](https://github.com/bishtawi/marty-koa/tree/marty-v0.9)

## Major changes from marty-express
1. Works with Koa now (and obviously does not work with Express anymore)
2. Final html rendered with React instead of your favorite node/express/koa render middleware
3. options.view now takes in a React component instead of a path and is now required.
4. options.rendered and options.error callbacks have been removed (I had no use for them but they can easily be readded if you need them)
5. Return 404 status if Not Found route is hit
6. Added options.getProps callback (see below on how to use)

## New options.getProps callback function

You might want to send additional props to your final view React component (such as title or description). This callback function helps you do that.

The getProps function is passed the React Router state object and Marty's renderResult object. The "this" context is set to Koa's context.

The getProps function should return a object containing the props you would like to send to your view component.

### Special props
* Set is404 to true if you want to force a 404 status
* Set is500 to true if you want to force a 500 status

## Example on how to use

index.js:
````
import DocumentTitle from 'react-document-title'

app.use(require('./marty-koa')({
  marty: require('marty'),
  routes: require('./assets/js/routes'),
  application: require('./marty-application'),
  view: require('./view'),
  getProps: function (state, renderResult) {
    return {
      title: DocumentTitle.rewind()
    };
  }
}));
````

view.jsx:
````
import React from 'react'

export default React.createClass({
  render: function () {
    return (
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>
        <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1, minimum-scale=1, maximum-scale=1"/>
        <title>{this.props.title}</title>
        <script src="/static/assets/js/main.js"></script>
      </head>
      <body>
        <div id="app" dangerouslySetInnerHTML={{__html: this.props.body}}></div>
        <div dangerouslySetInnerHTML={{__html: this.props.state}}></div>
      </body>
      </html>
    );
  }
});
````

React-Document-Title is obviously not a dependency, this is just an example on how you would use marty-koa and react-doument-title together to set the title. Similar logic can be used for setting meta description tag and various other things.

## TODO
1. Update unit tests to use koa not express
2. Build to npm

## License

* [MIT](https://raw.githubusercontent.com/bishtawi/marty-koa/master/LICENSE)