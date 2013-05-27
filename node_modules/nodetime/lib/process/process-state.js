'use strict';


/*
 * ProcessState is responsible for keeping process related state.
 * Certain probes are regularly updating the state.
 */

function ProcessState(agent) {
  this.agent = agent;

  this.bytesRead = 0;
  this.bytesWritten = 0;
};
exports.ProcessState = ProcessState;


ProcessState.prototype.init = function(str) {
}

