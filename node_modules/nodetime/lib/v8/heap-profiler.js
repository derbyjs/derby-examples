'use strict';


var os = require('os');
var EventEmitter = require('events').EventEmitter;


function HeapProfiler(agent) {
  this.agent = agent;
  
  this.active = false;
}
exports.HeapProfiler = HeapProfiler;


HeapProfiler.prototype.init = function() {
  var self = this;

  // if paused during CPU profiling, do not resume automatically
  self.agent.on('pause', function() {
    self.origPaused = true;
  });


  // listening for command
  self.agent.on('command', function(command, args) {
    if(command === 'takeHeapSnapshot') {
      try {
        self.takeHeapSnapshot();
      }
      catch(err) {
        self.agent.logger.error(err);
        self.active = false;
      }
    }
  });
}



HeapProfiler.prototype.sendError = function(msg) {
  var self = this;

  var obj = {};
  obj._id = self.agent.getNextId();
  obj._label = os.hostname() + ' [' + process.pid + ']';
  obj._ts = self.agent.system.millis();
  obj._ns = 'heap-snapshots';
  obj['Error'] = msg; 

  try {
    self.agent.emit('heapSnapshot', obj);
  }
  catch(err) {
    self.agent.logger.error(err);
  }
}



HeapProfiler.prototype.takeHeapSnapshot = function() {
  var self = this;

  if(!self.agent.nodetimeNative) {
    return self.sendError("V8 tools are not loaded.");
  }

  if(self.active) {
    return self.sendError("Heap profiler is already active.");
  }

  self.active = true;

  self.agent.logger.log("V8 heap profiler starting...");

  var snapshot = {};
  var nodeEmitter = new EventEmitter();

  self.buildRetainerGroups(nodeEmitter, snapshot);
  self.buildObjectGroups(nodeEmitter, snapshot);

  var nodes = {};
  self.agent.nodetimeNative.takeHeapSnapshot(function(parentNodeUid, nodeUid, name, type, selfSize, retainerName, retainerType) {
    if(retainerType === 5) return;

    if(!nodes[nodeUid]) {
      nodes[nodeUid] = true;

      var node = {
        nodeUid: nodeUid,
        name: ((type === 2 || type == 6) && name && name.length > 25) ? 
          name.substring(0, 25) + '...' : 
          name,
        type: type,
        selfSize: selfSize,
        retainerName: retainerName,
        retainerType: retainerType,
        parents: {},
        children: []
      };

      nodeEmitter.emit('node', node);
    }
  });


  self.agent.logger.log("V8 heap profiler stopped");

  snapshot._id = self.agent.getNextId();
  snapshot._label = os.hostname() + ' [' + process.pid + ']';
  snapshot._ts = self.agent.system.millis();
  snapshot._ns = 'heap-snapshots';
  snapshot['Retainers'] = undefined;
  snapshot['Objects'] = undefined;

  nodeEmitter.emit('done');
  nodeEmitter.removeAllListeners();

  try {  
    self.agent.emit('heapSnapshot', snapshot);
  }
  catch(err) {
    self.agent.logger.error(err);
  }

  self.active = false;
};



HeapProfiler.prototype.buildRetainerGroups = function(nodeEmitter, snapshot) {
  var self = this;

  var groups = {};
  var totalSize = 0;
  var totalCount = 0;

  nodeEmitter.on('node', function(node) {
    var key = genRetainerKey(node);
    var obj = groups[key];
    if(!obj) {
      obj = groups[key] = {
        _id: self.agent.getNextId(),
        _label: genRetainerLabel(node),
        _size: 0, 
        _count: 0,
        _largestInstances: [],
        _minInstanceSize: 0,
        _randomInstances: []
      };
    }

    if(!obj._largestInstances) {
      return; // something is wrong here
    }

    obj._size += node.selfSize;
    obj._count++;

    var large = (node.selfSize > obj._minInstanceSize || obj._largestInstances.length < 10);
    var random = (obj._count % Math.pow(10, Math.floor(Math.log(obj._count) / Math.LN10)) == 0);
    if(large || random) {
      var instance = {
        _id: self.agent.getNextId(),
        _label: genNodeLabel(node),
        _selfSize: node.selfSize,
        'Name': node.name,
        'Type': nodeTypeToString(node.type),
        'Size (KB)': (node.selfSize / 1024).toFixed(3)
      };

      if(large) {
        obj._largestInstances.push(instance);

        obj._largestInstances = obj._largestInstances.sort(function(a, b) {
          return b._selfSize - a._selfSize;
        });

        obj._largestInstances.splice(10);
        obj._minInstanceSize = obj._largestInstances[obj._largestInstances.length - 1]._selfSize;
      }

      if(random) {
        obj._randomInstances.unshift(instance);
        obj._randomInstances.splice(10);
      }
    }

    totalSize += node.selfSize;
    totalCount++;
  });


  nodeEmitter.on('done', function() {
    // sort groups
    var groupsOrdered = [];
    for(var key in groups) {
      groupsOrdered.push(groups[key]);
    }
    groupsOrdered = groupsOrdered.sort(function(a, b) {
      return b._size - a._size;
    });
    groupsOrdered.splice(25);


    // prepare for rendering
    for(var key in groups) {
      var obj = groups[key];

      obj['Size (KB)'] = (obj._size / 1024).toFixed(3);
      if(totalSize > 0) obj['Size (%)'] = Math.round((obj._size / totalSize) * 100);
      obj._label = obj['Size (%)'] + "% - " + obj._label;

      obj['Count'] = obj._count;
      if(totalCount > 0) obj['Count (%)'] = Math.round((obj._count / totalCount) * 100);

      obj['Largest instances'] = obj._largestInstances;
      obj['Random instances'] = obj._randomInstances;
      
      delete obj._size;
      delete obj._count;
      delete obj._largestInstances;
      delete obj._minInstanceSize;
      delete obj._randomInstances;
    }

    snapshot['Retainers'] = groupsOrdered;
  });
}


