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

To install Derby and create your own project please see [Getting started](http://derbyjs.com/#getting_started) in the Derby docs.

To run these examples on your own machine, first install [Node.js](http://nodejs.org/#download). The Node installer will also install [npm](http://npmjs.org/).

Install derby-examples from npm

```
$ npm install derby-examples
```

Then you can run each of the examples from their own directories

```
$ cd node_modules/derby-examples/sink
$ node server.js
```

Note that to run the chat and todos examples, you will need to install [MongoDB](http://www.mongodb.org/downloads) and start the Mongo server.

## MIT License
Copyright (c) 2011 by Brian Noguchi and Nate Smith

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
