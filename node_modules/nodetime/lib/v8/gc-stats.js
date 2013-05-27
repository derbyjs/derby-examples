'use strict';



function GCStats(agent) {
  this.agent = agent;
}
exports.GCStats = GCStats;



GCStats.prototype.init = function() {
  var self = this;

  if(!self.agent.nodetimeNative) return;

  var mm = self.agent.metricsManager;

  var numFullGC = mm.findOrCreateMetric('Garbage Collection', 'Full GCs per minute', null, 'sum'); 
  var numIncGC = mm.findOrCreateMetric('Garbage Collection', 'Incremental GCs per minute', null, 'sum'); 
  var sizeChange = mm.findOrCreateMetric('Garbage Collection', 'Used heap size change per minute', 'MB', 'sum'); 
  var lastUsedHeapSize = undefined;

  self.agent.nodetimeNative.afterGC(function(gcType, gcFlags, usedHeapSize) {
    if(gcType === 'kGCTypeMarkSweepCompact') {
      numFullGC.addValue(1);
    }
    else if(gcType === 'kGCTypeScavenge') {
      numIncGC.addValue(1);
    }

    if(lastUsedHeapSize !== undefined) {
      sizeChange.addValue((usedHeapSize - lastUsedHeapSize) / 1048576);
    }
    lastUsedHeapSize = usedHeapSize;
  });
};
