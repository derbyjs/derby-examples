'use strict';


/*
 * To hold a set of metrics associated with a call in closure context.
 */

function CallMetrics(agent) {
  this.agent = agent;

  this.rpm = undefined;
  this.trpm = undefined;

  this.epm = undefined;
  this.tepm = undefined;
  this.art = undefined;
  this.rtp = undefined;
  this.act = undefined;

  // Predefined performance index metric.
  this.pi = this.agent.performanceIndexMetric;
}
exports.CallMetrics = CallMetrics;


CallMetrics.prototype.init = function(scope, group) {
  var mm = this.agent.metricsManager;

  if(group) {
    scope = scope + '/' + group;
  }

  this.rpm = mm.findOrCreateMetric(scope, 'Requests per minute', 'count', 'sum');
  this.trpm = mm.findOrCreateMetric(scope, 'Total requests per minute', 'count', 'inc');

  this.epm = mm.findOrCreateMetric(scope, 'Errors per minute', 'count', 'sum');
  this.tepm = mm.findOrCreateMetric(scope, 'Total errors per minute', 'count', 'inc');
  this.art = mm.findOrCreateMetric(scope, 'Average response time', 'ms', 'avg');
  this.rtp = mm.findOrCreateMetric(scope, 'Response time 95th percentile', 'ms', '95th');
  this.act = mm.findOrCreateMetric(scope, 'Average CPU time', 'ms', 'avg');
};


CallMetrics.prototype.callStart = function(time) {
  this.rpm.addValue(1);
  this.trpm.addValue(1);
};


CallMetrics.prototype.callDone = function(time) {
  this.epm.addValue(time.hasError ? 1 : 0);
  this.tepm.addValue(time.hasError ? 1 : 0);
  this.art.addValue(time.ms);
  this.rtp.addValue(time.ms);
  if(time.cputime) {
    this.act.addValue(time.cputime);
  }

  this.pi.addValue(time.ms);
};

