var app = module.exports = require('derby').createApp('bars', __filename);
app.use(require('derby-debug'));
app.serverUse(module, 'derby-stylus');
app.use(require('d-bootstrap'));
app.loadViews(__dirname);
app.loadStyles(__dirname);
app.component(require('d-connection-alert'));
app.component(require('d-barchart'));
app.component(require('d-barchart-vanilla'));
app.component(require('d-d3-barchart'));

app.get('/', function(page, model, params, next) {
  var data = model.at('widgets.data');
  model.shareConnection.debug = true
  data.subscribe(function(err) {
    if (err) return next(err);
    data.setNull('foo', [{value: 1}, {value: 10}, {value: 20 }]);
    page.render();
  });
});

// adding a prototype method to page of app
app.proto.remove = function(d,i,el) {
  if(this.model.get("widgets.data.foo").length <= 2) return
  this.model.remove("widgets.data.foo", i, 1);
}
app.proto.add = function() {
  if(this.model.get("widgets.data.foo").length >= 12) return;
  this.model.push("widgets.data.foo", {value: Math.random() * 100 });
}