HeapProfiler.prototype.buildObjectGroups = function(nodeEmitter, snapshot) {
  var self = this;

  var groups = {};
  var totalSize = 0;
  var totalCount = 0;

  nodeEmitter.on('node', function(node) {
    var key = genObjectKey(node);
    var obj = groups[key];
    if(!obj) {
      obj = groups[key] = {
        _id: self.agent.getNextId(),
        _label: key,
        _size: 0, 
        _count: 0,
        _largestInstances: [],
        _minInstanceSize: 0,
        _randomInstances: []
      };
    }

    if(!obj._largestInstances) {
      return; // something is wrong here
    }

    obj._size += node.selfSize;
    obj._count++;

    var large = (node.selfSize > obj._minInstanceSize || obj._largestInstances.length < 10);
    var random = (obj._count % Math.pow(10, Math.floor(Math.log(obj._count) / Math.LN10)) == 0);
    if(large || random) {
      var instance = {
        _id: self.agent.getNextId(),
        _label: genNodeLabel(node),
        _selfSize: node.selfSize,
        'Name': node.name,
        'Type': nodeTypeToString(node.type),
        'Size (KB)': (node.selfSize / 1024).toFixed(3)
      };

      if(large) {
        obj._largestInstances.push(instance);

        obj._largestInstances = obj._largestInstances.sort(function(a, b) {
          return b._selfSize - a._selfSize;
        });

        obj._largestInstances.splice(10);
        obj._minInstanceSize = obj._largestInstances[obj._largestInstances.length - 1]._selfSize;
      }

      if(random) {
        obj._randomInstances.unshift(instance);
        obj._randomInstances.splice(10);
      }
    }

    totalSize += node.selfSize;
    totalCount++;
  });


  nodeEmitter.on('done', function() {
    // sort groups
    var groupsOrdered = [];
    for(var key in groups) {
      groupsOrdered.push(groups[key]);
    }
    groupsOrdered = groupsOrdered.sort(function(a, b) {
      return b._size - a._size;
    });
    groupsOrdered.splice(25);


    // prepare for rendering
    for(var key in groups) {
      var obj = groups[key];

      obj['Size (KB)'] = (obj._size / 1024).toFixed(3);
      if(totalSize > 0) obj['Size (%)'] = Math.round((obj._size / totalSize) * 100);
      obj._name = obj._label;
      obj._label = obj['Size (%)'] + "% - " + obj._label;

      obj['Count'] = obj._count;
      if(totalCount > 0) obj['Count (%)'] = Math.round((obj._count / totalCount) * 100);

      obj['Largest instances'] = obj._largestInstances;
      obj['Random instances'] = obj._randomInstances;
      
      delete obj._size;
      delete obj._count;
      delete obj._largestInstances;
      delete obj._minInstanceSize;
      delete obj._randomInstances;
    }

    snapshot['Objects'] = groupsOrdered;
  });
}



function genObjectKey(node) {
  switch(node.type) {
    case 1: 
      return 'Array';
    case 2: 
      return 'String';
    case 3: 
      return node.name;
    case 4: 
      return 'compiled code';
    case 5: 
      return 'Function';
    case 6: 
      return 'RegExp';
    case 7: 
      return 'Number';
    case 8: 
      return node.name;
    default:
      return 'other';
  }
}


function genRetainerKey(node) {
  if(node.retainerType == 0 || node.retainerType == 2) {
    return edgeTypeToString(node.retainerType) + ':' + node.retainerName;
  }
  else {
    return edgeTypeToString(node.retainerType);
  }
}


function genRetainerLabel(node) {
  switch(node.retainerType) {
    case 0: 
      return 'Variable: ' + node.retainerName;
    case 1: 
      return 'Array elements';
    case 2: 
      return 'Property: ' + node.retainerName;
    case 4: 
      return 'Hidden links';
    case 6:
      return 'Weak references';
    default:
      return 'Other';
  }
}


function truncate(obj, len) {
  if(!obj) return undefined;
  
  if(typeof(obj) === 'string') {
    if(obj.length > len) {
      return obj.substring(0, len) + '...';
    }
    else {
      return obj;
    }
  }
  else if(typeof(obj) === 'number') {
    return obj;
  }
}


function genNodeLabel(node) {
  var name = truncate(node.name, 25);
  return nodeTypeToString(node.type) + (name ? (": " + name) : "");
}



function edgeTypeToString(type) {
  switch(type) {
    case 0: 
      return 'variable';
    case 1: 
      return 'element';
    case 2: 
      return 'property';
    case 3: 
      return 'internal';
    case 4: 
      return 'hidden';
    case 5: 
      return 'shortcut';
    case 6:
      return 'weak';
    default:
      return 'other';
  }
}

function nodeTypeToString(type) {
  switch(type) {
    case 0: 
      return 'hidden';
    case 1: 
      return 'array';
    case 2: 
      return 'string';
    case 3: 
      return 'object';
    case 4: 
      return 'compiled code';
    case 5: 
      return 'function clojure';
    case 6: 
      return 'regexp';
    case 7: 
      return 'heap number';
    case 8: 
      return 'native object';
    default:
      return 'other';
  }
}


