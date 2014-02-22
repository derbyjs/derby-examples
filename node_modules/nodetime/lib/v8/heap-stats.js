'use strict';


function HeapStats(agent) {
  this.agent = agent;
}
exports.HeapStats = HeapStats;


HeapStats.prototype.init = function() {
  var self = this;

  self.agent.on('heapSnapshot', function(heapSnapshot) {
    var objs = heapSnapshot['Objects'];
    if(!objs || !Array.isArray(objs)) return;

    var len = objs.length < 6 ? objs.length : 6;
    for(var i = 0; i < len; i++) {
      var obj = objs[i];

      if(obj._name === 'other') {
        continue;
      }

      var objSize = parseFloat(obj['Size (KB)']);
      if(objSize) {
        self.agent.metric(
          'Heap Snapshot', 
          obj._name + '/Size',
          objSize, 
          'KB',
          'setx');
      }

      var objCount = parseInt(obj['Count'])
      if(objCount) {
        self.agent.metric(
          'Heap Snapshot', 
          obj._name + '/Count', 
          objCount, 
          null, 
          'setx');
      }
    }
  });
};