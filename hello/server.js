var http = require('http');
var express = require('express');
var derby = require('derby');
var app = require('./app');

var expressApp = express();
var server = http.createServer(expressApp);

// The store creates models and syncs data
var store = derby.createStore({
  server: server
, db: derby.db.mongo('localhost:27017/test?auto_reconnect', {safe: true})
});

store
  .use(require('racer-browserchannel'))

expressApp
  .use(express.compress())
  // Respond to requests for application script bundles
  .use(app.scripts(store))
  // racer-browserchannel adds a middleware to the store for responding to
  // requests from remote models
  .use(store.socketMiddleware())
  // The store creates models for incoming requests
  .use(store.modelMiddleware())
  // App routes create an Express middleware
  .use(app.router())

server.listen(3000);
