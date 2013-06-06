var _require = require;
var mongoskin = _require('mongoskin');

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
};

var cursorOperators = {
  $limit: 'limit'
, $skip: 'skip'
};

// mongo is a mongoskin client. Create with:
// mongo.db('localhost:27017/tx?auto_reconnect', safe:true)
exports = module.exports = function() {
  var mongo = mongoskin.db.apply(mongoskin.db, arguments);
  return new LiveDbMongo(mongo);
};

exports.LiveDbMongo = LiveDbMongo;

function LiveDbMongo(mongo) {
  this.mongo = mongo;
  this.closed = false;
}

LiveDbMongo.prototype.name = 'mongo';

LiveDbMongo.prototype.close = function(callback) {
  if (this.closed) return callback('db already closed');
  this.mongo.close(callback);
  this.closed = true;
};

LiveDbMongo.prototype.getSnapshot = function(cName, docName, callback) {
  if (this.closed) return callback('db already closed');
  this.mongo.collection(cName).findOne({_id: docName}, function(err, doc) {
    callback(err, castToSnapshot(doc));
  });
};

LiveDbMongo.prototype.setSnapshot = function(cName, docName, data, callback) {
  if (this.closed) return callback('db already closed');
  var doc = castToDoc(docName, data);
  this.mongo.collection(cName).update({_id: docName}, doc, {upsert: true}, callback);
};

LiveDbMongo.prototype.query = function(livedb, cName, inputQuery, callback) {
  if (this.closed) return callback('db already closed');

  var query = normalizeQuery(inputQuery);
  var cursorMethods = extractCursorMethods(query);

  this.mongo.collection(cName).find(query, function(err, cursor) {
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
};

LiveDbMongo.prototype.queryDoc = function(livedb, index, cName, docName, inputQuery, callback) {
  if (this.closed) return callback('db already closed');
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
LiveDbMongo.prototype.queryNeedsPollMode = function(query) {
  return query.hasOwnProperty('$orderby') ||
    query.hasOwnProperty('$limit') ||
    query.hasOwnProperty('$skip');
};

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
  doc._id = docName;
  return doc;
}

function castToSnapshot(doc) {
  if (!doc) return;
  var type = doc._type;
  var v = doc._v;
  var docName = doc._id;
  var data = doc._data;
  if (data === void 0) {
    doc = shallowClone(doc);
    delete doc._type;
    delete doc._v;
    delete doc._id;
    return {
      data: doc
    , type: type
    , v: v
    , docName: docName
    };
  }
  return {
    data: data
  , type: type
  , v: v
  , docName: docName
  };
}

function shallowClone(object) {
  var out = {};
  for (var key in object) {
    out[key] = object[key];
  }
  return out;
}
