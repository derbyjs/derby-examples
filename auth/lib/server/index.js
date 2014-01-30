var express = require('express');
var derby = require('derby');
var racerBrowserChannel = require('racer-browserchannel');
var LiveDbMongo = require('livedb-mongo').LiveDbMongo;
var MongoStore = require('connect-mongo')(express);
var app = require('../app');
var error = require('./error');
var mongoskin = require('mongoskin');
var uuid = require('uuid');
var merge = require('racer-util/object').merge;
var deepCopy = require('racer-util/object').deepCopy;

/**
 * Setup everyauth, so we can log in via Twitter, Facebook, LinkedIn, and
 * Github.
 */

var everyauth = require('everyauth');
var conf = require('./conf.json');

everyauth.everymodule
  .findUserById( function (req, userId, callback) {
    model = store.createModel(null, req)
    $user = model.at('users.' + userId);
    $user.fetch( function (err) {
      if (err) return callback(err);
      callback(null, $user.get());
    });
  });

everyauth.twitter
  .consumerKey(conf.twitter.consumerKey)
  .consumerSecret(conf.twitter.consumerSecret)
  .findOrCreateUser( function (session, accessToken, accessTokenSecret, twitterUser, params) {
    var userPromise = this.Promise();
    var addToTwitterUser = {
      accessToken: accessToken
    , accessTokenSecret: accessTokenSecret
    };
    var twitterUserKey = 'twitter';
    var userCondition = {'twitter.id': twitterUser.id}
    findOrCreateUser(userPromise, store, params.req, session, twitterUser, addToTwitterUser, twitterUserKey, userCondition);
    return userPromise;
  });

everyauth.facebook
  .appId(conf.facebook.appId)
  .appSecret(conf.facebook.appSecret)
  .findOrCreateUser( function (session, accessToken, accessTokenExtra, fbUserMetadata, params) {
    var userPromise = this.Promise();
    var addToFbUserMetadata = {
      accessToken: accessToken
    , accessTokenExtra: accessTokenExtra
    };
    var facebookUserKey = 'facebook';
    var userCondition = {'facebook.id': fbUserMetadata.id};
    findOrCreateUser(userPromise, store, params.req, session, fbUserMetadata, addToFbUserMetadata, facebookUserKey, userCondition);
    return userPromise;
  });

everyauth.linkedin
  .consumerKey(conf.linkedin.apiKey)
  .consumerSecret(conf.linkedin.apiSecret)
  .findOrCreateUser( function (session, accessToken, accessTokenSecret, linkedinUser, params) {
    var userPromise = this.Promise();
    var addToLinkedinUser = {
      accessToken: accessToken
    , accessTokenSecret: accessTokenSecret
    };
    var linkedinUserKey = 'linkedin';
    var userCondition = {'linkedin.id': linkedinUser.id}
    findOrCreateUser(userPromise, store, params.req, session, linkedinUser, addToLinkedinUser, linkedinUserKey, userCondition);
    return userPromise;
  });

everyauth.github
  .appId(conf.github.appId)
  .appSecret(conf.github.appSecret)
  .findOrCreateUser( function (session, accessToken, accessTokenExtra, ghUser, params) {
    var userPromise = this.Promise();
    var addToGhUser = {
      accessToken: accessToken
    , accessTokenExtra: accessTokenExtra
    };
    var ghUserKey = 'github';
    var userCondition = {'github.id': ghUser.id};
    findOrCreateUser(userPromise, store, params.req, session, ghUser, addToGhUser, ghUserKey, userCondition);
    return userPromise;
  });


// Set up our express app

var expressApp = module.exports = express();

// Get Redis configuration
if (process.env.REDIS_HOST) {
  var redis = require('redis').createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
  redis.auth(process.env.REDIS_PASSWORD);
} else if (process.env.REDISCLOUD_URL) {
  var redisUrl = require('url').parse(process.env.REDISCLOUD_URL);
  var redis = require('redis').createClient(redisUrl.port, redisUrl.hostname);
  redis.auth(redisUrl.auth.split(":")[1]);
} else {
  var redis = require('redis').createClient();
}
redis.select(process.env.REDIS_DB || 7);
// Get Mongo configuration
var mongoUrl = process.env.MONGO_URL || process.env.MONGOHQ_URL ||
  'mongodb://localhost:27017/auth';
var mongo = mongoskin.db(mongoUrl + '?auto_reconnect', {safe: true});

