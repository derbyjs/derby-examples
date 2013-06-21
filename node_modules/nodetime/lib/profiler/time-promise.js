'use strict';


function TimePromise(agent, scope, label, counter, metrics) {
  this.agent = agent;

  this.scope = scope;
  this.label = label;
  this.counter = counter;
  this.metrics = metrics;

  this.stackTrace = undefined;
  this.time = undefined;
  this.context = undefined;
};
exports.TimePromise = TimePromise;



TimePromise.prototype.start = function(context) {
  var self = this;
  var profiler = self.agent.profiler;

  self.stackTrace = profiler.stackTrace(),
  self.time = profiler.time(self.scope, self.label, true),
  self.metrics.callStart(self.scope, self.label, self.time);
  profiler.startTransaction(self.time);

  this.context = context;
};



TimePromise.prototype.end = function(context) {
  var self = this;
  var profiler = self.agent.profiler;

  if(!self.time.done()) return;
  self.metrics.callDone(self.scope, self.label, self.time);
  if(self.counter.skip(self.time)) return;

  var sample = profiler.createSample();
  sample['Type'] = self.scope;
  sample['Start context'] = self.context;
  sample['End context'] = context;
  sample['Stack trace'] = self.stackTrace;
  if(context && context['Error']) sample['Error'] = context['Error'];
  sample._group = self.scope;
  sample._label = self.scope + ': ' + self.time.group;

  profiler.addSample(self.time, sample);
};
