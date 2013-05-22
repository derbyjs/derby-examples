http = require 'http'
express = require 'express'
coffeeify = require 'coffeeify'
derby = require 'derby'
app = require '../todos'
serverError = require './serverError'

expressApp = express();
server = http.createServer(expressApp);

module.exports = server;

# The store creates models and syncs data
store = derby.createStore
  server: server
  db: derby.db.mongo 'localhost:27017/derby-todos?auto_reconnect', {safe: true}

store
  .use(require 'racer-browserchannel')

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

  # Respond to requests for application script bundles
  # racer-browserchannel adds a middleware to the store for responding to
  # requests from remote models
  .use(store.socketMiddleware())

  # Adds req.getModel method
  .use(store.modelMiddleware())

  # Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(serverError())

expressApp.all '*', (req, res, next) ->
  next '404: ' + req.url
