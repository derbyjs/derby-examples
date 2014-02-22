'use strict';


function NetProbe(agent) {
  this.agent = agent;

  this.packages = ['net'];
}
exports.NetProbe = NetProbe;



NetProbe.prototype.attach = function(obj) {
  var self = this;

  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;

  var bytesWritten = 0;
  var bytesRead = 0;

  self.agent.timers.setInterval(function() {
    self.agent.metric('Network', 'Data sent per minute', bytesWritten / 1024, 'KB', 'avg');
    self.agent.metric('Network', 'Data received per minute', bytesRead / 1024, 'KB', 'avg');

    bytesWritten = bytesRead = 0;
  }, 60000);


  proxy.after(obj, ['connect', 'createConnection'], function(obj, args, ret) {
    var socket = ret;
    var lastBytesWritten = 0;
    var lastBytesRead = 0;
    var currentBytesWritten = 0;
    var currentBytesRead = 0;

    proxy.before(ret, ['write', 'end'], function(obj, args) {
      currentBytesWritten = socket.bytesWritten || 0;
      bytesWritten += currentBytesWritten - lastBytesWritten;
      self.agent.processState.bytesWritten += currentBytesWritten - lastBytesWritten;
      lastBytesWritten = currentBytesWritten;
    });
  
    proxy.before(ret, 'on', function(obj, args) {
      if(args.length < 1 || args[0] !== 'data') return;
  
      proxy.callback(args, -1, function(obj, args) {  
        currentBytesRead = socket.bytesRead || 0;
        bytesRead += currentBytesRead - lastBytesRead;
        self.agent.processState.bytesRead += currentBytesRead - lastBytesRead;
        lastBytesRead = currentBytesRead;
      });
    });
  });
};

