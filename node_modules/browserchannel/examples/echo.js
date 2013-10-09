var browserChannel = require('browserchannel').server;
var connect = require('connect');

var server = connect(
  connect.static("#{__dirname}/public"),
  browserChannel(function(session) {
    console.log('New session: ' + session.id +
      ' from ' + session.address +
      ' with cookies ' + session.headers.cookie);

    session.on('message', function(data) {
      console.log(session.id + ' sent ' + JSON.stringify(data));
      session.send(data);
    });

    session.on('close', function(reason) {
      console.log(session.id + ' disconnected (' + reason + ')');
    });
      
    // This tells the session to stop trying to connect
    //session.stop();
    
    // This just kills the session.
    //session.close();
  })
);

server.listen(4444);

console.log('Echo server listening on localhost:4444');

