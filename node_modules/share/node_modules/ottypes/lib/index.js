
var register = function(type) {
  exports[type.name] = type;
  if (type.uri) {
    return exports[type.uri] = type;
  }
};

// Import all the built-in types. Requiring directly rather than in register()
// so browserify works.
register(require('./simple'));

register(require('./text'));
register(require('./text-tp2'));

register(require('./json0'));

