var app = module.exports = require('derby').createApp('hello', __filename);
app.loadViews(__dirname);

// Routes render on client as well as server
app.get('/', function(page, model) {
  // Subscribe specifies the data to sync
  model.subscribe('hello.message', function() {
    page.render();
  });
});
