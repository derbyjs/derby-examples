'use strict';



/*
 * Redis server stats.
 */

function RedisMonitor(agent) {
  this.agent = agent;

  this.redis = undefined;

  this.clientsCount = 0;
  this.clients = {};
}
exports.RedisMonitor = RedisMonitor;



RedisMonitor.prototype.init = function(redis) {
  var self = this;

  self.redis = redis;

  self.agent.timers.setInterval(function() {
    for(var address in self.clients) {
      try {
        self.loadInfo(self.clients[address]);
      }
      catch(err) {
        self.agent.logger.error(err);
      }
    }
  }, 60000);
}



RedisMonitor.prototype.monitorServer = function(host, port, password) {
  var self = this;

  if(!self.agent.features.redisMetrics) return;

  var address = host + ':' + port;
  if(self.clients[address]) {
    if(password) {
     self.clients[address].password = password;
    }
  }
  else if(++self.clientsCount <= 10) {
    self.clients[address] = {
      host: host, 
      port: port, 
      password: password,
      lastValues: {}
    };
  }
}


RedisMonitor.prototype.metric = function(client, info, scope, name, key, unit, isRelative, scale) {
  var self = this;

  var numVal = parseFloat(info[key]);
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


RedisMonitor.prototype.done = function(rClient, err) {
  var self = this;

  try {
    rClient.quit();
  }
  catch(err2) {
    try {
      rClient.end();
    }
    catch(err3) {
      self.agent.logger.error(err3);
    }

    self.agent.logger.error(err2);
  }

  self.agent.logger.error(err);      
};


RedisMonitor.prototype.loadInfo = function(client) {
  var self = this;

  var rClient = self.redis.createClient(client.port, client.host);
  
  rClient.on('error', function(err) {
    self.done(rClient, err);
  });

  if(client.password) {
    rClient.auth(client.password, function(err) {
      if(err) self.done(rClient, err);
    });
  }

  rClient.on('ready', function() {
    try {
      var info = rClient.server_info;
      var scope = 'Redis Server/' + client.host + ':' + client.port;

      self.metric(client, info, scope, 'Used CPU sys' ,'used_cpu_sys' , null, true);
      self.metric(client, info, scope, 'Used CPU user' ,'used_cpu_user' , null, true);
      self.metric(client, info, scope, 'Connected clients' ,'connected_clients' , null, false);
      self.metric(client, info, scope, 'Connected slaves' ,'connected_slaves' , null, false);
      self.metric(client, info, scope, 'Blocked clients' ,'blocked_clients' , null, false);
      self.metric(client, info, scope, 'Expired keys', 'expired_keys' , null, true);
      self.metric(client, info, scope, 'Evicted keys' ,'evicted_keys' , null, true);
      self.metric(client, info, scope, 'Keyspace hits' ,'keyspace_hits' , null, true);
      self.metric(client, info, scope, 'Keyspace misses' ,'keyspace_misses' , null, true);
      self.metric(client, info, scope, 'Connections received' ,'total_connections_received' , null, true);
      self.metric(client, info, scope, 'Commands processed' ,'total_commands_processed' , null, true);
      self.metric(client, info, scope, 'Rejected connections' ,'rejected_connections' , null, true);
      self.metric(client, info, scope, 'Used memory', 'used_memory', 'KB', false, 1/1024);
      self.metric(client, info, scope, 'Used memory RSS' , 'used_memory_rss', 'KB', false);
      self.metric(client, info, scope, 'Memory fragmentation ratio' , 'mem_fragmentation_ratio', null, false);
      self.metric(client, info, scope, 'PubSub channels' ,'pubsub_channels' , null, false);

      self.done(rClient);
    }
    catch(err) {
      self.done(rClient, err);
    }
  });
};


