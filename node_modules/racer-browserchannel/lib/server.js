var Duplex = require('stream').Duplex;
var browserChannel = require('browserchannel').server;

// Pass in pass through stream
module.exports = function(store, options) {
  if (!options) options = {};
  if (options.reconnect == null) options.reconnect = true;

  store.on('model', function(model) {
    model.on('bundle', function(bundle) {
      bundle.racerBrowserChannel = options;
    });
  });

  store.on('bundle', function(browserify) {
    browserify.add(__dirname + '/browser');
  });

  var middleware = browserChannel(options, function(client, connectRequest) {
    var rejected = false;
    var rejectReason;
    function reject(reason) {
      rejected = true;
      if (reason) rejectReason = reason;
    }
    store.emit('client', client, reject);
    if (rejected) {
      // Tell the client to stop trying to connect
      client.stop(function() {
        client.close(rejectReason);
      });
      return;
    }
    var stream = createBrowserChannelStream(client, store.logger);
    store.shareClient.listen(stream, connectRequest);
  });
  return middleware;
};

/**
 * @param {EventEmitters} client is a browserchannel client session for a given
 * browser window/tab that is has a connection
 * @return {Duplex} stream
 */
function createBrowserChannelStream(client, logger) {
  var stream = new Duplex({objectMode: true});

  stream._write = function _write(chunk, encoding, callback) {
    // Silently drop messages after the session is closed
    if (client.state !== 'closed') {
      client.send(chunk);
      if (logger) {
        logger.write({type: 'S->C', chunk: chunk, client: client});
      }
    }
    callback();
  };
  // Ignore. You can't control the information, man!
  stream._read = function _read() {};

  client.on('message', function onMessage(data) {
    // Ignore Racer channel messages
    if (data && data.racer) return;
    stream.push(data);
    if (logger) {
      logger.write({type: 'C->S', chunk: data, client: client});
    }
  });

  stream.on('error', function onError() {
    client.stop();
  });

  return stream;
}
