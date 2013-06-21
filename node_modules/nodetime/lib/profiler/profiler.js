'use strict';


var Time = require('../core/time').Time;
var Sample = require('./sample').Sample;
var SkipCounter = require('./skip-counter').SkipCounter;
var CallMetrics = require('./call-metrics').CallMetrics;
var CallMetricsGroups = require('./call-metrics-groups').CallMetricsGroups;
var PredicateFilter = require('./filter/predicate-filter').PredicateFilter;
var FilterKeyExtractor = require('./filter/filter-key-extractor').FilterKeyExtractor;

/*
 * Trasaction profiler is responsible for managing the sampling process:
 * pausing and resuming sampling, finding related operations, 
 * emitting samples and providing api for probes to create samples.
 */

function Profiler(agent) {
  this.agent = agent;

  this.enabled = false;
  this.paused = true;
  this.pauseAt = undefined;
  this.filterFunc = undefined;
  this.filterOptions = undefined;

  this.info = undefined;
  this.state = {};
  this.transactions = {};
  this.stackTraceCalls = 0;
  this.stackTraceFilter = /nodetime/;
  this.stackTraceLimit = agent.stackTraceLimit;
  this.stackTraceLimit = undefined;

  this.filterKeyExtractor = new FilterKeyExtractor(this.agent);
}
exports.Profiler = Profiler;


Profiler.prototype.init = function() {
  var self = this;

  self.enabled = self.agent.features.transactionProfiler;
  this.stackTraceLimit = self.agent.stackTraceLimit;

  self.agent.on('info', function(info) {
    self.info = info;
  });

  self.agent.on('metric', function(metric) {
    if(!self.state[metric.scope]) self.state[metric.scope] = {};
    self.state[metric.scope][metric.name + (metric.unit ? ' (' + metric.unit + ')' : '')] = metric.value;
  });
  

  // cleanup transactions
  self.agent.timers.setInterval(function() {
    // expire transactions older than 5 minunes, which have not ended
    var now = Date.now();
    for(var threadId in self.transactions) {
      if(self.transactions[threadId].started + 300000 < now) {
        delete self.transactions[threadId];
      }
    }
  }, 5000);


  // init sample field sender
  self.filterKeyExtractor.init();


  // listen for server commands
  self.agent.on('command', function(command, args) {
    switch(command) {
      case 'pause':
        self.pause();
        break;
      
      case 'resume':
        self.resume();
        break;

      case 'filter':
        self.filter(args)
        break;
    }
  });


  // pause profiler when destroyed
  self.agent.on('destroy', function() {
    if(!self.paused) {
      self.pause();
    }
  });


  // autopause profiler if not paused explicitly
  self.agent.timers.setInterval(function() {
    if(!self.paused && Date.now() > self.pauseAt) 
      self.pause(); 
  }, 1000);
}



Profiler.prototype.pause = function(keepState) {
  var self = this;

  this.paused = true;
 
  if(!keepState) {
    self.pauseAt = undefined;
    self.filterFunc = undefined;
    self.filterOptions = undefined;
  }

  try {
    self.agent.emit('pause');
    self.agent.logger.log('profiler paused');
  }
  catch(err) {
    self.agent.logger.error(err);
  }
};



Profiler.prototype.resume = function(seconds) {
  if(!seconds) seconds = 180;

  this.pauseAt = Date.now() + seconds * 1000;
  this.paused = false;

  try {
    this.agent.emit('resume', seconds);
    this.agent.logger.log('profiler resumed for ' + seconds + ' seconds');
  }
  catch(err) {
    self.agent.logger.error(err);
  }
};



Profiler.prototype.filter = function(filterOptions) {
  var self = this;

  if(filterOptions) {
    var pf = new PredicateFilter();
    if(pf.preparePredicates(filterOptions)) {
      self.filterFunc = function(sample) {
        return pf.filter(sample);
      };
      self.filterOptions = filterOptions;
    }
  }
  else {
    self.filterFunc = undefined;
    self.filterOptions = undefined;
  }
};


Profiler.prototype.createCallMetrics = function(scope, group) {
  var callMetrics = new CallMetrics(this.agent);
  callMetrics.init(scope, group);

  return callMetrics;
}; 


Profiler.prototype.createCallMetricsGroups = function(scope, groups) {
  return new CallMetricsGroups(this.agent);
}; 


Profiler.prototype.time = function(scope, group, isRoot) {
  var t =  new Time(this.agent, scope, group, isRoot);
  t.start();

  return t;
}; 


