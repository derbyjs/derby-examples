var derby = require('derby');
var parsing = require('derby/parsing');

var app = module.exports = derby.createApp('render', __filename);
app.use(require('derby-debug'));
app.serverUse(module, 'derby-stylus');
app.loadViews(__dirname);
app.loadStyles(__dirname);
app.component(require('d-codemirror'));
app.component(require('d-barchart'));

var DEFAULT_SOURCE =
  'Render anywhere!\n' +
  '<div style="text-align: right">\n' +
  '  {{each data.bars as #bar}}\n' +
  '    <div style="width: {{#bar.value}}px; border-bottom: 4px solid {{data.color}};">\n' +
  '      {{Math.floor(#bar.value)}}\n' +
  '    </div>\n' +
  '  {{/each}}\n' +
  '</div>';

app.component("editor", Editor)
function Editor() {};
Editor.prototype.init = function(model) {
  model.set('source', DEFAULT_SOURCE);
}
Editor.prototype.parse = function(source) {
  try {
    return parsing.createTemplate(source);
  } catch (err) {
    return err.message;
  }
};

app.get('/', function(page, model, params, next) {
  var data = model.at('home.data');
  data.subscribe(function(err) {
    if (err) return next(err);
    data.createNull({
      bars: [{value: 1}, {value: 10}, {value: 20}],
      color: '#12B9B3'
    });
    page.render();
  });
});

// adding a prototype method to page of app
app.proto.remove = function(i) {
  this.model.remove('home.data.bars', i);
}
app.proto.add = function() {
  this.model.push('home.data.bars', {value: Math.random() * 100});
}
