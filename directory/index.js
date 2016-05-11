var app = module.exports = require('derby').createApp('directory', __filename);
app.use(require('derby-debug'));
app.serverUse(module, 'derby-stylus');
app.use(require('d-bootstrap'));
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

app.component('people:list', PeopleList);
function PeopleList() {}
PeopleList.prototype.init = function(model) {
  model.ref('people', model.root.sort('people', nameAscending));
};

function nameAscending(a, b) {
  var aName = (a && a.name || '').toLowerCase();
  var bName = (b && b.name || '').toLowerCase();
  if (aName < bName) return -1;
  if (aName > bName) return 1;
  return 0;
}

app.component('edit:form', EditForm);
function EditForm() {}

EditForm.prototype.done = function() {
  var model = this.model;
  if (!model.get('person.name')) {
    var checkName = model.on('change', 'person.name', function(value) {
      if (!value) return;
      model.del('nameError');
      model.removeListener('change', checkName);
    });
    model.set('nameError', true);
    this.nameInput.focus();
    return;
  }

  if (!model.get('person.id')) {
    model.root.add('people', model.get('person'));
    // Wait for all model changes to go through before going to the next page, mainly because
    // in non-single-page-app mode (basically IE < 10) we want changes to save to the server before leaving the page
    model.whenNothingPending(function(){
      app.history.push('/people');
    });
  } else {
    app.history.push('/people');
  }
};

EditForm.prototype.cancel = function() {
  app.history.back();
};

EditForm.prototype.deletePerson = function() {
  // Update model without emitting events so that the page doesn't update
  this.model.silent().del('person');
  // Wait for all model changes to go through before going back, mainly because
  // in non-single-page-app mode (basically IE < 10) we want changes to save to the server before leaving the page
  this.model.whenNothingPending(function(){
    app.history.back();
  });
};
