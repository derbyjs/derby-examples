'use strict';

var EventEmitter = require('events').EventEmitter;

function Proxy(agent) {
  this.agent = agent;
}
exports.Proxy = Proxy;


Proxy.prototype.init = function() {
  // removeListener compairs objects, so the original callback
  // should be passed instead of the proxy
  this.before(EventEmitter.prototype, 'removeListener', function(obj, args) {
    if(args.length > 1 && args[1] && args[1].__nodetimeProxy__) {
      args[1] = args[1].__nodetimeProxy__;
    }
  });
};

var Locals = function() {
  this.time = undefined;
  this.stackTrace = undefined;
  this.params = undefined;
}


Proxy.prototype.before = function(obj, meths, hook) {
  var self = this;

  if(!Array.isArray(meths)) meths = [meths];

  meths.forEach(function(meth) { 
    var orig = obj[meth];
    if(!orig) return;

    obj[meth] = function() {
      try { 
        hook(this, arguments);
      } 
      catch(e) { 
        self.logError(e); 
      }

      return orig.apply(this, arguments);
    };
  });
};


Proxy.prototype.after = function(obj, meths, hook) {
  var self = this;
  
  if(!Array.isArray(meths)) meths = [meths];

  meths.forEach(function(meth) {
    var orig = obj[meth];
    if(!orig) return;

    obj[meth] = function() {
      var ret = orig.apply(this, arguments);

      var hookRet;
      try { 
        hookRet = hook(this, arguments, ret); 
      } 
      catch(e) { 
        self.logError(e) 
      }

      return hookRet || ret;
    };
  });
};


Proxy.prototype.around = function(obj, meths, hookBefore, hookAfter) {
  var self = this;
  
  if(!Array.isArray(meths)) meths = [meths];

  meths.forEach(function(meth) {
    var orig = obj[meth];
    if(!orig) return;

    obj[meth] = function() {
      var locals = new Locals();

      try { 
        hookBefore(this, arguments, locals); 
      } 
      catch(e) { 
        self.logError(e) 
      }

      var ret = orig.apply(this, arguments);
      
      var hookRet;
      try { 
        hookRet = hookAfter(this, arguments, ret, locals); 
      } 
      catch(e) { 
        self.logError(e) 
      }
      
      return hookRet || ret;
    };
  });
};


Proxy.prototype.callback = function(args, pos, hookBefore, hookAfter) {
  var self = this;
  
  if(args.length <= pos) return false;
  if(pos === -1) pos = args.length - 1;

  var orig = (typeof args[pos] === 'function') ? args[pos] : undefined;
  if(!orig) return;

  args[pos] = function() {
    if(hookBefore) {
      try { 
        hookBefore(this, arguments); 
      } 
      catch(e) { 
        self.logError(e); 
      }
    }

    var ret = orig.apply(this, arguments);

    if(hookAfter) {
      try { 
        hookAfter(this, arguments); 
      } 
      catch(e) { 
        self.logError(e); 
      }
    }
    return ret;
  };

  // this is need for removeListener
  orig.__nodetimeProxy__ = args[pos];
};


Proxy.prototype.getter = function(obj, props, hook) {
  var self = this;
  
  if(!Array.isArray(props)) props = [props];

  props.forEach(function(prop) {
    var orig = obj.__lookupGetter__(prop);
    if(!orig) return;

    obj.__defineGetter__(prop, function() {
      var ret = orig.apply(this, arguments);

      try { 
        hook(this, ret); 
      } 
      catch(e) { 
        self.logError(e) 
      }

      return ret;
    });
  });
};


Proxy.prototype.hasError = function(args) {
  return (args && args.length > 0 && args[0]);
};


Proxy.prototype.getErrorMessage = function(args) {
  if(args && args.length > 0 && args[0]) {
    if(args[0] && typeof(args[0]) === 'object' && args[0].message) {
      return args[0].message;
    }
    else if(typeof(args[0]) === 'string') {
      return args[0];
    }
    else {
      return 'unspecified';
    }
  }
  
  return undefined;
};


Proxy.prototype.logError = function(err) {
  this.agent.logger.error(err);
}



