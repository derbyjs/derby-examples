var app = module.exports = require('derby').createApp('directory', __filename);
app.use(require('derby-debug'));
app.serverUse(module, 'derby-stylus');
app.use(require('d-bootstrap'));
app.loadStyles(__dirname);
app.loadViews(__dirname + '/pages');
app.component(require('./pages/edit'));
app.component(require('./pages/people'));

app.get('*', function(page, model, params, next) {
  model.set('_page.now', Date.now());
  next();
});

app.get('/', function(page, model) {
  page.render('home');
});

app.get('/people', function(page, model, params, next) {
  var peopleQuery = model.query('people', {});
  peopleQuery.subscribe(function(err) {
    if (err) return next(err);
    page.render('people');
  });
});

app.get('/people/:id([\\w-]+)', function(page, model, params, next) {
  if (params.id === 'new') {
    return page.render('edit');
  }
  var person = model.at('people.' + params.id);
  person.subscribe(function(err) {
    if (err) return next(err);
    if (!person.get()) return next();
    model.ref('_page.person', person);
    page.render('edit');
  });
});
