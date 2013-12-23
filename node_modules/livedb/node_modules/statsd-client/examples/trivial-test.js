var sdc = require('../lib/statsd-client'),
    SDC = new sdc({host: '10.111.12.113', debug: 1, prefix: "statsd-client"}),
    SDCTest = SDC.getChildClient('test');


var begin = new Date();
setTimeout(function () {
    // Set 'statsd-client.test.gauge'
    SDCTest.gauge('gauge', 100 * Math.random());

    // Icrement 'statsd-client.test.counter' twice
    SDCTest.increment('counter');
    SDC.increment('test.counter');

    // Set some time
    SDC.timing('speed', begin);

    // Close socket
    SDC.close();
}, 100 * Math.random());

