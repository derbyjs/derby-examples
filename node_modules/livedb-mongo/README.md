# livedb-mongo

MongoDB database adapter for [livedb](https://github.com/share/livedb). This driver can be used both as a snapshot
store and oplog.

Snapshots are stored where you'd expect (the named collection with
\_id=docName). Operations are stored in `COLLECTION_ops`. If you have a
users collection, the operations are stored in `users_ops`. If you have a
document called `fred`, operations will be stored in documents called `fred
v0`, `fred v1`, `fred v2` and so on.

JSON document snapshots in livedb-mongo are unwrapped so you can use mongo
queries directly against JSON documents. (They just have some extra fields in
    the form of `_v` and `_type`). You should always use livedb to edit
documents - don't just edit them directly in mongo. You'll get weird behaviour
if you do.

## Usage

LiveDB-mongo wraps [mongoskin](https://github.com/kissjs/node-mongoskin). It
passes all the arguments straight to mongoskin's constructor. `npm install
livedb-mongo` then create your database wrapper using the same arguments you
would pass to mongoskin:

```javascript
var livedbmongo = require('livedb-mongo');
var mongo = livedbmongo('localhost:27017/test?auto_reconnect', {safe:true});

var livedb = require('livedb').client(mongo); // Or whatever. See livedb's docs.
```

If you prefer, you can instead create a mongoskin instance yourself and pass it to livedb-mongo:

```javascript
var mongoskin = require('mongoskin');
var skin = mongoskin('localhost:27017/test?auto_reconnect', {safe:true});

var livedbmongo = require('livedb-mongo');
var mongo = livedbmongo(skin);
```


## MIT License
Copyright (c) 2013 by Joseph Gentle and Nate Smith

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
