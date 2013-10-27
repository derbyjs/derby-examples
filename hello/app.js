var app = require('derby').createApp(module);

// Templates define both HTML and model <- -> view bindings
app.views.register('Body',
  'Holler: <input value="{{hello.message}}"><h2>{{hello.message}}</h2>'
);

// Routes render on client as well as server
app.get('/', function(page, model) {
  // Subscribe specifies the data to sync
  model.subscribe('hello.message', function() {
    page.render();
  });
});

app.ready(function(model) {
  global.MODEL = model;
});
