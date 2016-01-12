# Derby

The Derby MVC framework makes it easy to write realtime, collaborative applications that run in both Node.js and browsers.

See **http://derbyjs.com/**

## Examples

### Chat

http://chat.derbyjs.com/lobby

A simple chat demo. Note that as you edit your name, it updates in realtime. Name changes also show up in the page title and other rooms. Check out the source in the examples directory to see how these bindings are created automatically.

### Todos

http://todos.derbyjs.com/derby

The requisite MVC demo, but collaborative and realtime! Todo items are
contenteditable fields with support for bold and italics.

### Sink

http://sink.derbyjs.com/

A kitchen-sink style example with a bunch of random features. Largely used for testing.

### Hello

http://hello.derbyjs.com/

Hello world example.

## Installing

**Warning:** Master of this repo is now based on Derby 0.6. 0.6 is sufficiently complete and being used in production, but [the documentation](http://derbyjs.com/docs/derby-0.6) is not as extensive as it was for 0.5.16. Expect updated docs soon.

**Install these examples from the [0.5 branch](https://github.com/derbyjs/derby-examples/tree/0.5) for use with Derby 0.5.**

To run these examples on your own machine, first install [Node.js](http://nodejs.org/#download). The Node installer will also install [npm](http://npmjs.org/). You'll also need [MongoDB](http://www.mongodb.org/downloads) and [Redis 2.6](http://redis.io/download) installed and running.

Then, clone this repo from GitHub.

You can run each of the examples from their own directories:

```
$ cd ~/derby-examples/directory
$ node server.js
```

The examples written in CoffeeScript are meant to be run via the coffee command:

```
$ npm install -g coffee-script
$ cd ~/derby-examples/sink
$ coffee server.coffee
```

If you would like to run all of the examples at once you can do
```
cd ~/derby-examples
node server.js
```
If you run into an EMFILE error on Mac or Linux you can up your file limit with `ulimit -n 2560`

## MIT License
Copyright (c) 2011 by Nate Smith

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
