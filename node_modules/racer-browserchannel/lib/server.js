var Duplex = require('stream').Duplex;
var browserChannel = require('browserchannel').server;

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

  var middleware = browserChannel(options, function(client) {
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
    var stream = createBrowserChannelStream(client);
    store.shareClient.listen(stream);
  });
  return middleware;
};

function createBrowserChannelStream(client) {
  var stream = new Duplex({objectMode: true});

  stream._write = function _write(chunk, encoding, callback) {
    client.send(chunk);
    callback();
  };
  // Ignore. You can't control the information, man!
  stream._read = function _read() {};

  client.on('message', function onMessage(data) {
    // Ignore Racer channel messages
    if (data && data.racer) return;
    stream.push(data);
  });

  stream.on('error', function onError() {
    client.stop();
  });

  return stream;
}
