express = require 'express'
coffeeify = require 'coffeeify'
derby = require 'derby'
racerBrowserChannel = require 'racer-browserchannel'
liveDbMongo = require 'livedb-mongo'
serverError = require './serverError'
app = require '../app'

expressApp = module.exports = express()

if process.env.REDIS_HOST
  redis = require('redis').createClient process.env.REDIS_PORT, process.env.REDIS_HOST
  redis.auth process.env.REDIS_PASSWORD
else if process.env.OPENREDIS_URL
  redisUrl = require('url').parse process.env.OPENREDIS_URL
  redis = require('redis').createClient redisUrl.port, redisUrl.hostname
  redis.auth redisUrl.auth.split(":")[1]
else
  redis = require('redis').createClient()
redis.select 4
mongoUrl = process.env.MONGO_URL || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/derby-sink'
# The store creates models and syncs data
store = derby.createStore
  db: liveDbMongo(mongoUrl + '?auto_reconnect', safe: true)
  redis: redis

store.on 'bundle', (browserify) ->
  # Add support for directly requiring coffeescript in browserify bundles
  browserify.transform coffeeify

ipMiddleware = (req, res, next) ->
  forwarded = req.header 'x-forwarded-for'
  ipAddress = forwarded && forwarded.split(',')[0] ||
    req.connection.remoteAddress

  model = req.getModel()
  model.set '_info.ipAddress', ipAddress
  next()

expressApp
  .use(express.favicon())
  # Gzip dynamically rendered content
  .use(express.compress())
  .use(app.scripts(store))

  # Add browserchannel client-side scripts to model bundles created by store,
  # and return middleware for responding to remote client messages
  .use(racerBrowserChannel store)
  # Adds req.getModel method
  .use(store.modelMiddleware())

  .use(ipMiddleware)

  # Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(serverError())

expressApp.all '*', (req, res, next) ->
  next '404: ' + req.url
