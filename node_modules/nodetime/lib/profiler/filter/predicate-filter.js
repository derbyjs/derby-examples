'use strict';


var PredicateFilter = function() {
}

exports.PredicateFilter = PredicateFilter;


PredicateFilter.prototype.preparePredicates = function(preds) {
  var self = this;
  
  var parsedPreds = [];
  preds.forEach(function(pred) {
    var parsedPred = {};
    parsedPreds.push(parsedPred);

    parsedPred.key = pred.key;
    parsedPred.op = pred.op;
    parsedPred.val = pred.val;

    try{ 
      parsedPred.valNum = parseFloat(pred.val) 
    } 
    catch(err) {
    }

    try{ 
      if(pred.op === 'match') parsedPred.valRe = new RegExp(pred.val);
      if(typeof pred.val === 'string') parsedPred.valLc = pred.val.toLowerCase();
    } 
    catch(err) {
      return self.agent.logger.error(err);
    }
  });
      
  this.preds = parsedPreds;

  return true;
}


PredicateFilter.prototype.filter = function(sample) {
  var matched = 0;

  this.preds.forEach(function(pred) {
    matched += walk(pred, sample, 0);
  });

  return (matched > 0);
};


function walk(pred, obj, depth) {
  if(depth > 20) return 0;

  var matched = 0;

  for(var prop in obj) {
    var val = obj[prop];

    if(val === undefined || val === null) {
      continue;
    }
    else if(typeof val === 'object') {
      matched += walk(pred, val, depth + 1);
    }
    else if((pred.key === '*' || pred.key === prop) && test(pred, val)) { 
      matched++;
    }

    if(matched) break;
  }

  return matched;
}


function test(pred, val) {
  var ret = false;

  if(typeof val === 'number') {
    if(pred.valNum !== NaN) {
      if (pred.op === '==') {
        ret = (val == pred.valNum);
      }
      else if (pred.op === '!=') {
        ret = (val != pred.valNum);
      }
      else if (pred.op === '<') {
        ret = (val < pred.valNum);
      }
      else if (pred.op === '>') {
        ret = (val > pred.valNum);
      }
    }
  }
  else if(typeof val === 'string') {
    if(pred.op === 'match' && pred.valRe) {
      ret = pred.valRe.exec(val);
    }
    else if (pred.op === '==') {
      ret = (val.toLowerCase() == pred.valLc);
    }
    else if (pred.op === '!=') {
      ret = (val.toLowerCase() != pred.valLc);
    }
  }

  return ret;
}
