'use strict';


var TimePromise = require('./time-promise').TimePromise;


function CustomTransaction(agent) {
  this.agent = agent;

  this.counter = undefined;
  this.metrics = undefined;
}
exports.CustomTransaction = CustomTransaction;


CustomTransaction.prototype.init = function() {
  this.counter = this.agent.profiler.createSkipCounter();
  this.metrics = this.agent.profiler.createCallMetricsGroups();
};


CustomTransaction.prototype.start = function(scope, label, context) {
  var tp = new TimePromise(this.agent, scope, label, this.counter, this.metrics);
  tp.start(context);

  return tp;
};
