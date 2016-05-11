var app = module.exports = require('derby').createApp('widgets', __filename);
app.use(require('derby-debug'));
app.serverUse(module, 'derby-stylus');
app.use(require('d-bootstrap'));
app.loadViews(__dirname);
app.loadStyles(__dirname);
app.component(require('d-connection-alert'));
app.component(require('d-before-unload'));

app.get('/', function(page, model, params, next) {
  var data = model.at('widgets.data');
  data.subscribe(function(err) {
    if (err) return next(err);
    data.createNull({color: 'Purple'});
    model.set('_page.numbers', [
      {content: 'First'},
      {content: 'Second'},
      {content: 'Third'}
    ]);
    model.set('_page.colors', [
      {content: 'Red'},
      {content: 'Orange'},
      {content: 'Purple'}
    ]);
    page.render();
  });
});

app.proto.hideModal = function(action, cancel) {
  if (!window.confirm('Action: ' + action + '\n\nContinue to hide?')) {
    cancel();
  }
};
