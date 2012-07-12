http = require 'http'
path = require 'path'
express = require 'express'
gzippo = require 'gzippo'
MongoStore = require('connect-mongo')(express)
derby = require 'derby'
chat = require '../chat'
serverError = require './serverError'

derby.use derby.logPlugin


## SERVER CONFIGURATION ##

ONE_YEAR = 1000 * 60 * 60 * 24 * 365
root = path.dirname path.dirname __dirname
publicPath = path.join root, 'public'

## STORE SETUP ##
derby.use(require 'racer-db-mongo')
store = chat.createStore
  db: {type: 'Mongo', uri: 'mongodb://localhost/derby-chat'}

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
  # Derby session middleware creates req.session and socket.io sessions
  .use(express.cookieParser())
  .use(store.sessionMiddleware
    secret: 'spy_v_spy'
    cookie: {maxAge: ONE_YEAR}
  )

  .use( (req, res, next) ->
    req.session.userId ||= derby.uuid()
    next()
  )

  # Generates req.createModel method
  .use(store.modelMiddleware())

  # The router method creates an express middleware from the app's routes
  .use(chat.router())
  .use(expressApp.router)
  .use(serverError root)

module.exports = server = http.createServer expressApp


## SERVER ONLY ROUTES ##

expressApp.all '*', (req) ->
  throw "404: #{req.url}"

store.listen server
