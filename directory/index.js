var app = module.exports = require('derby').createApp('directory', __filename);
app.use(require('derby-ui-boot'));
app.loadViews(__dirname + '/views');
app.loadStyles(__dirname);
app.component(require('d-connection-alert'));
app.component(require('d-before-unload'));

app.get('/', function(page, model) {
  page.render('home');
});

app.get('/people', function(page, model, params, next) {
  var peopleQuery = model.query('people', {});
  peopleQuery.subscribe(function(err) {
    if (err) return next(err)
    peopleQuery.ref('_page.people');
    page.render('people');
  });
});

app.get('/people/:id', function(page, model, params, next) {
  if (params.id === 'new') {
    return page.render('edit');
  }
  var person = model.at('people.' + params.id);
  model.subscribe(person, function(err) {
    if (err) return next(err);
    if (!person.get()) return next();
    model.ref('_page.person', person);
    page.render('edit');
  });
});

app.proto.done = function() {
  var model = this.model;
  var person = model.at('_page.person');
  if (!person.get('name')) {
    var checkName = person.on('change', 'name', function(value) {
      if (!value) return;
      model.del('_page.nameError');
      model.removeListener('change', checkName);
    });
    model.set('_page.nameError', true);
    this.nameInput.focus();
    return;
  }

  if (!person.get('id')) {
    model.add('people', person.get());
  }
  app.history.push('/people');
};

app.proto.cancel = function() {
  app.history.back();
};

app.proto.deletePerson = function() {
  // Update model without emitting events so that the page doesn't update
  this.model.silent().del('_page.person');
  app.history.back();
};
