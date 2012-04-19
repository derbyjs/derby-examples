var express, expressApp, hello, http, server;
http = require('http');
express = require('express');
hello = require('./hello');
expressApp = express().use(express.static(__dirname + '/public')).use(hello.router());
server = http.createServer(expressApp).listen(3000);
hello.createStore({
  listen: server
});