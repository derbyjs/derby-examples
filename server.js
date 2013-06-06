var http = require('http');
var express = require('express');
var fs = require('fs');
require('coffee-script');

require('webkit-devtools-agent');
if (process.env.NODETIME_ACCOUNT_KEY) {
  require('nodetime').profile({
    accountKey: process.env.NODETIME_ACCOUNT_KEY
  , appName: 'derby-examples'
  });
}

var expressApp = express();
var server = http.createServer(expressApp);

var port = process.env.PORT || 3000;
express.logger.token('port', function(req, res) { return port; });

var isReady = true;

expressApp
  .use('/_check', function(req, res) {
    if (isReady)
      res.send('OK');
    else
      res.send(503);
  })
  .use(express.logger({
    format: ':port :remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":user-agent" - :response-time ms',
    stream: fs.createWriteStream('reqlog.txt', {flags:'a', encoding:'utf8', mode:0666})
  }))
  .use(express.vhost('chat.derbyjs.com', require('./chat')))
  .use(express.vhost('directory.derbyjs.com', require('./directory')))
  .use(express.vhost('hello.derbyjs.com', require('./hello')))
  .use(express.vhost('sink.derbyjs.com', require('./sink')))
  .use(express.vhost('todos.derbyjs.com', require('./todos')))
  .use(express.vhost('widgets.derbyjs.com', require('./widgets')))

server.listen(port, function() {
  console.log('%d listening. Go to: http://localhost:%d/', process.pid, port);
});

process.on('uncaughtException', function(err) {
  console.log('Uncaught exception: ' + err.stack);
});

process.on('SIGUSR2', function() {
  isReady = false;
});
