var app = module.exports = require('derby').createApp('codemirror', __filename);
app.use(require('derby-debug'));
app.serverUse(module, 'derby-stylus');
app.loadViews(__dirname);
app.loadStyles(__dirname);
app.component(require('d-codemirror'));
app.component(require('d-showdown'));

// Routes render on client as well as server
app.get('/', function(page, model) {
  // Subscribe specifies the data to sync
  var text = model.at('codemirror.text');
  text.subscribe(function() {
    // we set default content if none has been set
    if (text.get() == null) {
      text.create('# Hello world');
    }
    page.render();
  });
});
