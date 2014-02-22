'use strict';

var MongoDBMonitor = require('../monitors/mongodb-monitor').MongoDBMonitor;



var internalCommands = [
  '_executeQueryCommand', 
  '_executeInsertCommand', 
  '_executeUpdateCommand', 
  '_executeRemoveCommand'
];

var commandMap = {
  '_executeQueryCommand': 'find', 
  '_executeInsertCommand': 'insert', 
  '_executeUpdateCommand': 'update', 
  '_executeRemoveCommand': 'remove'
};



function MongodbProbe(agent) {
  this.agent = agent;

  this.packages = ['mongodb'];
}
exports.MongodbProbe = MongodbProbe;



MongodbProbe.prototype.attach = function(obj) {
  var self = this;

  if(obj.__nodetimeProbeAttached__) return;
  obj.__nodetimeProbeAttached__ = true;

  var proxy = self.agent.proxy;
  var profiler = self.agent.profiler;
  var counter = profiler.createSkipCounter();
  var metrics = profiler.createCallMetricsGroups();
  var type = 'MongoDB';


  var mongodbMonitor = new MongoDBMonitor(self.agent);
  mongodbMonitor.init(obj);


  internalCommands.forEach(function(internalCommand) {
    var commandName = commandMap[internalCommand] || internalCommand;

    proxy.before(obj.Db.prototype, internalCommand, function(obj, args) {
      var trace = profiler.stackTrace();
      var command = (args && args.length > 0) ? args[0] : undefined;

      var time = profiler.time(type, commandName);
      metrics.callStart(type, null, time);
      metrics.callStart(type, commandName, time);

      proxy.callback(args, -1, function(obj, args) {
        if(!time.done()) return;
        metrics.callDone(type, null, time);
        metrics.callDone(type, commandName, time);
        if(counter.skip(time)) return;

        var conn = {};
        if(command && command.db) {
          var auth;
          if(command.db.auths && command.db.auths.length > 0) {
            auth = command.db.auths[0];
          }

          var serverConfig = command.db.serverConfig;
          if(serverConfig) {
            if(serverConfig.host && serverConfig.port) {
              conn.host = serverConfig.host;
              conn.port = serverConfig.port;

              mongodbMonitor.monitorCollection(
                serverConfig.host, 
                serverConfig.port, 
                command.db.databaseName, 
                command.collectionName,
                auth
              );
            }
            else if(Array.isArray(serverConfig.servers)) {
              conn.servers = [];
              serverConfig.servers.forEach(function(server) {
                conn.servers.push({host: server.host, port: server.port});

                mongodbMonitor.monitorCollection(
                  server.host,
                  server.port,
                  command.db.databaseName, 
                  command.collectionName,
                  auth
                );
              }); 
            }
          }
          
          conn.database = command.db.databaseName;
        }

        var query = command.query ? profiler.truncate(JSON.stringify(command.query)) : '{}';
        var error = proxy.getErrorMessage(args);

        var sample = profiler.createSample();
        sample['Type'] = type;
        sample['Connection'] = conn;
        sample['Command'] = {
          collectionName: command.collectionName, 
          commandName: commandName, 
          query: query, 
          queryOptions: command.queryOptions, 
          numberToSkip: command.numberToSkip,
          numberToReturn: command.numberToReturn};
        sample['Stack trace'] = trace;
        sample['Error'] = error;
        sample._group = type + ': ' + commandName;
        sample._label = type + ': ' + commandName;

        profiler.addSample(time, sample);
      });
    });
  });
};

