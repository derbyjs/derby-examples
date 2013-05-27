'use strict';



/*
 * MongoDB server and collection stats.
 */

function MongoDBMonitor(agent) {
  this.agent = agent;

  this.serversCount = 0;
  this.servers = {};

  this.collsCount = 0;
  this.colls = {};
  this.collNameRegex = /[^\.\$]+\.([^\.\$]+)/;  
}
exports.MongoDBMonitor = MongoDBMonitor;



MongoDBMonitor.prototype.init = function(mongodb) {
  var self = this;

  self.mongodb = mongodb;  


  self.agent.timers.setInterval(function() {
    for(address in self.servers) {
      try {
        self.loadServerStatus(self.servers[address]);
      }
      catch(err) {
        self.agent.logger.error(err);
      }
    }

    for(var address in self.colls) {
      try {
        self.loadCollStats(self.colls[address]);
      }
      catch(err) {
        self.agent.logger.error(err);
      }
    }
  }, 60000);  
};


MongoDBMonitor.prototype.monitorServer = function(host, port, dbName, auth) {
  var self = this;

  var address = host + ':' + port;
  var server = self.servers[address];

  if(server || ++self.serversCount > 25) return;

  self.servers[address] = {
    host: host, 
    port: port, 
    dbName: dbName,
    auth: auth,
    lastValues: {}
  };
}


MongoDBMonitor.prototype.monitorCollection = function(host, port, dbName, collName, auth) {
  var self = this;

  if(!self.agent.features.mongodbMetrics) return;

  // start querying for server status
  if(auth && auth.authdb === 'admin') {
    self.monitorServer(host, port, dbName, auth);
  }

  var m = self.collNameRegex.exec(collName);
  if(!m || !m[1]) return;
  collName = m[1];

  var address = host + ':' + port + ':' + dbName + ':' + collName;
  var coll = self.colls[address];

  // add auth to existing collection
  if(coll && auth) {
    coll.auth = auth;
  }

  if(coll || ++self.collsCount > 50) return;

  self.colls[address] = {
    host: host, 
    port: port, 
    dbName: dbName,
    collName: collName,
    auth: auth,
    lastValues: {}
  };
}


function getValue(stats, key) {
  var props = key.split('.');

  for(var i = 0; i < props.length; i++) {
    stats = stats[props[i]];
    if(!stats) return;
  }

  return parseFloat(stats);
}


MongoDBMonitor.prototype.metric = function(client, stats, scope, name, key, unit, isRelative, scale) {
  var self = this;
  
  var numVal = getValue(stats, key);
  if(typeof(numVal) !== 'number') return; 

  if(scale) {
    numVal = numVal * scale;
  }

  if(isRelative) {
    if(client.lastValues[key]) {
      self.agent.metric(
        scope, 
        name, 
        numVal - client.lastValues[key], 
        unit, 
        'set');
    }

    client.lastValues[key] = numVal;
  }
  else {
    self.agent.metric(
      scope, 
      name, 
      numVal, 
      unit,
      'set');
  }
};


MongoDBMonitor.prototype.done = function(db, err) {
  var self = this;

  try {
    if(db) db.close()
  }
  catch(err2) {
    self.agent.logger.error(err2);
  }

  if(err) {
    self.agent.logger.error(err);  
  }   
};


MongoDBMonitor.prototype.loadServerStatus = function(server) {
  var self = this;

  var db = new self.mongodb.Db(
    server.dbName,
    new self.mongodb.Server(server.host, server.port, {'auto_reconnect': false, 'poolSize': 1}), 
    {safe: false});

  db.open(function(err) {
    if(err) return self.done(db, err);

    try {
      db.admin(function(err, adminDb) {
        if(err) return self.done(db, err);
        if(!adminDb) return;

        try {
          adminDb.authenticate(server.auth.username, server.auth.password, function(err, result) {
            if(err) return self.done(db, err);
            if(!result) return self.done(db, 'mongodb server auth failed');

            try {
              adminDb.serverStatus(function(err, serverStatus) {
                if(err) return self.done(db, err);
                if(!serverStatus) return self.done(db, 'mongodb serverStatus empty');

                try {
                  self.extractServerMetrics(server, serverStatus);

                  self.done(db);
                }
                catch(err) {
                  self.done(db, err);
                }
              });
            }
            catch(err) {
              self.done(db, err);
            }
          });
        }
        catch(err) {
          self.done(db, err);
        }
      });
    }
    catch(err) {
      self.done(db, err);
    }
  });
};



