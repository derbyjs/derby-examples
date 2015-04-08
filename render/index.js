var derby = require('derby')
require('derby/node_modules/derby-parsing')

var app = module.exports = derby.createApp('render', __filename);
app.use(require('derby-debug'));
app.serverUse(module, 'derby-stylus');
app.loadViews(__dirname);
app.loadStyles(__dirname);
app.component(require('d-codemirror'));
app.component(require('d-barchart'));

var HTML = ' \
render anywhere! \n \
<ul style="list-style:none;padding:0;"> \n \
{{each data.foo as #item}} \n \
  <li style="padding-top:1px;margin-top:10px"> \n \
  <div style="width:{{#item.value}}px;border-bottom: 4px solid {{data.color}};text-align:right"> \n \
    {{Math.floor(#item.value)}} \n \
  </div> \n \
  </li> \n \
{{/each}} \n \
</ul>'


function Custom() {}
Custom.prototype.init = function() {}
app.component("custom", Custom)

app.component("editor", Editor)
function Editor() {};
Editor.prototype.init = function(model){
  model.set("rerender", 0)
}
Editor.prototype.create = function(model) {
  var self = this;
  model.on("change", "html", render);
  render()
  function render() {
    //rerender the view
    var html = model.get("html");
    try {
      var view = app.views.register("custom", html, { data: model.get("data")})
      self.get("custom")
      var component = view.componentFactory.init(self.customView.context)
      view.componentFactory.create(component)
      component.controller.model.set("data", model.get("data"))
      var rendered = view.appendTo(self.tester, component)
      
      model.set("error", false)
      model.increment("rerender")
    } catch(e) {
      console.log(e.stack)
      model.set("error", e.stack)
    }

    try {
      // clean up what we appended to the tester since it works
      var nodes = self.tester.querySelectorAll("*")
      for(var i = 0; i < nodes.length; i++) {
        self.tester.removeChild(nodes.item(i))
      }
    } catch(e) {}
  }
}

app.get('/', function(page, model, params, next) {
  model.setNull("_page.html", HTML) //'<div style="color: {{data.color}}">hi</div>')

  var data = model.at('widgets.data');
  data.subscribe(function(err) {
    if (err) return next(err);
    data.setNull('foo', [{value: 1}, {value: 10}, {value: 20 }]);
    data.setNull('color', "#12B9B3")
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