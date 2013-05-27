'use strict';


var os = require('os');


function CpuProfiler(agent) {
  this.agent = agent;

  this.active = false;
  this.origPaused;
}
exports.CpuProfiler = CpuProfiler;



CpuProfiler.prototype.init = function() {
  var self = this;

  // if paused during CPU profiling, do not resume automatically
  self.agent.on('pause', function() {
    self.origPaused = true;
  });

  // listening for command
  self.agent.on('command', function(command, args) {
    if(command === 'profileCpu') {
      try {
        if(typeof args === 'number' && args > 0 && args <= 60) {
          self.startCpuProfiler(args);
        }
      }
      catch(err) {
        self.agent.logger.error(err);
        self.active = false;
      }
    }
  });
}


CpuProfiler.prototype.sendError = function(msg) {
  var self = this;
  
  var obj = {};
  obj._id = self.agent.getNextId();
  obj._label = os.hostname() + ' [' + process.pid + ']';
  obj._ts = self.agent.system.millis();
  obj._ns = 'cpu-profiles';
  obj['Error'] = msg; 

  try {
    self.agent.emit('cpuProfle', obj);
  }
  catch(err) {
    self.agent.logger.error(err);
  }
}



CpuProfiler.prototype.startCpuProfiler = function(seconds) {
  var self = this;

  if(!self.agent.nodetimeNative) {
    return self.sendError("V8 tools are not loaded.");
  }

  if(self.active) {
    return self.sendError("CPU profiler is already active.");
  }

  self.active = true;

  seconds || (seconds = 10);

  var paused = self.agent.profiler.paused;
  if(!paused) {
    self.agent.profiler.pause(true);
    self.origPaused = paused;
  }


  self.agent.nodetimeNative.startV8Profiler();
  self.agent.logger.log("V8 CPU profiler started");

  // stop v8 profiler automatically after 10 seconds
  self.agent.timers.setTimeout(function() {
    self.stopCpuProfiler();
  }, seconds * 1000);

  self.agent.on('destroy', function() {
    self.stopCpuProfiler();
  });
};


CpuProfiler.prototype.stopCpuProfiler = function() {
  var self = this;

  if(!self.agent.nodetimeNative || !self.active) return;

  var nodes = {};
  var root = undefined;
  var rootSamplesCount = undefined;

  self.agent.nodetimeNative.stopV8Profiler(function(parentCallUid, callUid, totalSamplesCount, functionName, scriptResourceName, lineNumber) {
    if(rootSamplesCount === undefined)
      rootSamplesCount = totalSamplesCount;

    var cpuUsage = ((totalSamplesCount * 100) / rootSamplesCount || 1);
    var obj = {
      _totalSamplesCount: totalSamplesCount,
      _functionName: functionName,
      _scriptResourceName: scriptResourceName,
      _lineNumber: lineNumber,
      _cpuUsage: cpuUsage, 
      _id: self.agent.getNextId(),
      _target: [],
      _label: cpuUsage.toFixed(2) + "% - " + functionName
    };

    if(scriptResourceName && lineNumber) 
      obj._label += " (" + scriptResourceName + ":" + lineNumber + ")";

    nodes[callUid] = obj;
    if(root === undefined) {
      root = obj;
    }

    if(parentCallUid) {
      var parentNode = nodes[parentCallUid];
      if(parentNode) parentNode._target.push(obj);
    }
  });

  self.agent.logger.log("V8 CPU profiler stopped");

  if(root) {
    var profile = {};
    profile._id = self.agent.getNextId();
    profile._label = os.hostname() + ' [' + process.pid + ']';
    profile._ts = self.agent.system.millis();
    profile._ns = 'cpu-profiles';
    profile.root = root;

    try {
      self.agent.emit('cpuProfile', profile);
    }
    catch(err) {
      self.agent.logger.error(err);
    }
  }


  if(!self.origPaused) {
    self.agent.profiler.resume();
  }

  self.active = false;
};

