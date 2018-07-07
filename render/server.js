var codemirror = require('d-codemirror');

var options = {
  port: 8009,
  static: [
    {route: '/codemirror', dir: codemirror.root},
    {route: '/images', dir: __dirname + '/images'}
  ]
};
require('derby-starter').run(__dirname, options);
