var node_modules = __dirname + '/../node_modules/';
var cm = node_modules + "d-codemirror/node_modules/codemirror/";

var options = {
  port: 8009,
  static: [
    {route: '/cm', dir: cm },
    {route: '/images', dir: __dirname + '/images'}
  ]
};
process.env.MONGO_DB = "derby-bars"
require('derby-starter').run(__dirname, options); 
