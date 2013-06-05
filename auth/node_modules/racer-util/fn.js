module.exports = {
  curry: curry
, bind: bind
, noop: noop
};

function curry (fn/*, prefix...*/) {
  var prefix = Array.prototype.slice.call(arguments, 1);
  return function () {
    var args = prefix.concat(Array.prototype.slice.call(arguments, 0));
    return fn.apply(this, args);
  };
}

function bind (fn, context) {
  return function () {
    return fn.apply(context, arguments);
  }
}

function noop () {}
