var expect = require('expect.js');
var fn = require('../fn');

describe('fn', function () {
  describe('curry', function () {
    var curry = fn.curry;

    it('should work', function () {
      function sum (a, b, c) {
        return a + b + c;
      }
      var addToFive = curry(sum, 5);
      expect(addToFive(10, 20)).to.equal(5 + 10 + 20);
    });

  });

  describe('bind', function () {
    var bind = fn.bind;
    it('should work', function () {
      function greet (name) {
        return this.hello + ', ' + name;
      }
      var pig = { hello: 'oink' };
      var dog = { hello: 'woof' };
      expect(bind(greet, pig)('nate')).to.equal('oink, nate');
      expect(bind(greet, dog)('brian')).to.equal('woof, brian');
    });
  });
});
