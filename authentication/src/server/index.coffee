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
  (1) Setup a hash of strategies you'll use - strategy objects and their configurations
  Note, API keys should be stored as environment variables (eg, process.env.FACEBOOK_KEY, process.env.FACEBOOK_SECRET)
  rather than a configuration file. We're storing it in conf.js for demo purposes.
###
derbyAuth = require('derby-auth')
authConf = require('./conf')
strategies =
  facebook:
      strategy: require('passport-facebook').Strategy
      conf:
          clientID: process.env.FACEBOOK_KEY || authConf.fb.appId
          clientSecret: process.env.FACEBOOK_SECRET || authConf.fb.appSecret
  linkedin:
      strategy: require('passport-linkedin').Strategy
      conf:
          consumerKey: process.env.LINKEDIN_API_KEY || authConf.linkedin.apiKey
          consumerSecret: process.env.LINKEDIN_SECRET_KEY || authoConf.linkedin.apiSecret
  github:
      strategy: require('passport-github').Strategy
      conf:
          clientID: process.env.GITHUB_CLIENT_ID || authConf.github.appId
          clientSecret: process.env.GITHUB_CLIENT_SECRET || authConf.github.appSecret
          callbackURL: "http://127.0.0.1:3000/auth/github/callback"
  twitter:
      strategy: require('passport-twitter').Strategy
      conf:
          consumerKey: process.env.TWITTER_CONSUMER_KEY || authConf.twit.consumerKey
          consumerSecret: process.env.TWITTER_CONSUMER_SECRET || authConf.twit.consumerSecret
          callbackURL: "http://127.0.0.1:3000/auth/twitter/callback"

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
  # (2) For derby-auth, We pass in {expressApp} (to setup routes), store(to setup accessControl & queries), and
  # our strategy objects and their configurations (see above)
  .use(derbyAuth.middleware(expressApp, store, strategies))

	.use(app.router())
	.use(expressApp.router)
	.use(serverError root)

# (3) Additionally, Passport needs static routes for some auth setup, so we set that up here.
derbyAuth.routes(expressApp)

expressApp.all '*', (req) ->
	throw "404: #{req.url}"
