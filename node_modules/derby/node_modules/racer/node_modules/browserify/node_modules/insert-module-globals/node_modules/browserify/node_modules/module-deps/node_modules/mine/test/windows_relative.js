var test = require('tap').test;
var mine = require('../');
var fs = require('fs');
var src = fs.readFileSync(__dirname + '/files/windows_relative.js');

test('windows_relative', function(t) {
  t.plan(1);
  t.deepEqual(mine(src), [
    {name: './a\\b\\c', offset: 17}
  ]);
});
