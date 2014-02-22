'use strict';

var os = require('os');
var Metric = require('./metric').Metric;


/*
 * MetricsManager managemes metric lifecycle, i.e. keeps list 
 * and map of metrics, aggregates and emits every minute, etc. 
 * It also emits all possible metris once on agent start, to make sure 
 * the server gets something to start with.
 */

function MetricsManager(agent) {
  this.agent = agent;

  this.stringRegex = /^[a-zA-Z0-9 \_\-\+\'\/\.\:\?\[\]\(\)]{1,128}$/;

  this.metrics = [];
  this.metricMap = {};
}
exports.MetricsManager = MetricsManager;


MetricsManager.prototype.init = function() {
  var self = this;

  self.agent.timers.setTimeout(function() {
    self.agent.timers.setInterval(function() {
      self.flush();
    }, 60000);
  }, 2000);

  //send any initial values
  self.agent.on('session', function() {
    self.flushPartial();
  });
};


MetricsManager.prototype.createMetric = function(scope, name, unit, op) {
  var self = this;

  if(this.metrics.length == 5000) {
    self.agent.logger.message('too many metrics, ignoring metric');
    return new Metric(scope, name, unit, op); // dummy metric
  }

  if(
    !scope || typeof(scope) !== 'string' || !self.stringRegex.exec(scope) ||
    !name || typeof(name) !== 'string' || !self.stringRegex.exec(name)
  ) {
    self.agent.logger.message('metric parameter(s) missing or invalid, ignoring metric');
    return new Metric(scope, name, unit, op); // dummy metric
  }

  var metric = new Metric(scope, name, unit, op);
  self.metrics.push(metric);
  self.metricMap[scope + '/' + name] = metric;

  return metric;
}


MetricsManager.prototype.findMetric = function(scope, name) {
  return this.metricMap[scope + '/' + name];
}



MetricsManager.prototype.findOrCreateMetric = function(scope, name, unit, op) {
  var metric = this.findMetric(scope, name);
  if(!metric) {
    metric = this.createMetric(scope, name, unit, op);
  }

  return metric;
}


MetricsManager.prototype.addMetric = function(scope, name, value, unit, op) {
  var metric = this.findMetric(scope, name);
  if(!metric) {
    metric = this.createMetric(scope, name, unit, op);
  }

  metric.addValue(value);

  return metric;
}


MetricsManager.prototype.emit = function(metric) {
  var self = this;

  try {
    // convert aggregation operations to those recognized by the server
    switch(metric.op) {
      case 'index':
      case '95th':
      case 'sum':
        metric.op = 'avg';
        break;
    }

    metric.source = os.hostname() + '[' + process.pid + ']';
    metric._ns = 'metrics';
    metric._id = self.agent.getNextId(); 
    metric._ts = Date.now();

    self.agent.emit('metric', metric);
  }
  catch(err) {
    self.agent.logger.error(err);
  }
};


MetricsManager.prototype.flushPartial = function() {
  var self = this;

  self.metrics.forEach(function(metric) {
    if(!metric.isInitialized()) return;

    if(metric.op === 'avg' || 
      metric.op === 'set' || 
      metric.op === 'setx')
    {
      metric.aggregate();
      self.emit(metric.clone());
    }
  });
};


MetricsManager.prototype.flush = function() {
  var self = this;

  self.metrics.forEach(function(metric) {
    if(!metric.isInitialized()) return;

    metric.aggregate();

    if(metric.value !== undefined) {
      self.emit(metric.clone());
      metric.reset();
    }
  });
};

