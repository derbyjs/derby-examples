var app = module.exports = require('derby').createApp('hello', __filename);
app.loadViews(__dirname);

// Routes render on client as well as server
app.get('/', function(page, model) {
  var id = model.id();
  var $message = model.at('messages.' + id);
  // Subscribe specifies the data to sync
  $message.subscribe(function(err) {
    if (err) return next(err);
    var message = $message.get();
    // If the message doesn't exist yet, we need to create it
    if (!message) model.add('messages', {id: id, text: ''});
    $message.ref('_page.hello');
    page.render();
  });
});
