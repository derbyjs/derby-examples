'use strict';


var os = require('os');


/*
 * Sending process related data as metrics.
 */

function ProcessStats(agent) {
  this.agent = agent;

  this.lastCpuTime = undefined;
}
exports.ProcessStats = ProcessStats;


ProcessStats.prototype.init = function() {
  var self = this;

  self.agent.timers.setInterval(function() {
    self.collectMetrics();
  }, 60000);

  self.collectMetrics();
};


ProcessStats.prototype.collectMetrics = function() {
  var self = this;

  try {
    self.agent.metric('OS', 'Load average', os.loadavg()[0], null, 'avg'); 
    self.agent.metric('OS', 'Total memory', os.totalmem() / 1048576, 'MB', 'avg');
    self.agent.metric('OS', 'Free memory', os.freemem() / 1048576, 'MB', 'avg');

    if(self.agent.features.hostMetrics) {
      var host = os.hostname();
      self.agent.metric('OS/' + host, 'Load average', os.loadavg()[0], null, 'set'); 
      self.agent.metric('OS/' + host, 'Total memory', os.totalmem() / 1048576, 'MB', 'set');
      self.agent.metric('OS/' + host, 'Free memory', os.freemem() / 1048576, 'MB', 'set');
    }
  }
  catch(err) { 
    self.agent.logger.error(err); 
  }

  self.agent.metric('Process', 'Agents', 1, 'count', 'inc');

  try {
    var mem = process.memoryUsage();
    self.agent.metric('Process', 'Node RSS', mem.rss / 1048576, 'MB', 'avg');
    self.agent.metric('Process', 'V8 heap used', mem.heapUsed / 1048576, 'MB', 'avg');
    self.agent.metric('Process', 'V8 heap total', mem.heapTotal / 1048576, 'MB', 'avg');
  }
  catch(err) {
    self.agent.logger.error(err);
  }

  var cpuTime = self.agent.system.cputime();
  if(cpuTime !== undefined && self.lastCpuTime !== undefined) {
    var cpuTimePerMinute = (cpuTime - self.lastCpuTime) / 1000;
    self.agent.metric('Process', 'CPU time', cpuTimePerMinute, 'ms', 'avg');
    self.agent.metric('Process', 'CPU usage', cpuTimePerMinute / 60000 * 100, 'percent', 'avg');
  }
  if(cpuTime !== undefined) {
    self.lastCpuTime = cpuTime;
  }
};

