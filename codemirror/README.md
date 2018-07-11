d-codemirror
------------

Example usage of the derby [CodeMirror component](https://github.com/derbyjs/d-codemirror).

This component depends on the CodeMirror library, and needs to serve up some of it's static content.
See __server.js__ where we let derby (and hence express) know about the static folder we want.

For a full CodeMirror deployment (using modes and themes) you will want to serve up some more static content from the CodeMirror repo. At that point you will want to replace derby-starter with your own instanciation of a derby app.

