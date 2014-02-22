node-statsd-client
==================

Node.js client for [statsd](https://github.com/etsy/statsd).

[![Build Status](https://secure.travis-ci.org/msiebuhr/node-statsd-client.png?branch=master)](http://travis-ci.org/msiebuhr/node-statsd-client)

Quick tour
----------

```javascript
var sdc = new require('statsd-client')({host: 'statsd.example.com'});

var timer = new Date();
sdc.increment('some.counter'); // Increment by one.
sdc.gauge('some.gauge', 10); // Set gauge to 10
sdc.timing('some.timer', timer); // Calculates time diff

sdc.close(); // Optional - stop NOW
```

API
---

### Initialization

```javascript
var SDC = require('statsd-client'),
	sdc = new SDC({host: 'statsd.example.com', port: 8124, debug: true});
```

Available options:

 * `host`: Where to send the stats (default `localhost`).
 * `debug`: Print what is being sent to stderr (default `false`).
 * `port`: Port to contact the statsd-daemon on (default `8125`).
 * `prefix`: Prefix all stats with this value (default `""`).
 * `socketTimeout`: Auto-closes the socket after this long without activity
   (default 1000 ms; 0 disables this).

### Counting stuff

Counters are supported, both as raw `.counter(metric, delta)` and with the
shortcuts `.increment(metric, [delta=1])` and `.decrement(metric, [delta=-1])`:

```javascript
sdc.increment('systemname.subsystem.value'); // Increment by one
sdc.decrement('systemname.subsystem.value', -10); // Decrement by 10
sdc.counter('systemname.subsystem.value', 100); // Indrement by 100
```

### Gauges

Sends an arbitrary number to the back-end:

```javascript
sdc.gauge('what.you.gauge', 100);
```

### Sets

Send unique occurences of events between flushes to the back-end:

```javascript
sdc.set('your.set', 200);
```

### Delays

Keep track of how fast (or slow) your stuff is:

```javascript
var start = new Date();
setTimeout(function () {
	sdc.timing('random.timeout', start);
}, 100 * Math.random());
```

If it is given a `Date`, it will calculate the difference, and anything else
will be passed straight through.

And don't let the name (or nifty interface) fool you - it can measure any kind
of number, where you want to see the distribution (content lengths, list items,
query sizes, ...)

### Express helper

There's also a helper for measuring stuff in [Express.js](http://expressjs.com)
via middleware:

```javascript
var app = express();
	sdc = new StatsDClient({...});

app.use(sdc.helpers.getExpressMiddleware('somePrefix'));
// or
app.get('/',
	sdc.helpers.getExpressMiddleware('otherPrefix'),
	function (req, res, next) { req.pipe(res); });

app.listen(3000);
```

This will count responses by status-code (`prefix.<statuscode>`) and the
overall response-times.

It can also measure per-URL (e.g. PUT to `/:user/:thing` will become
`PUT_user_thing` by setting the `timeByUrl: true` in the `options`-object:

```javascript
app.use(sdc.helpers.getExpressMiddleware('prefix', { timeByUrl: true }));
```

As the names can become rather odd in corner-cases (esp. regexes and non-REST
interfaces), you can specify another value by setting `res.locals.statsdUrlKey`
at a later point.

### Stopping gracefully

By default, the socket is closed if it hasn't been used for a second (see
`socketTimeout` in the init-options), but it can also be force-closed with
`.close()`:

```javascript
var start = new Date();
setTimeout(function () {
	sdc.timing('random.timeout', start); // 2 - implicitly re-creates socket.
	sdc.close(); // 3 - Closes socket after last use.
}, 100 * Math.random());
sdc.close(); // 1 - Closes socket early.
```

The call is idempotent, so you can call it "just to be sure". And if you submit
new metrics later, the socket will automatically be re-created, and a new
timeout-timer started.

### Prefix-magic

The library supports getting "child" clients with extra prefixes, to help with
making sane name-spacing in apps:

```javascript
// Create generic client
var sdc = new StatsDClient({host: 'statsd.example.com', prefix: 'systemname');
sdc.increment('foo'); // Increments 'systemname.foo'
... do great stuff ...

// Subsystem A
var sdcA = sdc.getChildClient('a');
sdcA.increment('foo'); // Increments 'systemname.a.foo'

// Subsystem B
var sdcB = sdc.getChildClient('b');
sdcB.increment('foo'); // Increments 'systemname.b.foo'
```

Internally, they all use the same socket, so calling `.close()` on any of them
will allow the entire program to stop gracefully.

What's broken
-------------

Check the [GitHub issues](https://github.com/msiebuhr/node-statsd-client/issues).

LICENSE
-------

ISC - see
[LICENSE](https://github.com/msiebuhr/node-statsd-client/blob/master/LICENSE).
