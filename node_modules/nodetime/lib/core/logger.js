'use strict';

var util = require('util');


function Logger(agent) {
  this.agent = agent;
}
exports.Logger = Logger;


Logger.prototype.init = function(debug) {
  this.debug = debug;
};


Logger.prototype.log = function(msg) {
  if(this.debug && msg) console.log('nodetime v' + this.agent.version + ':', msg);
};


Logger.prototype.error = function(err) {
  if(this.debug && err) console.error('nodetime v' + this.agent.version + ' error:', err, err.stack);
};


Logger.prototype.dump = function(obj) {
  if(this.debug) console.log(util.inspect(obj, false, 10, true));
};


Logger.prototype.message = function(msg) {
  util.log("\u001b[1;31mNodetime:\u001b[0m " + msg);
};
