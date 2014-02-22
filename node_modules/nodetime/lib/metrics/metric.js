'use strict';

/*
 * Metric object used for aggregating values and trasfering 
 * the aggregated metric to data sender. It can have three states:
 * - created/resetted
 * - initialized, i.e. accumulating values
 * - aggregated
 */


function Metric(scope, name, unit, op) {
  this.scope = scope;
  this.name = name;
  this.value = undefined;
  this.unit = unit;
  this.op = op || 'avg';

  this.source = undefined;
  this._ns = undefined;
  this._id = undefined; 
  this._ts = undefined;

  // used for aggregation only  
  this._sum = undefined;
  this._count = undefined;
  this._values = undefined;
  this._bins = undefined;
}

exports.Metric = Metric;



Metric.prototype.init = function() {
  var self = this;

  self.value = 0;

  // compatibility
  switch(self.op) {
    case 'gauge':
      self.op = 'set';
      break;
    case 'gaugex':
      self.op = 'setx';
      break;
  }
  // end compatibility
  
  if(self.op === 'avg') {
    self._sum = 0;
    self._count = 0;
  }
  if(self.op === 'sum' || self.op === 'inc') {
    self._sum = 0;
  }
  else if(self.op === '95th') {
    self._values = [];
  }
  else if(self.op === 'index') {
    // prefill bins
    self._bins = {
      1: 0,
      10: 0,
      100: 0,
      1000: 0,
      10000: 0,
      100000: 0,
      1000000: 0
    };
  }
  /*else {
    // set, setx
  }*/
};


Metric.prototype.isInitialized = function() {
  return (this.value !== undefined)
};


Metric.prototype.reset = function() {
  var self = this;

  self.value = undefined; 
  
  if(self.op === 'avg') {
    self._sum = undefined;
    self._count = undefined;
  }
  if(self.op === 'sum' || self.op === 'inc') {
    self._sum = 0;
    self.init();
  }
  else if(self.op === '95th') {
    self._values = undefined;
  }
  else if(self.op === 'index') {
    self._bins = undefined;
  }
};


Metric.prototype.addValue = function(value) {
  var self = this;

  if(typeof(value) !== 'number') return;

  if(self.value === undefined) {
    self.init();
  }

  switch(self.op) {
  case 'avg':
    self._sum += value;
    self._count++;
    break;
  case 'sum':
  case 'inc':
    self._sum += value;
    break;
  case 'set':
  case 'setx':
    self.value = value;
    break;
  case '95th':
    if(self._values.length < 250) {
      self._values.push(value);
    }
    break;
  case 'index':
    var bin = value < 1 ? 1 : Math.pow(10, Math.floor(Math.log(value) / Math.LN10) + 1); 
    if(self._bins[bin]) {
      self._bins[bin]++;
    }
    else {
      self._bins[bin] = 1;
    }
    break;
  }
};


Metric.prototype.aggregate = function() {
  var self = this;

  if(self.op === 'avg') {
    self.value = self._sum / self._count;
  }
  else if(self.op === 'sum' || self.op === 'inc') {
    self.value = self._sum;
  }
  else if(self.op === '95th') {
    if(self._values.length > 0) {
      self._values = self._values.sort(function(a, b) { return a - b});
      var n = Math.floor(self._values.length * 0.95 + 0.5);
      self.value = self._values[n - 1];
    }
    else {
      self.value = 0;
    }
  }
  else if(self.op === 'index') {
    var total = 0;
    for(var bin in self._bins) {
      total += self._bins[bin];
    }

    if(total !== 0) {
      self.value = 0;
      for(var bin in self._bins) {
        self.value += 
          Math.round(1 / (Math.log(bin) / Math.LN10 + 1) * 
          (self._bins[bin] / total * 100));
      }
    }

    self.value = 100 - self.value;
  }
};


Metric.prototype.clone = function() {
  var cln = new Metric(
    this.scope,
    this.name,
    this.unit,
    this.op
  );
  cln.value = this.value;

  if(this.op === 'avg') {
    cln._sum = this._sum;
    cln._count = this._count;
  }

  return cln;
};




