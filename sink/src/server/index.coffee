http = require 'http'
express = require 'express'
coffeeify = require 'coffeeify'
derby = require 'derby'
app = require '../app'
serverError = require './serverError'

expressApp = express()
server = http.createServer(expressApp)

module.exports = server

# The store creates models and syncs data
store = derby.createStore
  server: server
  db: derby.db.mongo 'localhost:27017/derby-sink?auto_reconnect', {safe: true}

store
  .use(require 'racer-browserchannel')

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

  # Respond to requests for application script bundles
  # racer-browserchannel adds a middleware to the store for responding to
  # requests from remote models
  .use(store.socketMiddleware())

  # Adds req.getModel method
  .use(store.modelMiddleware())

  .use(ipMiddleware)

  # Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(serverError())

expressApp.all '*', (req, res, next) ->
  next '404: ' + req.url
