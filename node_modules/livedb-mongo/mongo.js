var _require = require;
var mongoskin = _require('mongoskin');
var assert = require('assert');
var async = require('async');

var metaOperators = {
  $comment: true
, $explain: true
, $hint: true
, $maxScan: true
, $max: true
, $min: true
, $orderby: true
, $returnKey: true
, $showDiskLoc: true
, $snapshot: true
, $count: true
};

var cursorOperators = {
  $limit: 'limit'
, $skip: 'skip'
};

/* There are two ways to instantiate a livedb-mongo wrapper.
 *
 * 1. The simplest way is to just invoke the module and pass in your mongoskin
 * arguments as arguments to the module function. For example:
 *
 * var db = require('livedb-mongo')('localhost:27017/test?auto_reconnect', {safe:true});
 *
 * 2. If you already have a mongoskin instance that you want to use, you can
 * just pass it into livedb-mongo:
 *
 * var skin = require('mongoskin')('localhost:27017/test?auto_reconnect', {safe:true});
 * var db = require('livedb-mongo')(skin);
 */
exports = module.exports = function(mongo, options) {
  if (typeof mongo !== 'object') {
    mongo = mongoskin.db.apply(mongoskin.db, arguments);
  }
  return new LiveDbMongo(mongo, options);
};

// Deprecated. Don't use directly.
exports.LiveDbMongo = LiveDbMongo;

// mongo is a mongoskin client. Create with:
// mongo.db('localhost:27017/tx?auto_reconnect', safe:true)
function LiveDbMongo(mongo, options) {
  this.mongo = mongo;
  this.closed = false;

  if (options && options.mongoPoll) {
    this.mongoPoll = options.mongoPoll;
  }

  // The getVersion() and getOps() methods depend on a collectionname_ops
  // collection, and that collection should have an index on the operations
  // stored there. I could ask people to make these indexes themselves, but
  // even I forgot on some of my collections, so the mongo driver will just do
  // it manually. This approach will leak memory relative to the number of
  // collections you have, but if you've got thousands of mongo collections
  // you're probably doing something wrong.

  // map from collection name -> true for op collections we've ensureIndex'ed
  this.opIndexes = {};
}

LiveDbMongo.prototype.close = function(callback) {
  if (this.closed) return callback('db already closed');
  this.mongo.close(callback);
  this.closed = true;
};


// **** Snapshot methods

LiveDbMongo.prototype.getSnapshot = function(cName, docName, callback) {
  if (this.closed) return callback('db already closed');
  if (/_ops$/.test(cName)) return callback('Invalid collection name');
  this.mongo.collection(cName).findOne({_id: docName}, function(err, doc) {
    callback(err, castToSnapshot(doc));
  });
};

LiveDbMongo.prototype.bulkGetSnapshot = function(requests, callback) {
  if (this.closed) return callback('db already closed');

  var mongo = this.mongo;
  var results = {};

  var getSnapshots = function(cName, callback) {
    if (/_ops$/.test(cName)) return callback('Invalid collection name');

    var cResult = results[cName] = {};

    var docNames = requests[cName];
    mongo.collection(cName).find({_id:{$in:docNames}}).toArray(function(err, data) {
      if (err) return callback(err);
      data = data && data.map(castToSnapshot);

      for (var i = 0; i < data.length; i++) {
        cResult[data[i].docName] = data[i];
      }
      callback();
    });
  };

  async.each(Object.keys(requests), getSnapshots, function(err) {
    callback(err, err ? null : results);
  });
};

LiveDbMongo.prototype.writeSnapshot = function(cName, docName, data, callback) {
  if (this.closed) return callback('db already closed');
  if (/_ops$/.test(cName)) return callback('Invalid collection name');
  var doc = castToDoc(docName, data);
  this.mongo.collection(cName).update({_id: docName}, doc, {upsert: true}, callback);
};


// ******* Oplog methods

// Overwrite me if you want to change this behaviour.
LiveDbMongo.prototype.getOplogCollectionName = function(cName) {
  // Using an underscore to make it easier to see whats going in on the shell
  return cName + '_ops';
};

// Get and return the op collection from mongo, ensuring it has the op index.
LiveDbMongo.prototype._opCollection = function(cName) {
  var collection = this.mongo.collection(this.getOplogCollectionName(cName));

  if (!this.opIndexes[cName]) {
    collection.ensureIndex({name: 1, v: 1}, true, function(error, name) {
      if (error) console.warn('Warning: Could not create index for op collection:', error.stack || error);
    });

    this.opIndexes[cName] = true;
  }

  return collection;
};

LiveDbMongo.prototype.writeOp = function(cName, docName, opData, callback) {
  assert(opData.v != null);

  if (this.closed) return callback('db already closed');
  if (/_ops$/.test(cName)) return callback('Invalid collection name');
  var self = this;

  var data = shallowClone(opData);
  data._id = docName + ' v' + opData.v,
  data.name = docName;

  this._opCollection(cName).save(data, callback);
};

LiveDbMongo.prototype.getVersion = function(cName, docName, callback) {
  if (this.closed) return callback('db already closed');
  if (/_ops$/.test(cName)) return callback('Invalid collection name');

  this._opCollection(cName).findOne({name:docName}, {sort:{v:-1}}, function(err, data) {
    if (err) return callback(err);

    if (data == null) {
      callback(null, 0);
    } else {
      callback(err, data.v + 1);
    }
  });
};

