'use strict';


/*
 * Deprecated.
 */

function DTraceProvider(agent) {
  this.agent = agent;
  this.spaceRegexp = /\s/g;
} 
exports.DTraceProvider = DTraceProvider;

DTraceProvider.prototype.init = function() {
  var self = this;

  // trying to initialize dtrace provider
  var dtp = undefined;
  try { 
    var d = require("dtrace-provider"); 
    dtp = d.createDTraceProvider("nodetime");
    dtp.addProbe("api-call-start", "int", "char *", "char *");
    dtp.addProbe("api-call-done", "int", "char *", "char *");
    dtp.enable();
  } 
  catch(err) { 
    this.agent.logger.error(err) 
  }


  // firing dtrace events on calls
  
  if(!dtp) return;

  this.agent.on('call-start', function(time) {
    try {
      var scope = time.scope.replace(self.spaceRegexp, '-').toLowerCase();
      var command = time.group.replace(self.spaceRegexp, '-').toLowerCase();
      dtp.fire('api-call-start', function() {
        return [time.id, scope, command];
      });
    } 
    catch(err) { 
      this.agent.logger.error(err) 
    }
  });

  this.agent.on('call-done', function(time) {
    try {
      var scope = time.scope.replace(self.spaceRegexp, '-').toLowerCase();
      var command = time.group.replace(self.spaceRegexp, '-').toLowerCase();
      dtp.fire('api-call-done', function() {
        return [time.id, scope, command];
      });
    } 
    catch(err) { 
      this.agent.logger.error(err) 
    }
  });

};


