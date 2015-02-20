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
  model.subscribe('codemirror.text', function() {
    // we set default content if none has been set
    model.setNull('codemirror.text', '<style>.example{ border: 1px solid orange; }</style>\n<div class="example">hello world</div>')
    page.render();
  });
});

app.proto.markdown = function(html) {
  if(!this.md) return;
  this.md.innerHTML = html;
};
