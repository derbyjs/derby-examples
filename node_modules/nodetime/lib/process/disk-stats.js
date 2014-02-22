'use strict';


var os = require('os');
var childProcess = require('child_process');

/*
 * Sending process related data as metrics.
 */

function DiskStats(agent) {
  this.agent = agent;

  this.headerRegexLinux = undefined;
  this.mountRegexLinux = undefined;

  this.headerRegexOSX = undefined;
  this.mountRegexOSX = undefined;
}
exports.DiskStats = DiskStats;


DiskStats.prototype.init = function() {
  var self = this;

  self.headerRegex = /^(Filesystem)\s+(\w+-blocks)\s+(Used)\s+(Available)\s/;
  self.mountRegex = /^\/dev\/([^\s]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+/;

  self.agent.timers.setInterval(function() {
    self.collectMetrics();
  }, 60000);

  self.collectMetrics();
};


DiskStats.prototype.collectMetrics = function() {
  var self = this;

  var hostname = os.hostname();

  childProcess.exec('df -k', function(err, stdout, stderr) {
    try {
      if(err) return self.agent.logger.error(err);

      var lines = stdout.split('\n');
      if(lines.length == 0) return;

      if(!self.headerRegex.exec(lines[0])) return;

      for(var i = 1; i < lines.length; i++) {
        var mount = {};

        var mountMatch = self.mountRegex.exec(lines[i]);
        if(mountMatch && mountMatch.length == 5) {
          mount.device = mountMatch[1];
          mount.used = parseInt(mountMatch[3]) / 1024;
          mount.available = parseInt(mountMatch[4]) / 1024;
        }

        if(mount.device && mount.used !== undefined && mount.available !== undefined) {
          var total = mount.used + mount.available;

          self.agent.metric('Disks/' + hostname + '/' + mount.device, 'Total space', total, 'MB', 'set');
          self.agent.metric('Disks/' + hostname + '/' + mount.device, 'Used space', mount.used, 'MB', 'set');
        }
      }
    }
    catch(err) {
      self.agent.logger.error(err);
    }
  });
};

