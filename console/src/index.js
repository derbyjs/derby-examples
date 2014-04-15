app = module.exports = require('derby').createApp('console', __filename);
app.loadViews(__dirname + '/../views');
app.loadStyles(__dirname + '/../assets/styles');
app.component(require('d-connection-alert'));
app.component(require('d-before-unload'));
app.component(require('d-console'));


app.get('/', function (page, model, params, next) {
  page.render();
});

app.proto.newCommand = function (command, callback) {
  try {
    callback(null, eval(command));
  } catch (error) {
    callback(error.message);
  }
}