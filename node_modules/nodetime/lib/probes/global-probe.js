'use strict';


function GlobalProbe(agent) {
  this.agent = agent;
}
exports.GlobalProbe = GlobalProbe;



GlobalProbe.prototype.attach = function(obj) {
  var self = this;

  var proxy = self.agent.proxy;
  var thread = self.agent.thread;

  // we need these for thread simulation
  proxy.before(obj, ['setTimeout', 'setInterval'], function(obj, args) {
    var threadId = thread.current();
    proxy.callback(args, 0, function(obj, args) {
      thread.resume(threadId);
    });
  });
};