'use strict';


var commands = [
  'rename',
  'truncate',
  'chown',
  'fchown',
  'lchown',
  'chmod',
  'fchmod',
  'lchmod',
  'stat',
  'lstat',
  'fstat',
  'link',
  'symlink',
  'readlink',
  'realpath',
  'unlink',
  'rmdir',
  'mkdir',
  'readdir',
  'close',
  'open',
  'utimes',
  'futimes',
  'fsync',
  'write',
  'read',
  'readFile',
  'writeFile',
  'appendFile',
  'exists'
];


function FsProbe(agent) {
  this.agent = agent;

  this.packages = ['fs'];
}
exports.FsProbe = FsProbe;



FsProbe.prototype.attach = function(obj) {
  var self = this;
  
  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;
  var profiler = self.agent.profiler;
  var counter = profiler.createSkipCounter();
  var metrics = profiler.createCallMetricsGroups();
  var type = 'File System';

  commands.forEach(function(command) {
    proxy.before(obj, command, function(obj, args) {
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
        sample['Command'] = command;
        sample['Arguments'] = profiler.truncate(params);
        sample['Stack trace'] = trace;
        sample['Error'] = error;
        sample._group = type + ': ' + command;
        sample._label = type + ': ' + command;

        profiler.addSample(time, sample);
      });
    });

 
    var commandSync = command + 'Sync';
    proxy.around(obj, commandSync, function(obj, args, locals) {
      locals.stackTrace = profiler.stackTrace();
      locals.params = args;
      locals.time = profiler.time(type, commandSync);
      metrics.callStart(type, null, locals.time);
      metrics.callStart(type, commandSync, locals.time);

    }, function(obj, args, ret, locals) {
      if(!locals.time.done()) return;
      metrics.callDone(type, null, locals.time);
      metrics.callDone(type, commandSync, locals.time);
      if(counter.skip(locals.time)) return;

      var sample = profiler.createSample();
      sample['Type'] = type;
      sample['Command'] = commandSync; 
      sample['Arguments'] = profiler.truncate(locals.params);
      sample['Stack trace'] = locals.stackTrace;
      sample._group = type + ': ' + commandSync;
      sample._label = type + ': ' + commandSync;

      profiler.addSample(locals.time, sample);
    });
  });
};