Profiler.prototype.stackTrace = function() {
  if(this.paused || this.stackTraceCalls++ > this.stackTraceLimit) {
    return undefined;
  }

  var err = new Error();
  Error.captureStackTrace(err);

  return this.formatStackTrace(err);
};


Profiler.prototype.formatStackTrace = function(err) {
  var self = this;

  if(err && err.stack) {
    var lines = err.stack.split("\n");
    lines.shift();
    lines = lines.filter(function(line) {
      return !self.stackTraceFilter.exec(line)
    });

    return lines; 
  }

  return undefined;
};


Profiler.prototype.createSample = function() {
  return new Sample();
};


Profiler.prototype.createSkipCounter = function() {
  var skipCounter = new SkipCounter(this.agent);
  skipCounter.init();
  return skipCounter;
};


Profiler.prototype.startTransaction = function(time) {
  var self = this;

  self.transactions[time.threadId] = {
    operations: [],
    started: Date.now()
  };
}


Profiler.prototype.endTransaction = function(time) {
  delete this.transactions[time.threadId];
}



Profiler.prototype.addSample = function(time, sample) {
  var self = this;

  if(!self.enabled) {
    return;
  }

  process.nextTick(function() {
    try {
      self._addSample(time, sample);
    }
    catch(err) {
      self.agent.logger.error(err);
    }
  });
};


Profiler.prototype._addSample = function(time, sample) {
  var self = this;

  sample._version = self.agent.version;
  sample._ns = 'samples';
  sample._id = time.id;
  sample._isRoot = time.isRoot;
  sample._begin = time.begin;
  sample._end = time.end;
  sample._ms = time.ms;
  sample._ts = time.begin;
  sample._cputime = time.cputime;
  sample._threadId = time.threadId;
  
  if(sample._label.length > 80) sample._label = sample._label.substring(0, 80) + '...';

  sample['Response time (ms)'] = sample._ms;
  sample['Timestamp (ms)'] = sample._ts;
  if(sample._cputime !== undefined) sample['CPU time (ms)'] = sample._cputime;
  if(!sample._isRoot) {
    sample['Bytes read (KB)'] = time.bytesRead / 1024;
    sample['Bytes written (KB)'] = time.bytesWritten / 1024;
  }

  if(sample._isRoot) {
    var transaction = self.transactions[sample._threadId];
    if(transaction) {
      // sort nested operations, slowest first
      transaction.operations = transaction.operations.sort(function(a, b) {
        return b._ms - a._ms;
      });

      sample['Operations'] = transaction.operations.splice(0, 50);
    }
    sample['Node state'] = self.state;
    sample['Node information'] = self.info;

    try {
      if(!self.filterFunc || self.filterFunc(sample)) {
        sample._filtered = true;
      }

      self.agent.emit('sample', sample);
    }
    catch(err) {
      self.agent.logger.error(err);
    }

    self.endTransaction(time);
  }
  else {
    // if there is a started request, buffer its nested operations
    var transaction = self.transactions[sample._threadId];
    if(transaction) {
      transaction.operations.push(sample);
    }

    try {
      if(!self.filterFunc || self.filterFunc(sample)) {
        sample._filtered = true;
      }

      self.agent.emit('sample', sample);
    }
    catch(err) {
      self.agent.logger.error(err);
    }
  }
};


Profiler.prototype.truncate = function(args) {
  if(!args) return undefined;

  if(typeof args === 'string') {
    return (args.length > 80 ? (args.substr(0, 80) + '...') : args); 
  }
  
  if(!args.length) return undefined;

  var arr = [];
  var argsLen = (args.length > 10 ? 10 : args.length); 
  for(var i = 0; i < argsLen; i++) {
   if(typeof args[i] === 'string') {
      if(args[i].length > 80) {
        arr.push(args[i].substr(0, 80) + '...'); 
      }
      else {
        arr.push(args[i]); 
      }
    }
    else if(typeof args[i] === 'number') {
      arr.push(args[i]); 
    }
    else if(args[i] === undefined) {
      arr.push('[undefined]');
    }
    else if(args[i] === null) {
      arr.push('[null]');
    }
    else if(typeof args[i] === 'object') {
      arr.push('[object]');
    }
    if(typeof args[i] === 'function') {
      arr.push('[function]');
    }
  } 

  if(argsLen < args.length) arr.push('...');

  return arr;
};

