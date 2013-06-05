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
    return userCondition;
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

//store.on('client', function (browserchannelSession, reject) {
//  browserchannelSession.on('req', function (req) {
//    console.log("REQ");
//    req.session;
//  });
//});

function rememberUserId (req, res, next) {
  var model = req.getModel();
  var userId = req.session.userId;
  if (! userId) return next();
  var $me = model.at('users.' + userId);
  $me.fetch( function (err) {
    model.ref('_session.user', $me.path());
    next();
  });
}

store.shareClient.use('connect', function (shareRequest, next) {
  var req = shareRequest.req;
  if (req) {
    shareRequest.agent.connectSession = req.session;
  }
  next();
});

store.onQuery = function (collectionName, callback) {
  this.shareClient.use('query', function (shareRequest, next) {
    if (collectionName !== shareRequest.collection) return next();
    var session = shareRequest.agent.connectSession;
    shareRequest.query = deepCopy(shareRequest.query);
    callback(shareRequest.query, session, next);
  });
};

// TODO Protect writes
// store.onChange = function 

store.onQuery('items', function (sourceQuery, session, next) {
  if (sourceQuery.userId !== session.userId) {
    return next(new Error('Unauthorized'));
  }
  return next();
});

// TODO Access control on an individual document based on its attributes, e.g.,
//      a user should not be able to fetch an item that does not belong to him/her.
store.shareClient.use('fetch', function (shareRequest, next) {
  if (shareRequest.collection !== 'users') return next();
  if (shareRequest.docName === shareRequest.agent.connectSession.userId) return next();
  return next(new Error('Not allowed to fetch users who are not you.'));
});

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
  //

  // Session middleware
  .use(express.cookieParser())
  .use(express.session({
    secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE'
  , store: new MongoStore({url: mongoUrl, safe: true})
  }))

  .use(everyauth.middleware({autoSetupRoutes: false}))
//  .use(everyauth.middleware())

  // Add browserchannel client-side scripts to model bundles created by store,
  // and return middleware for responding to remote client messages
  .use(racerBrowserChannel(store))

  // Add req.getModel() method
  .use(store.modelMiddleware())

  // Parse form data
  // .use(express.bodyParser())
  // .use(express.methodOverride())

  // Create an express middleware from the app's routes
  .use(rememberUserId)
  .use(app.router())
  .use(expressApp.router)
  .use(error())

// SERVER-SIDE ROUTES //

expressApp.get('/logout', function (req, res, next) {
  req.logout();
  var session = req.session;
  for (var k in session) if (session.hasOwnProperty(k) && k !== 'cookie') {
    delete session[k];
  }
  res.redirect('/');
});

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
