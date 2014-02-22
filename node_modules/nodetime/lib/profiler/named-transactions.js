'use strict';


function NamedTransactions(agent) {
  this.agent = agent;

  this.namedTransactions = undefined;
}
exports.NamedTransactions = NamedTransactions;



NamedTransactions.prototype.init = function(config) {
  var self = this;

  self.namedTransactions = {};

  var count = 0;
  for(var name in config) {
    count++;

    name = name.trim();
    var pattern = config[name];

    if(!name.match(/^[a-zA-Z0-9\_\-\ ]{1,25}$/)) {
      throw new Error('Nodetime: invalid name for a named transation');
    }

    if(typeof(pattern) === 'string') {
      pattern = new RegExp('^' + pattern);
    }
    else if(!(pattern instanceof RegExp)) {
      throw new Error('Nodetime: named transaction pattern should be string or RegExp');
    }

    self.namedTransactions[name] = pattern;
  }

  if(count > 10) {
    throw new Error('Nodetime: max (10) number of named transactions exceeded');
  }

  if(count == 0) {
    self.namedTransactions = undefined;
  }
};


NamedTransactions.prototype.matchRequest = function(req) {
  if(this.namedTransactions) {
    for(var name in this.namedTransactions) {
      var pattern = this.namedTransactions[name];
      if(pattern.exec(req.url)) {
        return name;
      }
    }
  }

  return undefined;
};