// The store creates models and syncs data
var store = derby.createStore({
  db: new LiveDbMongo(mongo)
, redis: redis
});

/**
 * Express middleware for exposing the user to the model (accessible by the
 * server and browser only to the user, via model.get('_session.user').
 */
function rememberUser (req, res, next) {
  var model = req.getModel();
  var userId = req.session.userId;
  if (! userId) return next();
  var $me = model.at('users.' + userId);
  $me.fetch( function (err) {
    model.ref('_session.user', $me.path());
    next();
  });
}

/**
 * Assign the connect session to ShareJS's useragent (there is 1 useragent per
 * browser tab or window that is connected to our server via browserchannel).
 * We'll probably soon move this into racer core, so developers won't need to
 * remember to have this code here.
 */
store.shareClient.use('connect', function (shareRequest, next) {
  var req = shareRequest.req;
  if (req) {
    shareRequest.agent.connectSession = req.session;
  }
  next();
});

/**
 * A convenience method for declaring access control on queries. For usage, see
 * the example code below (`store.onQuery('items', ...`)). This may be moved
 * into racer core. We'll want to experiment to see if this particular
 * interface is sufficient, before committing this convenience method to core.
 */
store.onQuery = function (collectionName, callback) {
  this.shareClient.use('query', function (shareRequest, next) {
    if (collectionName !== shareRequest.collection) return next();
    var session = shareRequest.agent.connectSession;
    shareRequest.query = deepCopy(shareRequest.query);
    callback(shareRequest.query, session, next);
  });
};

// Items can only be seen by their owners
store.onQuery('items', function (sourceQuery, session, next) {
  if (sourceQuery.userId !== session.userId) {
    return next(new Error('Unauthorized'));
  }
  return next();
});

// TODO Access control on an individual document based on its attributes, e.g.,
//      a user should not be able to fetch an item that does not belong to him/her.

/**
 * Delegate to ShareJS directly to protect fetches and subscribes. Will try to
 * come up with a different interface that does not expose this much of ShareJS
 * to the developer using racer.
 */

store.shareClient.use('subscribe', protectRead);
store.shareClient.use('fetch', protectRead);

function protectRead (shareRequest, next) {
  if (shareRequest.collection !== 'users') return next();
  if (shareRequest.docName === shareRequest.agent.connectSession.userId) return next();
  return next(new Error('Not allowed to fetch users who are not you.'));
}

/**
 * A convenience method for declaring access control on writes. For usage, see
 * the example code below (`store.onChange('users', ...`)). This may be moved
 * into racer core. We'll want to experiment to see if this particular
 * interface is sufficient, before committing this convenience method to core.
 */
store.onChange = function (collectionName, callback) {
  this.shareClient.use('validate', function (shareRequest, next) {
    var collection = shareRequest.collection;
    if (collection !== collectionName) return next();
    var agent = shareRequest.agent;
    var action = shareRequest.action
    var docName = shareRequest.docName;
    var backend = shareRequest.backend;
    // opData represents the ShareJS operation
    var opData = shareRequest.opData;
    // snapshot is the snapshot of the data after the opData has been applied
    var snapshot = shareRequest.snapshot;

    var snapshotData = (opData.del) ?
      opData.prev.data :
      snapshot.data;

    var isServer = shareRequest.agent.stream.isServer;
    callback(docName, opData, snapshotData, agent.connectSession, isServer, next);
  });
};

/**
 * Only allow items to be created, modified, and deleted by the owner of the item.
 *
 * @param {String} docId is the document id that is being changed
 * @param {Object} opData
 * @param {Object} snapshotData
 * @param {String} session
 * @param {Boolean} isServer is true if and only if the mutation originated on the server;
 * @param {Function} next(error)
 *
 */
store.onChange('items', function (docId, opData, snapshotData, session, isServer, next) {
  if (opData.del) {
    var deletedItem = snapshotData;
    if (deletedItem.userId === session.userId) {
      next();
    } else {
      next(new Error('Not allowed to delete items that are not yours.'));
    }
  } else if (opData.create) {
    var createdItem = snapshotData;
    if (createdItem.userId === session.userId) {
      next();
    } else {
      next(new Error('Not allowed to create items that do not belong to you.'));
    }
  } else {
    var itemAfterUpdate = snapshotData;
    if (itemAfterUpdate.userId === session.userId) {
      next();
    } else {
      next(new Error('Not allowed to update items that do not belong to you.'));
    }
  }
});

