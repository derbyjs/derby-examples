// In an actual app you may want to npm install codemirror (or use bower)
var node_modules = __dirname + '/../node_modules/';
var cm = node_modules + "d-codemirror/node_modules/codemirror/";
var showdown = node_modules + "d-showdown/node_modules/showdown/compressed";

var options = {
  port: 8003,
  static: [
    {route: '/cm', dir: cm },
    {route: '/showdown', dir: showdown}
  ]
};
require('derby-starter').run(__dirname, options);
