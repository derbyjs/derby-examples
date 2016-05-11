var app = module.exports = require('derby').createApp('hello', __filename);
app.loadViews(__dirname);

// Routes render on client as well as server
app.get('/', function(page, model) {
  // Subscribe specifies the data to sync
  var message = model.at('hello.message');
  message.subscribe(function(err) {
    if (err) return next(err);
    if (message.get() == null) {
      message.create('');
    }
    page.render();
  });
});