/**
 * Only allow users to modify or delete themselves. Only allow the server to
 * create users.
 */
store.onChange('users', function (docId, opData, snapshotData, session, isServer, next) {
  if (docId === (session && session.userId)) {
    next();
  } else if (opData.del) {
    next(new Error('Not allowed to deleted users who are not you.'));
  } else if (opData.create) {
    if (isServer) {
      next();
    } else {
      next(new Error('Not allowed to create users.'));
    }
  } else {
    next(new Error('Not allowed to update users who are not you.'));
  }
});

expressApp
  .use(express.favicon())
  // Gzip dynamically
  .use(express.compress())
  // Respond to requests for application script bundles
  .use(app.scripts(store))
  // Serve static files from the public directory
  .use(express.static(__dirname + '/../../public'))

  // Session middleware
  .use(express.cookieParser())
  .use(express.session({
    secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE'
  , store: new MongoStore({url: mongoUrl, safe: true})
  }))

  // everyauth middleware
  .use(everyauth.middleware({autoSetupRoutes: false}))

  // Add browserchannel client-side scripts to model bundles created by store,
  // and return middleware for responding to remote client messages
  .use(racerBrowserChannel(store))

  // Add req.getModel() method
  .use(store.modelMiddleware())

  // Parse form data
  // .use(express.bodyParser())
  // .use(express.methodOverride())

  // Make sure to assign the user to model's _session.user, so we can access
  // the user in our app. You can also assign other things to the model's session
  // via middleware like this.
  .use(rememberUser)

  // Create an express middleware from the app's routes
  .use(app.router())
//  .use(expressApp.router)
  .use(error())

// SERVER-SIDE ROUTES //

// Logs out users by clearing the session
expressApp.get('/logout', function (req, res, next) {
  var session = req.session;
  for (var k in session) if (session.hasOwnProperty(k) && k !== 'cookie') {
    delete session[k];
  }
  res.redirect('/');
});

// Defines route handling required for OAuth with Twitter, Faceook, LinkedIn,
// and Github. everyauth does the heavy lifting.

expressApp.get('/auth/twitter', everyauth.twitter.middleware('entryPath'));
expressApp.get('/auth/twitter/callback', everyauth.twitter.redirectPath('/').middleware('callbackPath'));

expressApp.get('/auth/facebook', everyauth.facebook.middleware('entryPath'));
expressApp.get('/auth/facebook/callback', everyauth.facebook.redirectPath('/').middleware('callbackPath'));

expressApp.get('/auth/linkedin', everyauth.linkedin.middleware('entryPath'));
expressApp.get('/auth/linkedin/callback', everyauth.linkedin.redirectPath('/').middleware('callbackPath'));

expressApp.get('/auth/github', everyauth.github.middleware('entryPath'));
expressApp.get('/auth/github/callback', everyauth.github.redirectPath('/').middleware('callbackPath'));

expressApp.all('*', function(req, res, next) {
  next('404: ' + req.url);
});

/**
 * Helper method used in our everyauth configuration
 * @param {Promise} userPromise
 * @param {Store} store
 * @param {Http.Request} req
 * @param {Session} session
 * @param {Object} subUser is the user deployed from
 */
function findOrCreateUser (userPromise, store, req, session, subUser, addToSubUser, subUserKey, condition) {
  var model = store.createModel(null, req);
  var userQuery = model.query('users', {$query: {$or: [condition, {_id: session.userId}]}});
  model.fetch(userQuery, function (err) {
    if (err) return userPromise.fail(err);
    var user = userQuery.get()[0];
    if (user) {
      if (! session.userId) {
        session.userId = user.id;
      }
      model.set('users.' + user.id + '.' + subUserKey, merge(subUser, addToSubUser), function (err) {
        if (err) return userPromise.fail(err);
        user = model.get('users.' + user.id);
        session.save(function (err) {
          if (err) return userPromise.fail(err);
          userPromise.fulfill(user);
        });
      });
    } else {
      var userToAdd = {};
      userToAdd[subUserKey] = merge(subUser, addToSubUser);
      var userId = model.add('users', userToAdd, function (err) {
        if (err) return userPromise.fail(err);
        var user = model.get('users.' + userId);
        session.userId = user.id;
        userPromise.fulfill(user);
      });
    }
  });
}

