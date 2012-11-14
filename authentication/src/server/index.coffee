http = require 'http'
path = require 'path'
express = require 'express'
gzippo = require 'gzippo'
derby = require 'derby'
app = require '../auth'
serverError = require './serverError'
MongoStore = require('connect-mongo')(express)

expressApp = express()
server = http.createServer expressApp
module.exports = server

derby.use(require 'racer-db-mongo')
store = derby.createStore
	db: {type: 'Mongo', uri: 'mongodb://localhost/derby-auth'}
	listen: server

ONE_YEAR = 1000 * 60 * 60 * 24 * 365
root = path.dirname path.dirname __dirname
publicPath = path.join root, 'public'

###
  Derby Auth Setup
  TODO documentation
###
derbyAuth = require('derby-auth')
# An array of strategies you'll use - strategy objects and their configurations
strategies =
  facebook:
      strategy: require('passport-facebook').Strategy,
      conf: {clientID: process.env.FACEBOOK_KEY, clientSecret: process.env.FACEBOOK_SECRET, callbackURL: "http://localhost:3000/auth/facebook/callback"}
  linkedin:
      strategy: require('passport-linkedin').Strategy,
      conf: {consumerKey: process.env.LINKEDIN_API_KEY, consumerSecret: process.env.LINKEDIN_SECRET_KEY, callbackURL: "http://127.0.0.1:3000/auth/linkedin/callback"}
#  github:
#      strategy: require('passport-github').Strategy,
#      conf: {clientID: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET}
#  twitter:
#      strategy: require('passport-twitter').Strategy,
#      conf: {consumerKey: process.env.TWITTER_CONSUMER_KEY, consumerSecret: process.env.TWITTER_CONSUMER_SECRET}

expressApp
	.use(express.favicon())
	.use(gzippo.staticGzip publicPath, maxAge: ONE_YEAR)
	.use(express.compress())
  .use(express.bodyParser())
  .use(express.methodOverride())
  .use(express.cookieParser())
  .use(store.sessionMiddleware
      secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE'
      cookie: {maxAge: ONE_YEAR}
      store: new MongoStore(url: 'mongodb://localhost/derby-auth')
    )
	.use(store.modelMiddleware())

	# Middelware can be inserted after the modelMiddleware and before
  # the app router to pass server accessible data to a model
  .use(derbyAuth.middleware(expressApp, store, strategies))

	.use(app.router())
	.use(expressApp.router)
	.use(serverError root)

# Passport needs static routes, so we set them up here.
derbyAuth.routes(expressApp)

expressApp.all '*', (req) ->
	throw "404: #{req.url}"
