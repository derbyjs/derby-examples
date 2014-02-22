'use strict';


var commands = [
  'get',
  'set',
  'delete',
  'add',
  'replace',
  'append',
  'prepend',
  'cas',
  'increment',
  'decrement',
  'stats'
];



function MemcacheProbe(agent) {
  this.agent = agent;

  this.packages = ['memcache'];
}
exports.MemcacheProbe = MemcacheProbe;



MemcacheProbe.prototype.attach = function(obj) {
  var self = this;

  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;
  var profiler = self.agent.profiler;
  var counter = profiler.createSkipCounter();
  var metrics = profiler.createCallMetricsGroups();
  var type = 'Memcached';

  // connect
  proxy.after(obj.Client.prototype, 'connect', function(obj, args, ret) {
    obj.__trace__ = profiler.stackTrace();
    obj.__time__ = profiler.time(type, 'connect');
    metrics.callStart(type, null, obj.__time__);
    metrics.callStart(type, 'connect', obj.__time__);
  });

  proxy.before(obj.Client.prototype, 'on', function(obj, args) {
    var client = obj;
    var event = args[0];
    if(event !== 'connect' && event !== 'timeout' && event !== 'error') return;

    proxy.callback(args, -1, function(obj, args) {
      var time = client.__time__;
      if(!time || !time.done(proxy.hasError(args))) return;
      metrics.callDone(type, null, time);
      metrics.callDone(type, 'connect', time);
      if(counter.skip(time)) return;

      var error = undefined;
      if(event === 'timeout') {
        error = 'socket timeout';
      }
      else if(event === 'error') {
        error = proxy.getErrorMessage(args);
      }

      var command = 'connect';
      var sample = profiler.createSample();
      sample['Type'] = type;
      sample['Connection'] = {host: client.host, port: client.port};
      sample['Command'] = command;
      sample['Stack trace'] = client.__trace__;
      sample['Error'] = error;
      sample._group = type + ': ' + command;
      sample._label = type + ': ' + command;

      profiler.addSample(time, sample);
    });
  });
 

  // commands
  commands.forEach(function(command) {
    proxy.before(obj.Client.prototype, command, function(obj, args) {
      var client = obj;
      var trace = profiler.stackTrace();
      var params = args;
      var time = profiler.time(type, command);
      metrics.callStart(type, null, time);
      metrics.callStart(type, command, time);

      // there might be args after callback, need to do extra callback search
      var pos = findCallback(args);
      if(pos == undefined) return;

      proxy.callback(args, pos, function(obj, args) {
        if(!time.done(proxy.hasError(args))) return;
        metrics.callDone(type, null, time);
        metrics.callDone(type, command, time);
        if(counter.skip(time)) return;

        var error = proxy.getErrorMessage(args);
        var sample = profiler.createSample();
        sample['Type'] = 'Memcached';
        sample['Connection'] = {host: client.host, port: client.port};
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

var findCallback = function(args) {
  for(var i = 0; i < args.length; i++)
    if(typeof args[i] === 'function') return i;
};


