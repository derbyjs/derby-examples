var get, view, _ref;
_ref = require('derby').createApp(module), view = _ref.view, get = _ref.get;
view.make('Body', 'Holler: <input value="{message}"><h2>{message}</h2>');
get('/', function(page, model) {
  return model.subscribe('message', function() {
    return page.render();
  });
});