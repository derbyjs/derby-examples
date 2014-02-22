'use strict';

var CallMetrics = require('./call-metrics').CallMetrics;


/*
 * Manages groups of metric calls. See call-metrics.js
 */

function CallMetricsGroups(agent) {
  this.agent = agent;

  this.callMetrics = undefined;
  this.callMetricsGroups = {};
}
exports.CallMetricsGroups = CallMetricsGroups;



CallMetricsGroups.prototype.init = function(scope, groups) {
  var self = this;

  groups.forEach(function(group) {
    var callMetrics = new CallMetrics(this.agent);
    callMetrics.init(scope, group);
    self.callMetricsGroups[group] = callMetrics;
  });
};


CallMetricsGroups.prototype.callStart = function(scope, group, time) {
  if(group) {
   var callMetrics = this.callMetricsGroups[group];
   if(callMetrics) {
     callMetrics.callStart(time);
   }
   else {
    callMetrics = new CallMetrics(this.agent);    
    callMetrics.init(scope, group);
    this.callMetricsGroups[group] = callMetrics;

    callMetrics.callStart(time);
   }
  }
  else {
    if(this.callMetrics) {
      this.callMetrics.callStart(time);
    }
    else {
      this.callMetrics = new CallMetrics(this.agent);
      this.callMetrics.init(scope, group);
      this.callMetrics.callStart(time);
    }
  }
};


CallMetricsGroups.prototype.callDone = function(scope, group, time) {
  if(group) {
    var callMetrics = this.callMetricsGroups[group];
    if(callMetrics) {
      callMetrics.callDone(time);
    }
  }
  else {
    this.callMetrics.callDone(time);
  }
};

