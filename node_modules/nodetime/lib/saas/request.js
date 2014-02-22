var http = require('http');
var https = require('https');
var url = require('url');
var zlib = require('zlib');


module.exports = function(opts, callback) {
  var parts = url.parse(opts.url);

  var requestOpts = {
    hostname: parts.hostname,
    port: parts.port,
    path: parts.path,
    method: opts.method,
    headers: opts.headers || {}
  };

  requestOpts.headers['Content-type'] = 'application/json';
  if(opts.json) {
    requestOpts.headers['Content-encoding'] = 'gzip';
  }

  var body = '';
  var req = (parts.protocol === 'http:' ? http : https).request(requestOpts, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      callback(null, res, body);
    });
  });

  if(opts.timeout) {
    req.setTimeout(opts.timeout, function() {
      callback(new Error('request timeout'));
    });
  }

  req.on('error', function(err) {
    callback(err);
  });

  if(opts.json) {
    zlib.gzip(JSON.stringify(opts.json), function(err, compressed) {
      if(err) return callback(err);

      req.write(compressed);
      req.end();
    });
  }
  else {
    req.end();
  }

};

