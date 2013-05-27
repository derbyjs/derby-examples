'use strict';


/*
 * Extracts sample objec field names and emits them. DataSender 
 * sends them to server for displaying on the transaction profiler page.
 */


function FilterKeyExtractor(agent) {
  this.agent = agent;
  
  this.filterKeys = {};
  this.sampleNum = 0;
}
exports.FilterKeyExtractor = FilterKeyExtractor;


FilterKeyExtractor.prototype.init = function() {
  var self = this;
  var profiler = self.agent.profiler;

  self.agent.on('sample', function(sample) {
    if(self.agent.sessionId && !profiler.paused) {
      self.collectKeys(undefined, sample, 0);

      // collect keys only from the first 25 samples
      if(self.sampleNum++ < 25) {
        self.collectKeys(undefined, sample, 0);
      }

      // send keys only on first and tenth sample
      if(self.sampleNum === 1 || self.sampleNum === 10) {
        self.sendKeys();
      }
    }
  });

  // send keys on transaction profiler resume
  self.agent.on('resume', function() {
    self.sendKeys();
  })
};


FilterKeyExtractor.prototype.collectKeys = function(key, obj, depth) {
  var self = this;

  if(depth > 20) return 0;

  var isArray = Array.isArray(obj);
  for(var prop in obj) {
    if(prop.match(/^\_/)) continue;

    if(typeof obj[prop] === 'object') {
      self.collectKeys(prop, obj[prop], depth + 1);
    }
    else {
      if(!isArray) { 
        self.filterKeys[prop] = true;
      }
      else {
        self.filterKeys[key] = true;
      }
    }
  }
};


FilterKeyExtractor.prototype.sendKeys = function() {
  var self = this;

  var keys = [];
  for(var prop in this.filterKeys) {
    keys.push(prop);
  }

  keys = keys.sort(function(a, b) {
    a = a.toLowerCase(); 
    b = b.toLowerCase();

    if(a > b) return 1;
    if(a < b) return -1;
    return 0; 
  });

  if(keys.length > 0) {
    self.agent.emit('filterKeys', keys);
  }
};


