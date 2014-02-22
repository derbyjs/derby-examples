'use strict';


function ProcessProbe(agent) {
  this.agent = agent;
}
exports.ProcessProbe = ProcessProbe;



ProcessProbe.prototype.attach = function(obj) {
  var self = this;

  var proxy = self.agent.proxy;
  var thread = self.agent.thread;

  var bytesToStdout = 0;
  var bytesToStderr = 0;
  var uncaughtExceptions = undefined;

  self.agent.timers.setInterval(function() {
    self.agent.metric('Process', 'Data written to STDOUT per minute', bytesToStdout / 1024, 'KB', 'avg');
    self.agent.metric('Process', 'Data written to STDERR per minute', bytesToStderr / 1024, 'KB', 'avg');
    bytesToStdout = bytesToStderr = 0;

    if(uncaughtExceptions !== undefined) {
      self.agent.metric('Process', 'Uncaught exceptions', uncaughtExceptions, undefined, 'avg');
      uncaughtExceptions = 0;
    }
  }, 60000);

  proxy.before(obj.stdout, ['write', 'end'], function(obj, args) {
    bytesToStdout += calculateSize(args[0]);
  });

  if(obj.stdout !== obj.stderr) {
    proxy.before(obj.stderr, ['write', 'end'], function(obj, args) {
      bytesToStderr += calculateSize(args[0]);
    });
  }

  proxy.before(obj, ['on', 'addListener'], function(obj, args) {
    if(args[0] !== 'uncaughtException') return;

    if(uncaughtExceptions === undefined) {
      uncaughtExceptions = 0;
    }

    proxy.callback(args, -1, function(obj, args) {
      uncaughtExceptions++;
    });
  });


  // we need nextThick for thread simulation
  proxy.before(obj, ['nextTick'], function(obj, args) {
    var threadId = thread.current();
    proxy.callback(args, -1, function(obj, args) {
      thread.resume(threadId);
    });
  });
};


function calculateSize(args) {
  if(args.length < 1) return 0;

  return args[0].length || 0; // approximate for strings
}

