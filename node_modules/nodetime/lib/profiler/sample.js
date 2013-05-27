'use strict';


function Sample() {
  this['Type'] = undefined;
  this['Connection'] = undefined;
  this['Command'] = undefined;
  this['Arguments'] = undefined;
  this['Stack trace'] = undefined;
  this['Error'] = undefined;
  this['URL'] = undefined;
  this['Method'] = undefined;
  this['Request headers'] = undefined;
  this['Response headers'] = undefined;
  this['Status code'] = undefined;
  this._group = undefined;
  this._version = undefined;
  this._ns = undefined;
  this._id = undefined;
  this._isRoot = undefined;
  this._begin = undefined;
  this._end = undefined;
  this._ms = undefined;
  this._ts = undefined;
  this._cputime = undefined;
  this._threadId = undefined;
  this['Response time (ms)'] = undefined;
  this['Timestamp (ms)'] = undefined;
  this['CPU time (ms)'] = undefined;
  this['Bytes read (KB)'] = undefined;
  this['Bytes written (KB)'] = undefined;
  this['Start context'] = undefined;
  this['End context'] = undefined;
  this['Operations'] = undefined;
  this['Node state'] = undefined;
  this['Node information'] = undefined;
  this._filtered = undefined;
  this._realtime = undefined;
  this._slow = undefined;
}

exports.Sample = Sample;

