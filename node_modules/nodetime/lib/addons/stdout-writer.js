'use strict';


function StdoutWriter(agent) {
  this.agent = agent;
} 
exports.StdoutWriter = StdoutWriter;

StdoutWriter.prototype.init = function(_nt) {
  var self = this;

  self.agent.on('sample', function(sample) {
    console.log(self.indent({sample: sample}));
  });
};


StdoutWriter.prototype.indent = function(obj, depth) {
  if(!depth) depth = 0;
  if(depth > 20) return '';

  var tab = '';
  for(var i = 0; i < depth; i++) tab += "\t";

  var str = ''
  var arr = Array.isArray(obj);

  for(var prop in obj) {
    var val = obj[prop];
    if(val == undefined || prop.match(/^_/)) continue;
    
    var label = val._label || (arr ? ('[' + prop + ']') : prop);

    if(typeof val === 'string' || typeof val === 'number') {
      str += tab + label + ': \u001b[33m' + val + '\u001b[0m\n';
    }
    else if(typeof val === 'object') {
      str += tab + '\u001b[1m' + label + '\u001b[0m\n';
      str += self.indent(val, depth + 1);
    }
  }
  
  return str;
}

