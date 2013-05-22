var http = require('http');
var express = require('express');
var derby = require('derby');
var app = require('../app');
var serverError = require('./serverError');

var expressApp = express();
var server = http.createServer(expressApp);

module.exports = server;

// The store creates models and syncs data
var store = derby.createStore({
  server: server
, db: derby.db.mongo('localhost:27017/derby-directory?auto_reconnect', {safe: true})
});

store
  .use(require('racer-browserchannel'))

expressApp
  .use(express.favicon())
  // Gzip dynamically rendered content
  .use(express.compress())

  // Respond to requests for application script bundles
  .use(app.scripts(store))
  // racer-browserchannel adds a middleware to the store for responding to
  // requests from remote models
  .use(store.socketMiddleware())

  // Adds req.getModel method
  .use(store.modelMiddleware())
  // Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(serverError())

expressApp.all('*', function(req, res, next) {
  next('404: ' + req.url);
})
