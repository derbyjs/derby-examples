/* Test the Ephemeral socket
 */

var EphemeralSocket = require('../lib/EphemeralSocket'),
    FakeServer = require('./FakeServer'),
    assert = require('chai').assert;

/*global describe before it after*/

describe('EphemeralSocket', function () {
    var s, e;

    before(function (done) {
        s = new FakeServer();
        e = new EphemeralSocket();

        s.start(done);
    });

    after(function () {
        s.stop();
    });

    it("Respects host-configuration", function (done) {
        var w = new EphemeralSocket({host: 'some_other_host.sbhr.dk'});
        w.send('wrong_message');

        setTimeout(function () {
            assert.lengthOf(s._packetsReceived, 0);
            done();
        }, 25);
    });

    it("Sends data immediately with maxBufferSize = 0", function (done) {
        var withoutBuffer = new EphemeralSocket({maxBufferSize: 0}),
            start = Date.now();

        withoutBuffer.send('do_not_buffer');

        s.expectMessage('do_not_buffer', function (err) {
            assert.closeTo(Date.now() - start, 0, 5);
            withoutBuffer.close();
            done(err);
        });
    });

    it("Doesn't send data immediately with maxBufferSize > 0", function (done) {
        var withBuffer = new EphemeralSocket({socketTimeout: 25});
        withBuffer.send('buffer_this');
        var start = Date.now();

        s.expectMessage('buffer_this', function (err) {
            assert.operator(Date.now() - start, '>=', 25);
            withBuffer.close();
            done(err);
        });
    });

    it("Send 500 messages", function (done) {
        this.slow(500);

        // Send messages
        for (var i = 0; i < 500; i += 1) {
            e.send('foobar' + i);
        }
        e.close();

        setTimeout(function () {
            // Received some packets
            assert.closeTo(
                s._packetsReceived.length,
                500, // Should get 500
                5 // ±5
            );
            s._packetsReceived = [];
            return done();
        }, 25);
    });

    it("Closes _socket when 'error' is emitted", function (done) {
        e._createSocket(function () {
            // Emit error, wait some and check.
            e._socket.emit('error');
            setTimeout(function () {
                assert(!e._socket, "Socket isn't closed.");
                done();
            }, 10);
        });
    });

    it("Does not crash when many errors are emitted", function (done) {
        var s = new EphemeralSocket();
        s._createSocket(function () {
            function emitError() {
                if (s._socket) {
                    s._socket.emit('error');
                    process.nextTick(emitError);
                }
            }
            emitError();

            setTimeout(function () {
                assert(!s._socket, "Socket isn't closed.");
                done();
            }, 5);
        });
    });

    describe("Socket timeout", function () {
        var te;
        before(function (done) {
            te = new EphemeralSocket({
                socketTimeout: 1
            });
            te._createSocket(done);
        });

        it("Is open → sleep 10ms → closed", function (done) {
            assert(te._socket, "Socket isn't open; should be.");
            setTimeout(function () {
                assert(!te._socket, "Socket is open; shouldn't be.");
                done();
            }, 15);
        });
    });
});
