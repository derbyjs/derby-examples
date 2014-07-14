var http = require('http');
var express = require('express');
var fs = require('fs');
require('coffee-script/register');

//Docker related configuration, can disregard if not using Docker
if(process.env.MONGO_PORT_27017_TCP_ADDR != void 0 && process.env.MONGO_PORT_27017_TCP_PORT != void 0) {
  process.env.MONGO_URL = 'mongodb://'+process.env.MONGO_PORT_27017_TCP_ADDR+':'+process.env.MONGO_PORT_27017_TCP_PORT+'/';
}
if(process.env.REDIS_PORT_27017_TCP_ADDR != void 0 && process.env.REDIS_PORT_27017_TCP_PORT != void 0) {
  process.env.REDIS_HOST = process.env.REDIS_PORT_27017_TCP_ADDR;
  process.env.REDIS_PORT = process.env.MONGO_PORT_27017_TCP_PORT;
}

var derbyStarter = require('derby-starter/lib/server');

var expressApp = express();
var server = http.createServer(expressApp);

var port = process.env.PORT || 3000;
express.logger.token('port', function(req, res) { return port; });

var isReady = true;


expressApp
  .use('/_check', function(req, res) {
    res.send(isReady ? 'OK' : 503);
  })
  .use(express.logger({
    format: ':port :remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":user-agent" - :response-time ms',
    stream: fs.createWriteStream('reqlog.txt', {flags:'a', encoding:'utf8', mode:0666})
  }))

derbyStarter.setup(require('./chat'), {static: __dirname + '/chat/public'}, function(err, app) {
  console.log("chat")
  expressApp.use(express.vhost('chat.derbyjs.com', app))
})
derbyStarter.setup(require('./directory'), {}, function(err, app) {
  console.log("directory")
  expressApp.use(express.vhost('directory.derbyjs.com', app ))
})
derbyStarter.setup(require('./hello'), {}, function(err, app) {
  console.log("hello")
  expressApp.use(express.vhost('hello.derbyjs.com', app ))
})
derbyStarter.setup(require('./sink/src'), {}, function(err, app) {
  console.log("sink")
  expressApp.use(express.vhost('sink.derbyjs.com', app ))
})
derbyStarter.setup(require('./todos'), {}, function(err, app) {
  console.log("todos")
  expressApp.use(express.vhost('todos.derbyjs.com', app ))
})
derbyStarter.setup(require('./widgets'), {}, function(err, app) {
  console.log("widgets")
  expressApp.use(express.vhost('widgets.derbyjs.com', app ))
})

server.listen(port, function() {
  console.log('%d listening. Go to: http://localhost:%d/', process.pid, port);
});

process.on('uncaughtException', function(err) {
  console.log('Uncaught exception: ' + err.stack);
});

process.on('SIGUSR2', function() {
  isReady = false;
});
