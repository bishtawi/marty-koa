"use strict";
function ServerCookies(koa) {
  if (!koa) {
    throw new Error('koa context is required');
  }

  this.koa = koa;
}

ServerCookies.prototype = {
  get: function (key) {
    return this.koa.cookies.get(key);
  },
  set: function (key, value, options) {
    this.koa.cookies.set(key, value, options);
  },
  expire: function (key) {
    this.koa.cookies.set(key, '');
  }
}

module.exports = ServerCookies;
