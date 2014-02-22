var StatsDClient = require('../lib/statsd-client'),
    FakeServer = require('./FakeServer'),
    assert = require('chai').assert;

/*global describe before it after*/

describe('StatsDClient', function () {
    describe('Namespaces', function () {
        it('test → test.', function () {
            assert.equal(new StatsDClient({prefix: 'test'}).options.prefix, 'test.');
        });

        it('test. → test.', function () {
            assert.equal(new StatsDClient({prefix: 'test.'}).options.prefix, 'test.');
        });
    });

    var s, c;

    before(function (done) {
        s = new FakeServer();
        c = new StatsDClient({
            maxBufferSize: 0
        });
        s.start(done);
    });

    after(function () {
        s.stop();
    });

    describe("Counters", function () {
        it('.counter("abc", 1) → "abc:1|c', function (done) {
            c.counter('abc', 1);
            s.expectMessage('abc:1|c', done);
        });

        it('.counter("abc", -5) → "abc:-5|c', function (done) {
            c.counter('abc', -5);
            s.expectMessage('abc:-5|c', done);
        });

        it('.increment("abc") → "abc:1|c', function (done) {
            c.increment('abc');
            s.expectMessage('abc:1|c', done);
        });

        it('.increment("abc", 10) → "abc:10|c', function (done) {
            c.increment('abc', 10);
            s.expectMessage('abc:10|c', done);
        });

        it('.decrement("abc", -2) → "abc:-2|c', function (done) {
            c.decrement('abc', -2);
            s.expectMessage('abc:-2|c', done);
        });

        it('.decrement("abc", 3) → "abc:-3|c', function (done) {
            c.decrement('abc', -3);
            s.expectMessage('abc:-3|c', done);
        });
    });

    describe('Gauges', function () {
        it('.gauge("gauge", 3) → "gauge:-3|g', function (done) {
            c.gauge('gauge', 3);
            s.expectMessage('gauge:3|g', done);
        });
    });

    describe('Sets', function () {
        it('.set("foo", 10) → "foo:10|s', function (done) {
            c.set('foo', 10);
            s.expectMessage('foo:10|s', done);
        });
    });

    describe('Timers', function () {
        it('.timing("foo", 10) → "foo:10|ms', function (done) {
            c.timing('foo', 10);
            s.expectMessage('foo:10|ms', done);
        });

        it('.timing("foo", new Date(-20ms)) ~→ "foo:20|ms"', function (done) {
            this.slow(100);
            var d = new Date();
            setTimeout(function () {
                c.timing('foo', d);

                setTimeout(function () {
                    // Figure out if we git a right-looking message
                    var sentMessages = s._packetsReceived;
                    assert.lengthOf(sentMessages, 1);
                    assert.match(
                        sentMessages[0],
                        /foo:[12]\d\|ms/
                    );

                    // Expect it anyway, as we need to clean up the packet list.
                    s.expectMessage(sentMessages[0], done);
                }, 10);
            }, 20);
        });
    });
});