MongoDBMonitor.prototype.extractServerMetrics = function(server, serverStatus) {
  var self = this;

  var scope = 
    'MongoDB Server/' +
    server.host + ':' + server.port;

  self.metric(server, serverStatus, scope, 'Global lock/Total time', 'globalLock.totalTime', 'ms/minute', true, 1/1024);
  self.metric(server, serverStatus, scope, 'Global lock/Lock time', 'globalLock.lockTime', 'ms/minute', true, 1/1024);
  self.metric(server, serverStatus, scope, 'Global lock/Current queue/Total', 'globalLock.currentQueue.total', null, false);
  self.metric(server, serverStatus, scope, 'Global lock/Current queue/Readers', 'globalLock.currentQueue.readers', null, false);
  self.metric(server, serverStatus, scope, 'Global lock/Current queue/Writers', 'globalLock.currentQueue.writers', null, false);
  self.metric(server, serverStatus, scope, 'Global lock/Active clients/Total', 'globalLock.activeClients.total', null, false);
  self.metric(server, serverStatus, scope, 'Global lock/Active clients/Readers', 'globalLock.activeClients.readers', null, false);
  self.metric(server, serverStatus, scope, 'Global lock/Active clients/Writers', 'globalLock.activeClients.writers', null, false);
  self.metric(server, serverStatus, scope, 'Memory/Resident', 'mem.resident', 'MB', false);
  self.metric(server, serverStatus, scope, 'Memory/Virtual', 'mem.virtual', 'MB', false);
  self.metric(server, serverStatus, scope, 'Memory/Mapped', 'mem.mapped', 'MB', false);
  self.metric(server, serverStatus, scope, 'Memory/Mapped with journal', 'mem.mappedWithJournal', 'MB', false);
  self.metric(server, serverStatus, scope, 'Connections/Current', 'connections.current', null, false);
  self.metric(server, serverStatus, scope, 'Connections/Available', 'connections.available', null, false);
  self.metric(server, serverStatus, scope, 'Extra info/Heap usage', 'extra_info.heap_usage_bytes', 'MB', false, 1/1048576);
  self.metric(server, serverStatus, scope, 'Extra info/Page faults', 'extra_info.page_faults', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Index counters/BTree/Accesses', 'indexCounters.btree.accesses', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Index counters/BTree/Hits', 'indexCounters.btree.hits', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Index counters/BTree/Misses', 'indexCounters.btree.misses', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Index counters/BTree/Resets', 'indexCounters.btree.resets', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Index counters/BTree/Miss ratio', 'indexCounters.btree.missRatio', null, false);
  self.metric(server, serverStatus, scope, 'Background flushing/Flushes', 'backgroundFlushing.flushes', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Background flushing/Time', 'backgroundFlushing.total_ms', 'ms/minute', true);
  self.metric(server, serverStatus, scope, 'Background flushing/Average time', 'backgroundFlushing.average_ms', 'ms', false);
  self.metric(server, serverStatus, scope, 'Cursors/Total open', 'cursors.totalOpen', null, false);
  self.metric(server, serverStatus, scope, 'Cursors/Timed out', 'cursors.timedOut', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Network/Bytes in', 'network.bytesIn', 'Bytes/minute', true);
  self.metric(server, serverStatus, scope, 'Network/Bytes out', 'network.bytesOut', 'Bytes/minute', true);
  self.metric(server, serverStatus, scope, 'Network/Number of requests', 'network.numRequests', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Operation counters/insert', 'opcounters.insert', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Operation counters/query', 'opcounters.query', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Operation counters/update', 'opcounters.update', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Operation counters/delete', 'opcounters.delete', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Operation counters/getmore', 'opcounters.getmore', 'count/minute', true);
  self.metric(server, serverStatus, scope, 'Operation counters/command', 'opcounters.command', 'count/minute', true);

  // Journaling stats have intervals smaller than a minute
  /*
  self.metric(server, serverStatus, scope, '', 'dur.commits', , );
  self.metric(server, serverStatus, scope, '', 'dur.journaledMB', , );
  self.metric(server, serverStatus, scope, '', 'dur.writeToDataFilesMB', , );
  self.metric(server, serverStatus, scope, '', 'dur.compression', , );
  self.metric(server, serverStatus, scope, '', 'dur.commitsInWriteLock', , );
  self.metric(server, serverStatus, scope, '', 'dur.earlyCommits', , );
  self.metric(server, serverStatus, scope, '', 'dur.timeMs.dt', , );
  self.metric(server, serverStatus, scope, '', 'dur.timeMs.prepLogBuffer', , );
  self.metric(server, serverStatus, scope, '', 'dur.timeMs.writeToJournal', , );
  self.metric(server, serverStatus, scope, '', 'dur.timeMs.writeToDataFiles', , );
  self.metric(server, serverStatus, scope, '', 'dur.timeMs.remapPrivateView', , );
  */
};



MongoDBMonitor.prototype.loadCollStats = function(coll) {
  var self = this;

  var db = new self.mongodb.Db(
    coll.dbName,
    new self.mongodb.Server(coll.host, coll.port, {'auto_reconnect': false, 'poolSize': 1}), 
    {safe: false});

  db.open(function(err) {
    if(err) return self.done(db, err);

    if(coll.auth) {
      if(coll.auth.authdb === 'admin') {
        try {
          db.admin(function(err, adminDb) {
            if(err) return self.done(db, err);
            if(!adminDb) return;

            try {
              adminDb.authenticate(coll.auth.username, coll.auth.password, function(err, result) {
                if(err) return self.done(db, err);
                if(!result) return self.done(db, 'mongodb server auth failed');

                loadStats();
              });
            }
            catch(err) {
              self.done(db, err);
            }
          });
        }
        catch(err) {
          self.done(db, err);
        }
      }
      else {
        try {
          db.authenticate(coll.auth.username, coll.auth.password, function(err, result) {
            if(err) return self.done(db, err);
            if(!result) return self.done(db, 'mongodb server auth failed');

            loadStats();
          });
        }
        catch(err) {
          self.done(db, err);
        }      
      }
    }
    else {
      loadStats();
    }


    function loadStats() {
      try {
        db.collection(coll.collName, function(err, collection) {
          if(err) return self.done(db, err);

          try {
            collection.stats(function(err, stats) {
              if(err) return self.done(db, err);
              if(!stats) return self.done(db);

              try {
                self.extractCollMetrics(coll, stats)

                self.done(db);
              }
              catch(err) {
                self.done(db, err);
              }
            });
          }
          catch(err) {
            self.done(db, err);
          }
        });
      }
      catch(err) {
        self.done(db, err);
      }
    }
  });
};



MongoDBMonitor.prototype.extractCollMetrics = function(coll, stats) {
  var self = this;

  var scope = 
    'MongoDB Collection/' +
    coll.host + ':' + coll.port + '/' + 
    coll.dbName + '/' + 
    coll.collName;

  self.metric(coll, stats, scope, 'Object count', 'count', null, false);
  self.metric(coll, stats, scope, 'Collection size', 'size' ,'MB', false, 1/1048576);
  self.metric(coll, stats, scope, 'Average object size', 'avgObjSize', 'Bytes', false);
  self.metric(coll, stats, scope, 'Storage size', 'storageSize', 'MB', false, 1/1048576);
  self.metric(coll, stats, scope, 'Index size', 'totalIndexSize', 'MB', false, 1/1048576);
  self.metric(coll, stats, scope, 'Padding factor', 'paddingFactor', null, false);
};

