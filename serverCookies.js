"use strict";
function ServerCookies(ctx) {
  if (!ctx) {
    throw new Error('koa context is required');
  }

  this.ctx = ctx;
}

ServerCookies.prototype = {
  get: function (key) {
    return this.ctx.cookies.get(key);
  },
  set: function (key, value, options) {
    this.ctx.cookies.set(key, value, options);
  },
  expire: function (key) {
    this.ctx.cookies.set(key, '');
  }
}

module.exports = ServerCookies;