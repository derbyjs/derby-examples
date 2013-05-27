'use strict';

var crypto = require('crypto');


function Utils(agent) {
  this.agent = agent;
}
exports.Utils = Utils;


Utils.prototype.init = function(str) {
}


Utils.prototype.sha1 = function(str) {
  var hash = crypto.createHash('sha1');
  hash.update(str);
  return hash.digest('hex');
};
