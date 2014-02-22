'use strict';

function System(agent) {
  this.agent = agent;
  
  this.hasHrtime = true;
  this.timekit = undefined;
}
exports.System = System;


System.prototype.init = function() {
  var self = this;

  self.nodetimeNative = self.agent.nodetimeNative;

  // make sure hrtime is available
  self.hasHrtime = process.hasOwnProperty('hrtime');
};


System.prototype.hrtime = function() {
  if(this.nodetimeNative) {
    return this.nodetimeNative.time();
  }
  else if(this.hasHrtime) {
    var ht = process.hrtime();
    return ht[0] * 1000000 + Math.round(ht[1] / 1000);
  }
  else {
    return Date.now() * 1000;
  }
};


System.prototype.micros = function() {
  return this.nodetimeNative ? this.nodetimeNative.time() : Date.now() * 1000;
};


System.prototype.millis = function() {
  return this.nodetimeNative ? this.nodetimeNative.time() / 1000 : Date.now();
};


System.prototype.cputime = function() {
  return this.nodetimeNative ? this.nodetimeNative.cpuTime() : undefined;
};

