'use strict';


var os = require('os');

/*
 * Sends process information to the server every minute
 */

function ProcessInfo(agent) {
  this.agent = agent;
}

exports.ProcessInfo = ProcessInfo;


ProcessInfo.prototype.init = function() {
  var self = this;

  self.agent.timers.setInterval(function() {
    self.sendInfo();
  }, 60000);

  self.agent.on('session', function() {
    self.sendInfo();
  });
};


ProcessInfo.prototype.sendInfo = function() {
  var self = this;

  var info = {};
  info._ts = self.agent.system.millis();
  info._ns = 'info';
  info['Application name'] = self.agent.appName;
  
  try { 
    info['Hostname'] = os.hostname();
  } catch(err) { 
    self.logError(err) 
  }

  try { 
    info['OS type'] = os.type();
  } 
  catch(err) { 
    self.logError(err) 
  } 

  try { 
    info['Platform'] = os.platform();
  } 
  catch(err) { 
    self.logError(err) 
  } 

  try { 
    info['Total memory (MB)'] = os.totalmem() / 1048576;
  } 
  catch(err) { 
    self.logError(err) 
  } 

  try { 
    var cpus = os.cpus(); info['CPU'] = {
      architecture: os.arch(), 
      model: cpus[0].model, 
      speed: cpus[0].speed, 
      cores: cpus.length
    }; 
  } 
  catch(err) { 
    self.logError(err) 
  } 

  try { 
    info['Interfaces'] = os.networkInterfaces();
  } 
  catch(err) { 
    self.logError(err) 
  } 

  try { 
    info['OS uptime (Hours)'] = Math.floor(os.uptime() / 3600);
  } 
  catch(err) { 
    self.logError(err) 
  } 

  try { 
    info['Node arguments'] = process.argv;
  } 
  catch(err) { 
    self.logError(err) 
  } 

  try { 
    info['Node PID'] = process.pid; 
  } 
  catch(err) { 
    self.logError(err) 
  } 

  try { 
    info['Node uptime (Hours)'] = Math.floor(process.uptime() / 3600); 
  } 
  catch(err) { 
    self.logError(err) 
  } 

  try { 
    info['Node versions'] = process.versions;
  } 
  catch(err) { 
    self.logError(err) 
  } 

  info['Nodetime version'] = self.agent.version;
  info['Nodetime options'] = {
    debug: self.agent.debug,
    features: self.agent.features,
    transactionFilter: self.agent.profiler.filterOptions
  };

  try {
    self.agent.emit('info', info);
  }
  catch(err) {
    self.logError(err);
  }
}


ProcessInfo.prototype.logError = function(err) {
  this.agent.logger.error(err);
}


