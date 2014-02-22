'use strict';

function Timers(agent) {
  this.agent = agent;

  this.timeoutIds = [];
  this.intervalIds = [];
}
exports.Timers = Timers;


Timers.prototype.init = function() {
  var self = this;

  self.agent.on('destroy', function() {
    self.timeoutIds.forEach(function(timeoutId) {
      clearTimeout(timeoutId);
    });
    self.timeoutIds = [];

    self.intervalIds.forEach(function(intervalId) {
      clearInterval(intervalId);
    });    
    self.intervalIds = [];
  });
};


Timers.prototype.setTimeout = function(func, ms) {
  var self = this;

  var context = {timeoutId: undefined};

  var funcWrap = function() {
    try {
      func.apply(this, arguments);
    }
    catch(err) {
      self.agent.logger.error(err);
    }

    self.deleteTimeout(context.timeoutId);
  };

  context.timeoutId = setTimeout(funcWrap, ms);
  this.timeoutIds.push(context.timeoutId);

  return context.timeoutId;
};


Timers.prototype.setInterval = function(func, ms) {
  var self = this;

  var funcWrap = function() {
    try {
      func();
    }
    catch(err) {
      self.agent.logger.error(err);
    }
  };

  var intervalId = setInterval(funcWrap, ms);
  self.intervalIds.push(intervalId);
  return intervalId;
};


Timers.prototype.clearTimeout = function(timeoutId) {
  this.deleteTimeout(timeoutId);
  clearTimeout(timeoutId);
};


Timers.prototype.clearInterval = function(intervalId) {
  this.deleteInterval(intervalId);
  clearTimeout(intervalId);
};


Timers.prototype.deleteTimeout = function(timeoutId) {
  for (var i = 0; i < this.timeoutIds.length; i++) {
    if(this.timeoutIds[i] === timeoutId) {
      this.timeoutIds.splice(i, 1);
      break;
    }
  }
};


Timers.prototype.deleteInterval = function(intervalId) {
  for (var i = 0; i < this.intervalIds.length; i++) {
    if(this.intervalIds[i] === intervalId) {
      this.intervalIds.splice(i, 1);
      break;
    }
  }
};
