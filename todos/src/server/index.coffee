express = require 'express'
coffeeify = require 'coffeeify'
derby = require 'derby'
racerBrowserChannel = require 'racer-browserchannel'
liveDbMongo = require 'livedb-mongo'
serverError = require './serverError'
app = require '../todos'

expressApp = module.exports = express()

# The store creates models and syncs data
if process.env.REDISTOGO_URL
  redisUrl = require('url').parse process.env.REDISTOGO_URL
  redis = require('redis').createClient redisUrl.port, redisUrl.hostname
  redis.auth(redisUrl.auth.split(":")[1])
else
  redis = require('redis').createClient()
redis.select 5
mongoUri = process.env.MONGOHQ_URL || 'mongodb://localhost:27017/derby-todos'
store = derby.createStore
  db: liveDbMongo(mongoUri + '?auto_reconnect', safe: true)
  redis: redis

publicDir = require('path').join __dirname + '/../../public'

store.on 'bundle', (browserify) ->
  browserify.add publicDir + '/jquery-1.9.1.min.js'
  browserify.add publicDir + '/jquery-ui-1.10.3.custom.min.js'
  # Add support for directly requiring coffeescript in browserify bundles
  browserify.transform coffeeify

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

  # Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(serverError())

expressApp.all '*', (req, res, next) ->
  next '404: ' + req.url
