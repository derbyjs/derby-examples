fs = require 'fs'
express = require 'express'
coffeeify = require 'coffeeify'
MongoStore = require('connect-mongo')(express)
derby = require 'derby'
racerBrowserChannel = require 'racer-browserchannel'
liveDbMongo = require 'livedb-mongo'
# serverError = require './serverError'
app = require '../chat'

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
redis.select 11
mongoUrl = process.env.MONGO_URL || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/derby-chat'
# The store creates models and syncs data
store = derby.createStore
  db: liveDbMongo(mongoUrl + '?auto_reconnect', safe: true)
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
  .use(app.scripts store)
  .use(express.static __dirname + '/../../public')

  # Add browserchannel client-side scripts to model bundles created by store,
  # and return middleware for responding to remote client messages
  .use(racerBrowserChannel store)
  # Adds req.getModel method
  .use(store.modelMiddleware())

  .use(express.cookieParser())
  .use(express.session
    secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE'
    store: new MongoStore(url: mongoUrl, safe: true)
  )
  .use(createUserId)

  # Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  # .use(serverError())

expressApp.all '*', (req, res, next) ->
  next '404: ' + req.url

# unless fs.existsSync app.serializedDir
#   app.serialize store, {minify: true}, (err) ->
#     throw err if err
