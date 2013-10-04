var arrayDiff = require('./index');

var before = [0, 1, 2, 3];
var after = ['1', '2', 4, 5, 0];

// Compares with `===` by default
var diff = arrayDiff(before, after);
console.log('\nStandard diff:');
for (var i = 0; i < diff.length; i++) {
  var item = diff[i];
  console.log(item.type, item);
}

// A custom equality method is optional
var diff = arrayDiff(before, after, function(a, b) {
  return a == b;
});
console.log('\nFuzzy equality diff:');
for (var i = 0; i < diff.length; i++) {
  var item = diff[i];
  console.log(item.type, item);
}