LiveDbMongo.prototype.getOps = function(cName, docName, start, end, callback) {
  if (this.closed) return callback('db already closed');
  if (/_ops$/.test(cName)) return callback('Invalid collection name');

  var query = end == null ? {$gte:start} : {$gte:start, $lt:end};
  this._opCollection(cName).find({name:docName, v:query}, {sort:{v:1}}).toArray(function(err, data) {
    if (err) return callback(err);

    for (var i = 0; i < data.length; i++) {
      // Strip out _id in the results
      delete data[i]._id;
      delete data[i].name;
    }
    callback(null, data);
  });

};


// ***** Query methods

// Internal method to actually run the query.
LiveDbMongo.prototype._query = function(mongo, cName, query, callback) {
  // For count queries, don't run the find() at all.
  if (query.$count) {
    delete query.$count;
    mongo.collection(cName).count(query.$query || {}, function(err, count) {
      if (err) return callback(err);

      // This API is kind of awful. FIXME in livedb.
      callback(err, {results:[], extra:count});
    });
  } else {
    var cursorMethods = extractCursorMethods(query);

    mongo.collection(cName).find(query, function(err, cursor) {
      if (err) return callback(err);

      for (var i = 0; i < cursorMethods.length; i++) {
        var item = cursorMethods[i];
        var method = item[0];
        var arg = item[1];
        cursor[method](arg);
      }

      cursor.toArray(function(err, results) {
        results = results && results.map(castToSnapshot);
        callback(err, results);
      });
    });
  }

};

LiveDbMongo.prototype.query = function(livedb, cName, inputQuery, opts, callback) {
  if (this.closed) return callback('db already closed');
  if (/_ops$/.test(cName)) return callback('Invalid collection name');

  // To support livedb <=0.2.8
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  var query = normalizeQuery(inputQuery);

  // Use this.mongoPoll if its a polling query.
  if (opts.mode === 'poll' && this.mongoPoll) {
    var self = this;
    // This timeout is a dodgy hack to work around race conditions replicating the
    // data out to the polling target replica.
    setTimeout(function() {
      self._query(self.mongoPoll, cName, query, callback);
    }, 300);
  } else {
    this._query(this.mongo, cName, query, callback);
  }
};

LiveDbMongo.prototype.queryDoc = function(livedb, index, cName, docName, inputQuery, callback) {
  if (this.closed) return callback('db already closed');
  if (/_ops$/.test(cName)) return callback('Invalid collection name');
  var query = normalizeQuery(inputQuery);

  // Run the query against a particular mongo document by adding an _id filter
  var queryId = query.$query._id;
  if (queryId) {
    delete query.$query._id;
    query.$query.$and = [{_id: docName}, {_id: queryId}];
  } else {
    query.$query._id = docName;
  }

  this.mongo.collection(cName).findOne(query, function(err, doc) {
    callback(err, castToSnapshot(doc));
  });
};

// Test whether an operation will make the document its applied to match the
// specified query. This function doesn't really have enough information to know
// in all cases, but if we can determine whether a query matches based on just
// the operation, it saves doing extra DB calls.
//
// currentStatus is true or false depending on whether the query currently
// matches. return true or false if it knows, or null if the function doesn't
// have enough information to tell.
LiveDbMongo.prototype.willOpMakeDocMatchQuery = function(currentStatus, query, op) {
  return null;
};

// Does the query need to be rerun against the database with every edit?
LiveDbMongo.prototype.queryNeedsPollMode = function(index, query) {
  return query.hasOwnProperty('$orderby') ||
    query.hasOwnProperty('$limit') ||
    query.hasOwnProperty('$skip') ||
    query.hasOwnProperty('$count');
};


// Utility methods

function extractCursorMethods(query) {
  var out = [];
  for (var key in query) {
    if (cursorOperators[key]) {
      out.push([cursorOperators[key], query[key]]);
      delete query[key];
    }
  }
  return out;
}

function normalizeQuery(inputQuery) {
  // Box queries inside of a $query and clone so that we know where to look
  // for selctors and can modify them without affecting the original object
  var query;
  if (inputQuery.$query) {
    query = shallowClone(inputQuery);
    query.$query = shallowClone(query.$query);
  } else {
    query = {$query: {}};
    for (var key in inputQuery) {
      if (metaOperators[key] || cursorOperators[key]) {
        query[key] = inputQuery[key];
      } else {
        query.$query[key] = inputQuery[key];
      }
    }
  }

  // Deleted documents are kept around so that we can start their version from
  // the last version if they get recreated. When they are deleted, their type
  // is set to null, so don't return any documents with a null type.
  if (!query.$query._type) query.$query._type = {$ne: null};

  return query;
}

function castToDoc(docName, data) {
  var doc = (
    typeof data.data === 'object' &&
    data.data !== null &&
    !Array.isArray(data.data)
  ) ?
    shallowClone(data.data) :
    {_data: (data.data === void 0) ? null : data.data};
  doc._type = data.type || null;
  doc._v = data.v;
  doc._m = data.m;
  doc._id = docName;
  return doc;
}

function castToSnapshot(doc) {
  if (!doc) return;
  var type = doc._type;
  var v = doc._v;
  var docName = doc._id;
  var data = doc._data;
  var meta = doc._m;
  if (data === void 0) {
    doc = shallowClone(doc);
    delete doc._type;
    delete doc._v;
    delete doc._id;
    delete doc._m;
    return {
      data: doc
    , type: type
    , v: v
    , docName: docName
    , m: meta
    };
  }
  return {
    data: data
  , type: type
  , v: v
  , docName: docName
  , m: meta
  };
}

function shallowClone(object) {
  var out = {};
  for (var key in object) {
    out[key] = object[key];
  }
  return out;
}
