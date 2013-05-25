express = require 'express'
coffeeify = require 'coffeeify'
MongoStore = require('connect-mongo')(express)
derby = require 'derby'
racerBrowserChannel = require 'racer-browserchannel'
liveDbMongo = require 'livedb-mongo'
serverError = require './serverError'
app = require '../chat'

expressApp = module.exports = express()

# The store creates models and syncs data
if process.env.REDISCLOUD_URL
  redisUrl = require('url').parse process.env.REDISCLOUD_URL
  redis = require('redis').createClient redisUrl.port, redisUrl.hostname, {no_ready_check: true}
  redis.auth(redisUrl.auth.split(":")[1])
else
  redis = require('redis').createClient()
redis.select 1
mongoUri = process.env.MONGOHQ_URL || 'localhost:27017/derby-chat'
store = derby.createStore
  db: liveDbMongo(mongoUri + '?auto_reconnect', safe: true)
  redis: redis

store.on 'bundle', (browserify) ->
  # Add support for directly requiring coffeescript in browserify bundles
  browserify.transform coffeeify

createUserId = (req, res, next) ->
  model = req.getModel()
  userId = req.session.userId ||= model.id()
  model.set '_session.userId', userId
  next()

expressApp
  .use(express.favicon())
  # Gzip dynamically rendered content
  .use(express.compress())
  # Respond to requests for application script bundles
  .use(app.scripts(store))
  .use(express.static __dirname + '/../../public')

  # Add browserchannel client-side scripts to model bundles created by store,
  # and return middleware for responding to remote client messages
  .use(racerBrowserChannel store)
  # Adds req.getModel method
  .use(store.modelMiddleware())

  .use(express.cookieParser())
  .use(express.session
    secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE'
    store: new MongoStore(db: 'derby-chat', safe: true)
  )
  .use(createUserId)

  # Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(serverError())

expressApp.all '*', (req, res, next) ->
  next '404: ' + req.url
