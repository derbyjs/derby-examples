'use strict';


function MysqlProbe(agent) {
  this.agent = agent;

  this.packages = ['mysql'];
}
exports.MysqlProbe = MysqlProbe;



MysqlProbe.prototype.attach = function(obj) {
  var self = this;

  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;
  var profiler = self.agent.profiler;
  var counter = profiler.createSkipCounter();
  var metrics = profiler.createCallMetricsGroups();
  var type = 'MySQL';

  ['createClient', 'createConnection'].forEach(function(createCmd) {
    proxy.after(obj, createCmd, function(obj, args, ret) {
      var client = ret;
      var config = (createCmd === 'createClient' ? client : client.config);
      if(!config) return;

      proxy.before(client, 'query', function(obj, args) {
        var trace = profiler.stackTrace();
        var command = args.length > 0 ? args[0] : undefined;
        var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
        var time = profiler.time(type, "query");
        metrics.callStart(type, null, time);

        proxy.callback(args, -1, function(obj, args) {
          if(!time.done(proxy.hasError(args))) return;
          metrics.callDone(type, null, time);
          if(counter.skip(time)) return;

          var error = proxy.getErrorMessage(args);
          var sample = profiler.createSample();
          sample['Type'] = type;
          sample['Connection'] = {
            host: config.host, 
            port: config.port, 
            user: config.user, 
            database: config.database !== '' ? config.database : undefined};
          sample['Command'] = profiler.truncate(command);
          sample['Arguments'] = profiler.truncate(params);
          sample['Stack trace'] = trace;
          sample['Error'] = error;
          sample._group = type + ': ' + 'query';
          sample._label = type + ': ' + sample['Command'];

          profiler.addSample(time, sample);
        });
      });
    });
  });
};

