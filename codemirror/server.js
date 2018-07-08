var codemirror = require('d-codemirror');

var options = {
  port: 8003,
  static: [
    {route: '/codemirror', dir: codemirror.root}
  ]
};
require('derby-starter').run(__dirname, options);
