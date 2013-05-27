'use strict';


function SkipCounter(agent) {
  this.agent = agent;

  this.counter = undefined;
  this.groupCounter = undefined;
};
exports.SkipCounter = SkipCounter;


SkipCounter.prototype.init = function() {
  var self = this;

  self.counter = 0;
  self.groupCounter = {};

  self.agent.timers.setInterval(function() {
    self.counter = 0;
    self.groupCounter = {};
  }, 10000);
}


SkipCounter.prototype.skip = function(time) {
  var group = time.group;

  if(group) {
    var count = this.groupCounter[group];

    if(!count) {
      this.groupCounter[group] = 1;
      return false;
    }
    else {
      this.groupCounter[group] = ++count;
      return (count > 25);
    }
  }
  else {
    return (++this.counter > 25);
  }
}
 