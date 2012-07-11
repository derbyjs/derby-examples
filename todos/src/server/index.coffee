http = require 'http'
path = require 'path'
express = require 'express'
gzippo = require 'gzippo'
derby = require 'derby'
todos = require '../todos'
serverError = require './serverError'


## SERVER CONFIGURATION ##

ONE_YEAR = 1000 * 60 * 60 * 24 * 365
root = path.dirname path.dirname __dirname
publicPath = path.join root, 'public'

## STORE SETUP ##
derby.use(require 'racer-db-mongo')
store = todos.createStore
  db: {type: 'Mongo', uri: 'mongodb://localhost/derby-todos'}

require('./queries')(store)

(expressApp = express())
  .use(express.favicon())
  # Gzip static files and serve from memory
  .use(gzippo.staticGzip publicPath, maxAge: ONE_YEAR)

  # Gzip dynamically rendered content
  .use(express.compress())

  # Uncomment to add form data parsing support
  # .use(express.bodyParser())
  # .use(express.methodOverride())

  # Uncomment and supply secret to add Derby session handling
  # Derby session middleware creates req.model and subscribes to _session
  # .use(express.cookieParser())
  # .use(store.sessionMiddleware
  #   secret: 'YOUR SECRET HERE'
  #   cookie: {maxAge: ONE_YEAR}
  # )

  # Generates req.createModel method
  .use(store.modelMiddleware())

  # The router method creates an express middleware from the app's routes
  .use(todos.router())
  .use(expressApp.router)
  .use(serverError root)

exports = module.exports = server = http.createServer expressApp


## SERVER ONLY ROUTES ##

expressApp.all '*', (req) ->
  throw "404: #{req.url}"

store.listen server
