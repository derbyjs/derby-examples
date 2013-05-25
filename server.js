var http = require('http');
var express = require('express');
require('coffee-script');

var expressApp = express();
var server = http.createServer(expressApp);

expressApp
  .use(express.vhost('chat.derbyjs.com', require('./chat')))
  .use(express.vhost('directory.derbyjs.com', require('./directory')))
  .use(express.vhost('hello.derbyjs.com', require('./hello')))
  .use(express.vhost('sink.derbyjs.com', require('./sink')))
  // .use(express.vhost('todos.derbyjs.com', require('./todos')))
  // .use(express.vhost('widgets.derbyjs.com', require('./widgets')))

var port = process.env.PORT || 3000;
server.listen(port, function() {
  console.log('Go to: http://localhost:%d/', port);
});
