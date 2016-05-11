var app = module.exports = require('derby').createApp('charts', __filename);
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
  data.subscribe(function(err) {
    if (err) return next(err);
    data.createNull({bars: [{value: 1}, {value: 10}, {value: 20 }]});
    page.render();
  });
});

// adding a prototype method to page of app
app.proto.remove = function(index) {
  this.model.remove('widgets.data.bars', index);
}
app.proto.add = function() {
  this.model.push('widgets.data.bars', {value: Math.random() * 100});
}
