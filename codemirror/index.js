var app = module.exports = require('derby').createApp('codemirror', __filename);
app.loadViews(__dirname);
app.component(require('d-codemirror'));
app.component(require('d-showdown'));

// Routes render on client as well as server
app.get('/', function(page, model) {
  // Subscribe specifies the data to sync
  model.subscribe('codemirror.text', function() {
    page.render();
  });
});

app.proto.markdown = function(html) {
  if(!this.md) return;
  this.md.innerHTML = html;
}
