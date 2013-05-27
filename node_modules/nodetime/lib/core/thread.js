'use strict';

/*
 * Thread class simulates thread model, which allows to trace 
 * nested operations.
 */

function Thread(agent) {
  this.agent = agent;
  this.nextId = 1;
  this.threadId = undefined;
}

exports.Thread = Thread;


Thread.prototype.init = function() {
};


Thread.prototype.enter = function() {
  this.threadId = this.nextId++; // no way this runs out
  return this.threadId;
};


Thread.prototype.exit = function() {
  this.threadId = undefined;
};


Thread.prototype.current = function() {
  return this.threadId;
};


Thread.prototype.resume = function(threadId) {
  this.threadId = threadId;
};


