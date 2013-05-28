var express = require('express');
var derby = require('derby');
var racerBrowserChannel = require('racer-browserchannel');
var liveDbMongo = require('livedb-mongo');
var app = require('./app');

if (process.env.REDIS_HOST) {
  var redis = require('redis').createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
  redis.auth(process.env.REDIS_PASSWORD);
} else if (process.env.OPENREDIS_URL) {
  var redisUrl = require('url').parse(process.env.OPENREDIS_URL);
  var redis = require('redis').createClient(redisUrl.port, redisUrl.hostname);
  redis.auth(redisUrl.auth.split(":")[1]);
} else {
  var redis = require('redis').createClient();
}
redis.select(3);
var mongoUrl = process.env.MONGO_URL || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/derby-directory';
// The store creates models and syncs data
var store = derby.createStore({
  db: liveDbMongo(mongoUrl + '?auto_reconnect', {safe: true})
, redis: redis
});

module.exports = express()
  .use(express.favicon())
  .use(express.compress())
  // Add browserchannel client-side scripts to model bundles created by store,
  // and return middleware for responding to remote client messages
  .use(racerBrowserChannel(store))
  // Respond to requests for application script bundles
  .use(app.scripts(store))
  // The store creates models for incoming requests
  .use(store.modelMiddleware())
  // App routes create an Express middleware
  .use(app.router())
