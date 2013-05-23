http = require 'http'
express = require 'express'
coffeeify = require 'coffeeify'
MongoStore = require('connect-mongo')(express)
derby = require 'derby'
app = require '../chat'
serverError = require './serverError'

expressApp = express();
server = http.createServer(expressApp);

module.exports = server;

# The store creates models and syncs data
store = derby.createStore
  server: server
  db: derby.db.mongo 'localhost:27017/derby-chat?auto_reconnect', {safe: true}

store
  .use(require 'racer-browserchannel')

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
  # .use(express.compress())
  .use(app.scripts(store))
  .use(express.static __dirname + '/../../public')

  # Respond to requests for application script bundles
  # racer-browserchannel adds a middleware to the store for responding to
  # requests from remote models
  .use(store.socketMiddleware())

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
