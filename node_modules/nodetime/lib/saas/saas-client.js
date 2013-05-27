'use strict';


var os = require("os");
var util = require("util");
var request = undefined;


function SaasClient(agent) {
  this.agent = agent;

  this.sessionId = undefined;
  this.agentId = os.hostname() + ':' + process.pid;
  this.headers = {
    'X-Agent-Version': this.agent.version
  };

  this.retry = 2;

  this._lastTimestamp = 0;
  this._pollFailed = 0;
  this._pollOngoing = false;
  this._pushFailed = 0;
  this._pushOngoing = false;
  this._pushBuffer = [];
}
exports.SaasClient = SaasClient;


SaasClient.prototype.init = function(server, proxyServer, sessionId) {
  var self = this;

  if(proxyServer) {
    // check if request module is available
    try {
      require('request');
    }
    catch(err) {
      self.agent.logger.message(
        '"request" module not found. It is required if the agent connects ' +
        'to Nodetime server over a proxy server. Install "request" module ' +
        'with "npm install request".'
      );
    }

    request = require("./request-proxy");
  }
  else {
    request = require("./request");    
  }

  this.server = server || 'https://api.nodetime.com';
  self.proxyServer = proxyServer;
  self.sessionId = sessionId;

  self.agent.timers.setInterval(function() {
    if(!self._pushOngoing) self._push();
  }, 1000);

  self.agent.timers.setInterval(function() {
    if(!self._pollOngoing) self._poll();
  }, 1000);


  self.agent.on('destroy', function() {
    self.destroy();
  });
};

exports.SaasClient = SaasClient;


SaasClient.prototype.switchSessionId = function(sessionId) {
  this.sessionId = sessionId;
}


SaasClient.prototype.destroy = function() {
  if(this._deferTimeoutId) clearTimeout(this._deferTimeoutId);

  if(this._pollRequest) {
    this._pollRequest.abort();
    if(this._pollRequest.timeoutTimer) {
      clearTimeout(this._pollRequest.timeoutTimer);
    }
  }

  if(this._pushRequest) {
    this._pushRequest.abort();
    if(this._pushRequest.timeoutTimer) {
      clearTimeout(this._pushRequest.timeoutTimer);
    }
  }
}


SaasClient.prototype.sendCommand = function(cmd, args) {
  this._pushBuffer.push({
    payload: {
      cmd: cmd, 
      args: args
    }, 
    ts: new Date().getTime()
  });
};
  

SaasClient.prototype._push = function() {
  var self = this;
  
  if(self._pushBuffer.length == 0) return;

  self._pushOngoing = true;
  var buf = this._pushBuffer;
  self._pushBuffer = [];
  self._pushRequest = request({
      method: "POST", 
      url: self.server + '/agent/push/' + 
        '?session_id=' + self.sessionId + 
        '&agent_id=' + self.agentId, 
      proxy: self.proxyServer,
      json: buf,
      timeout: 10000,
      headers: self.headers
    }, function(err, response, body) {
    if(err || response.statusCode != 200) {
      if(++self._pushFailed == self.retry) {
        self._pushFailed = 0;
      }
      else {
        // put back
        self._pushBuffer = buf.concat(self._pushBuffer);
      }

      self.agent.logger.error(err || "error pushung message(s)");
    }
    else {
      self._pushFailed = 0;

      self.agent.logger.log("sent message(s) to server");
    }

    self._pushOngoing = false;
  });
};


SaasClient.prototype._poll = function() {
  var self = this;

  self._pollOngoing = true;
  self._pollRequest = request({
      url: self.server + '/agent/poll/' + 
        '?session_id=' + self.sessionId + 
        '&agent_id=' + self.agentId + 
        '&since=' + (self._lastTimestamp || ''), 
      proxy: self.proxyServer,
      encoding: "utf8",
      timeout: 70000,
      headers: self.headers
    }, function(err, response, body) {
    if(err || response.statusCode != 200) {
      self._deferPoll();
      return self.agent.logger.error(err || 'poll request error');
    }
 
    try {
      var msgs = JSON.parse(body);
      msgs = msgs || [];

      msgs.forEach(function(msg) {
        if(msg && msg.ts && msg.payload && msg.payload.cmd) {
          self.agent.logger.log("message(s) received from server");
          self._lastTimestamp = msg.ts;

          self.agent.emit("command", msg.payload.cmd, msg.payload.args);
        }
        else {
          self.agent.logger.error("invalid message for client " + self.group);
        }
      });
    }
    catch(err) {
      self._deferPoll();
      return self.agent.logger.error(err);
    }

    self._pollFailed = 0;
    self._pollOngoing = false;
  });
};


SaasClient.prototype._deferPoll = function() {
  var self = this;

  if(++self._pollFailed == self.retry) {
    self._deferTimeoutId = setTimeout(function() {
      self._pollFailed = 0;
      self._pollOngoing = false;
    }, 60000);
  }
  else {
    self._pollOngoing = false;
  }
}

