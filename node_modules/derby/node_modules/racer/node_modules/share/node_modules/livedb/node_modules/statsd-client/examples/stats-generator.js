#!/usr/bin/env node
var args = process.argv;

var SDC = require('../lib/statsd-client'),
    sdc = new SDC({
        host: 'localhost',
        prefix: args[2] || 'data.generator'
    }),
    rand,
    time = new Date(),
    iterations = 0;

function sendSomeData() {
    iterations += 1;
    if (iterations % 10 === 0) {
        process.stdout.write('\r' + ['◒', '◐', '◓',  '◑'][iterations/10 % 4]);
        iterations = iterations >= 40 ? 0 : iterations;
    }

    rand = Math.round(Math.random() * 10);

    sdc.gauge('gauge' + rand, rand);
    sdc.counter('counter' + rand, rand);
    sdc.set('set' + rand, rand);
    sdc.timing('timer' + rand, time);
    
    time = new Date();
    setTimeout(sendSomeData, rand);
}

sendSomeData();
