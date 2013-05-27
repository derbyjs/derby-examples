'use strict';

/*
 * Use request package if proxy server is specified.
 */ 

var request = require('request');
var zlib = require('zlib');


module.exports = function(options, callback) {
  if(!options.json) {
    return request(options, callback);
  }

  var gzipRequest = {};

  options.headers || (options.headers = {});
  zlib.gzip(JSON.stringify(options.json), function(err, buf) {
    if(err) return callback(err);

    options.body = buf;
    options.headers['Content-type'] = 'application/json';
    options.headers['Content-encoding'] = 'gzip';
    delete options.json;

    var req = request(options, function(err, response, body) {
      if(err) return callback(err);

      if(response.headers['content-encoding'] === 'gzip') {
        zlib.gunzip(body, function(err, buf) {
          if(err) return callback(err);

          if(options.encoding) {
            callback(err, response, buf.toString(options.encoding));
          }
        });
      }
      else {
          callback(err, response, body);
      }
    });

    for(var prop in req) {
      gzipRequest[prop] = req[prop];
    }
  });

  return gzipRequest;
};
