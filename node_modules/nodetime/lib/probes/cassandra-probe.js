'use strict';


var commands = [
  'get',
  'count',
  'set',
  'remove',
  'truncate',
  'use',
  'addKeySpace',
  'dropKeySpace'
];


/*
 * This probe is not used. Should be revisited.
 */

function CassandraProbe(agent) {
  this.agent = agent;

  this.packages = ['cassandra'];
}
exports.CassandraProbe = CassandraProbe;


CassandraProbe.prototype.attach = function(obj) {
  var self = this;

  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;
  var profiler = self.agent.profiler;
  var counter = profiler.createSkipCounter();
  var metrics = profiler.createCallMetricsGroups();
  var type = 'Cassandra';

  commands.forEach(function(command) {
    proxy.before(obj.ColumnFamily.prototype, command, function(obj, args) {
      var cf = obj;
      var trace = profiler.stackTrace();
      var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
      var time = profiler.time(type, command);
      metrics.callStart(type, null, time);
      metrics.callStart(type, command, time);

      proxy.callback(args, -1, function(obj, args) {
        if(!time.done(proxy.hasError(args)))) return;
        metrics.callDone(type, null, time);
        metrics.callDone(type, command, time);
        if(counter.skip(time)) return;

        var error = proxy.getErrorMessage(args);
        var sample = profiler.createSample();
        sample['Type'] = type;
        sample['Connection'] = {host: cf.client_.host, port: cf.client_.port, keyspace: cf.client_.keyspace, columnFamily: cf.name};
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

