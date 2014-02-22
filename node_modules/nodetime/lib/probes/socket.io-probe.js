'use strict';


function SocketioProbe(agent) {
  this.agent = agent;

  this.packages = ['socket.io'];
  this.attached = false;
}
exports.SocketioProbe = SocketioProbe;



SocketioProbe.prototype.attach = function(obj) {
  var self = this;

  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;
  var profiler = self.agent.profiler;
  var metricsManager = self.agent.metricsManager;

  var connectCount = undefined;

  var connectCountMetric = metricsManager.findOrCreateMetric('Socket.io', 'Socket count', 'count', 'avg');
  var totalConnectCountMetric = metricsManager.findOrCreateMetric('Socket.io', 'Total socket count', 'count', 'inc');
  var sentCountMetric = metricsManager.findOrCreateMetric('Socket.io', 'Messages sent per minute', 'count', 'sum');
  var receivedCountMetric = metricsManager.findOrCreateMetric('Socket.io', 'Messages received per minute', 'count', 'sum');

  self.agent.timers.setInterval(function() {
    if(connectCount !== undefined) {
      connectCountMetric.addValue(connectCount);
      totalConnectCountMetric.addValue(connectCount);
    }
  }, 60000);


  proxy.after(obj, 'listen', function(obj, args, ret) {
    if(!ret.sockets) return;

    if(connectCount === undefined) {
      connectCount = 0;
    }

    proxy.before(ret.sockets, ['on', 'addListener'], function(obj, args) {
      if(args[0] !== 'connection') return;

      proxy.callback(args, -1, function(obj, args) {
        if(!args[0]) return;

        var socket = args[0];

        // conenctions
        connectCount++;
        socket.on('disconnect', function() {
          connectCount--;
        });        

        // sent messages
        proxy.before(socket, ['emit', 'send'], function(obj, args) {
          // ignore internal events
          if(args[0] === 'newListener') return;

          sentCountMetric.addValue(1); 
        });

        // received messages
        proxy.before(socket, ['on', 'addListener'], function(obj, args) {
          // ignore internal events
          if(args[0] === 'disconnect') return;

          receivedCountMetric.addValue(1);   
        });
      });
    });
  });
};

