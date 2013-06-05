var racer = require('racer');
var BCSocket = require('browserchannel/dist/bcsocket-uncompressed').BCSocket;

racer.Model.prototype._createSocket = function(bundle) {
  var options = bundle.racerBrowserChannel;
  var base = options.base || '/channel';
  if (bundle.mount) base = bundle.mount + base;
  return new BCSocket(base, options);
};
