var StatsDClient = require('../lib/statsd-client'),
    EventEmitter = require('events').EventEmitter,
    assert = require('chai').assert;

/*global describe before it*/

describe('Helpers', function () {
    var c;

    before(function () {
        c = new StatsDClient();
    });

    it('.helpers is an object', function () {
        assert.isObject(c.helpers);
    });

    it('.getExpressMiddleware(prefix) → function (err, res, next)', function () {
        var f = c.helpers.getExpressMiddleware('prefix');
        assert.isFunction(f);
        assert.lengthOf(f, 3);
    });
});
