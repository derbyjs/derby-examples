// In an actual app you may want to npm install codemirror (or use bower)
var node_modules = __dirname + '/../node_modules/';
var cm = node_modules + "d-codemirror/node_modules/codemirror/";
var showdown = node_modules + "d-showdown/node_modules/showdown/compressed";

require('derby-starter').run(__dirname, {static: [{route: '/cm', dir: cm + 'lib'}, {route: '/md', dir: cm + 'mode/markdown'}, {route: '/showdown', dir: showdown}]});
