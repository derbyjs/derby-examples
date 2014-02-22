'use strict';

function CassandraClientProbe(agent) {
  this.agent = agent;

  this.packages = ['cassandra-client'];
}
exports.CassandraClientProbe = CassandraClientProbe;


CassandraClientProbe.prototype.attach = function(obj) {
  var self = this;

  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;
  var profiler = self.agent.profiler;
  var counter = profiler.createSkipCounter();
  var metrics = profiler.createCallMetricsGroups();
  var type = 'Cassandra';

  // connect
  [obj.Connection.prototype, obj.PooledConnection.prototype].forEach(function(proto) {
    proxy.before(proto, 'connect', function(obj, args) {
      var client = obj;
      var trace = profiler.stackTrace();
      var time = profiler.time(type, 'connect');
      metrics.callStart(type, null, time);
      metrics.callStart(type, 'connect', time);

      proxy.callback(args, -1, function(obj, args) {
        if(!time.done(proxy.hasError(args))) return;
        metrics.callDone(type, null, time);
        metrics.callDone(type, command, time);
        if(counter.skip(time)) return;

        var error = proxy.getErrorMessage(args);
        var sample = profiler.createSample();
        sample['Type'] = type;
        sample['Connection'] = connection(client);
        sample['Command'] = 'connect';
        sample['Stack trace'] = trace;
        sample['Error'] = error;
        sample._group = type + ': connect';
        sample._label = type + ': connect';

        profiler.addSample(time, sample);
      });
    });
  });


  // execute
  [obj.Connection.prototype, obj.PooledConnection.prototype].forEach(function(proto) {
    proxy.before(proto, 'execute', function(obj, args) {
      var client = obj;
      var trace = profiler.stackTrace();
      var command = args.length > 0 ? args[0] : undefined;
      var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
      var time = profiler.time(type, 'execute');
      metrics.callStart(type, null, time);
      metrics.callStart(type, 'execute', time);

      proxy.callback(args, -1, function(obj, args) {
        if(!time.done()) return;
        metrics.callDone(type, null, time);
        metrics.callDone(type, 'execute', time);
        if(counter.skip(time)) return;

        var error = args.length > 0 ? (args[0] ? args[0].message : undefined) : undefined;
        var sample = profiler.createSample();
        sample['Type'] = type;
        sample['Connection'] = connection(client);
        sample['Command'] = command;
        sample['Arguments'] = profiler.truncate(params);
        sample['Stack trace'] = trace;
        sample['Error'] = error;
        sample._group = type + ': ' + command;
        sample._label = type + ': ' + command;

        profiler.addSample(time, sample);
      });
    });
  });
};


var connection = function(client) {
  var connection = undefined;

  if(client.connectionInfo) {
    connection = {
      host: client.connectionInfo.host,
      port: client.connectionInfo.port,
      keyspace: client.connectionInfo.keyspace,
      user: client.connectionInfo.user
    };
  }
  else if(client.connections && client.connections.length > 0) {
    connection = [];
    conn.connections.forEach(function(conn) {
      connection.push({
        host: conn.host,
        port: conn.port,
        keyspace: conn.keyspace,
        user: conn.user
      });
    });
  }

  return connection;
};

