'use strict';


function DataSender(agent) {
  this.agent = agent;
  this.infoBuffer = undefined;
  this.metricsBuffer = [];
  this.samplesBuffer = {};
  this.slowSamplesBuffer = {};
}
exports.DataSender = DataSender;


DataSender.prototype.init = function() {
  var self = this;
  var saasClient = self.agent.saasClient;

  self.agent.on('session', function() {
    self.agent.on('info', function(info) {
      self.infoBuffer = info;
    });

    self.agent.on('metric', function(metric) {
      self.metricsBuffer.push(metric);
    });

    self.agent.on('sample', function(sample) {
      // only send if profiler is active and sample was also filtered
      // by profiler and not only emitted as historically slowest samples
      if(!self.agent.profiler.paused && sample._filtered) {
        self.samplesBuffer[sample._group] || (self.samplesBuffer[sample._group] = []);
        self.samplesBuffer[sample._group].push(sample);
      }

      self.slowSamplesBuffer[sample._group] || (self.slowSamplesBuffer[sample._group] = []);
      self.slowSamplesBuffer[sample._group].push(sample);
    });

    self.agent.on('cpuProfile', function(cpuProfile) {
      saasClient.sendCommand('updateData', cpuProfile);
    });

    self.agent.on('heapSnapshot', function(heapSnapshot) {
      saasClient.sendCommand('updateData', heapSnapshot);
    });

    self.agent.on('filterKeys', function(filterKeys) {
      saasClient.sendCommand('updateFilterKeys', filterKeys);
    });


    // send info and metrics and empty the buffers
    self.agent.timers.setInterval(function() {
      self.sendInfo();
      self.sendMetrics();
    }, 2000);

    // send samples and empty the buffer
    self.agent.timers.setInterval(function() {
      self.sendSamples();
    }, 5000);

    // send slow samples and empty the buffer
    self.agent.timers.setInterval(function() {
      self.sendSlowSamples();
    }, 60000);
  });
};


DataSender.prototype.sendInfo = function() {
  var self = this;

  if(self.infoBuffer) {
    self.agent.saasClient.sendCommand('updateData', self.infoBuffer);
    self.infoBuffer = undefined;
  }
};


DataSender.prototype.sendMetrics = function() {
  var self = this;

  self.metricsBuffer.forEach(function(metric) {
    self.agent.saasClient.sendCommand('updateData', metric);
  });

  self.metricsBuffer = [];
};


DataSender.prototype.sendSamples = function() {
  var self = this;

  for(var group in self.samplesBuffer) {
    var samples = self.samplesBuffer[group].sort(function(a, b) {
      return b._ms - a._ms;
    });

    for(var i = 0; i < (samples.length < 5 ? samples.length : 5); i++) {
      self.agent.saasClient.sendCommand('updateData', samples[i]);
    }
  }

  self.samplesBuffer = {};
};


DataSender.prototype.sendSlowSamples = function() {
  var self = this;

  for(var group in self.slowSamplesBuffer) {
    var samples = self.slowSamplesBuffer[group].sort(function(a, b) {
      return b._ms - a._ms;
    });

    for(var i = 0; i < (samples.length < 5 ? samples.length : 5); i++) {
      samples[i]._slow = true;
      self.agent.saasClient.sendCommand('updateData', samples[i]);
    }
  }

  self.slowSamplesBuffer = {};
};


