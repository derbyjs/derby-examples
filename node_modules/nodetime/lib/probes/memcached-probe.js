'use strict';


var commands = [
  'get',
  'gets',
  'getMulti',
  'set',
  'replace',
  'add',
  'cas',
  'append',
  'prepend',
  'increment',
  'decrement',
  'incr',
  'decr',
  'del',
  'delete',
  'version',
  'flush',
  'samples',
  'slabs',
  'items',
  'flushAll',
  'statsSettings',
  'statsSlabs',
  'statsItems',
  'cachedump'
];


function MemcachedProbe(agent) {
  this.agent = agent;

  this.packages = ['memcached'];
}
exports.MemcachedProbe = MemcachedProbe;



MemcachedProbe.prototype.attach = function(obj) {
  var self = this;

  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;
  var profiler = self.agent.profiler;
  var counter = profiler.createSkipCounter();
  var metrics = profiler.createCallMetricsGroups();
  var type = 'Memcached';

  commands.forEach(function(command) {
    proxy.before(obj.prototype, command, function(obj, args) {
      // ignore, getMulti will be called
      if(command === 'get' && Array.isArray(args[0])) return;

      var client = obj;
      var trace = profiler.stackTrace();
      var params = args;
      var time = profiler.time(type, command);
      metrics.callStart(type, null, time);
      metrics.callStart(type, command, time);

      proxy.callback(args, -1, function(obj, args) {
        if(!time.done(proxy.hasError(args))) return;
        metrics.callDone(type, null, time);
        metrics.callDone(type, command, time);
        if(counter.skip(time)) return;

        var error = proxy.getErrorMessage(args);
        var sample = profiler.createSample();
        sample['Type'] = type;
        sample['Servers'] = client.servers;
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

