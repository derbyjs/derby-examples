'use strict';

/*
 * The Time class is used to calculate execution time and CPU time
 * of a call. It also emits call-start and call-done events.
 */

function Time(agent, scope, group, isRoot) {
  this.agent = agent;

  this.scope = scope;
  this.group = group;
  this.isRoot = isRoot;

  this.id = agent.getNextId();

  this._begin = undefined;
  this._cputime = undefined;

  this.begin = undefined;
  this.end = undefined;
  this.ms = undefined;
  this.cputime = undefined;

  this.hasError = undefined;

  this._bytesRead = undefined;
  this._bytesWritten = undefined;

  this.threadId = undefined;
};
exports.Time = Time;


Time.prototype.start = function() {
  var self = this;

  var system = self.agent.system;
  var thread = self.agent.thread;
  var processState = self.agent.processState;

  self.begin = system.millis();
  self._cputime = system.cputime();
  self._begin = system.hrtime();

  self._bytesRead = processState.bytesRead;
  self._bytesWritten = processState.bytesWritten;

  // threads
  if(self.isRoot) {
    self.threadId = thread.enter();
  }
  else {
    self.threadId = thread.current();
  }
};


Time.prototype.done = function(hasError) {
  var self = this;

  if(self.ms !== undefined) return false;

  var system = self.agent.system;
  var thread = self.agent.thread;
  var processState = self.agent.processState;

  self.ms = (system.hrtime() - self._begin) / 1000;
  self.end = self.begin + self.ms;
  if(self._cputime !== undefined) {
    self.cputime = (system.cputime() - self._cputime) / 1000;
  }

  self.hasError = hasError;

  self.bytesRead = processState.bytesRead - self._bytesRead;
  self.bytesWritten = processState.bytesWritten - self._bytesWritten;

  // threads
  if(self.isRoot) {
    thread.exit();
  }
  else {
    thread.resume(self.threadId);
  }

  return true;
};


