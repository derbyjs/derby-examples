http = require 'http'
path = require 'path'
express = require 'express'
gzippo = require 'gzippo'
derby = require 'derby'
app = require '../app'
serverError = require './serverError'
everyauth = require "everyauth"

everyauth.debug = yes
## Everyauth Itegration ##
everyauth.facebook.appId("<app Id>").appSecret("<app secret>")
.handleAuthCallbackError((req, res) ->
).findOrCreateUser((session, accessToken, accessTokExtra, fbUserMetadata) ->
  promise = @.Promise().fulfill fbUserMetadata
).redirectPath("/")

everyauth.everymodule.findUserById (req, userId, callback)->
  if req.session.auth and req.session.auth.facebook 
    user = req.session.auth.facebook.user
  callback null, user


### Everyauth-Derby glue ###
everyauthDerbyMiddleware = (req, res, next)->
  if req.user?
    console.log req.user
    model = req.getModel()
    model.set "_fb", req.user
    next()
  else
    next()




## SERVER CONFIGURATION ##

expressApp = express()
server = http.createServer expressApp
store = derby.createStore listen: server


module.exports = server

ONE_YEAR = 1000 * 60 * 60 * 24 * 365
root = path.dirname path.dirname __dirname
publicPath = path.join root, 'public'

expressApp
  .use(express.favicon())
  # Gzip static files and serve from memory
  .use(gzippo.staticGzip publicPath, maxAge: 0)
  # Gzip dynamically rendered content
  .use(express.compress())

  # Uncomment to add form data parsing support
  .use(express.bodyParser())
  .use(express.methodOverride())

  # Uncomment and supply secret to add Derby session handling
  # Derby session middleware creates req.session and socket.io sessions
  .use(express.cookieParser())
  .use(express.session({secret: "secret"}))
  # .use(store.sessionMiddleware
  #   secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE'
  #   cookie: {maxAge: ONE_YEAR}
  # )

  # Adds req.getModel method
  .use(store.modelMiddleware())
  # Middelware can be inserted after the modelMiddleware and before
  # the app router to pass server accessible data to a model
  # Creates an express middleware from the app's routes
  .use(everyauth.middleware())
  .use(everyauthDerbyMiddleware)
  .use(app.router())
  .use(expressApp.router)
  .use(serverError root)



## SERVER ONLY ROUTES ##

expressApp.all '*', (req) ->
  throw "404: #{req.url}"