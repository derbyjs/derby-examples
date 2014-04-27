// In an actual app you may want to npm install codemirror (or use bower)
var cm = __dirname + '/../node_modules/d-codemirror/node_modules/codemirror'

require('derby-starter').run(__dirname, {static: cm + '/lib'});
