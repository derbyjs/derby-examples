var derby = require('derby')

derby.use(require('derby-ui-boot'))
derby.use(require('../../ui'))

var app = derby.createApp(module)

app.get('/', function(page, model) {
  page.render('home')
})

app.get('/people', function(page, model, params, next) {
  var peopleQuery = model.query('people', {})
  peopleQuery.subscribe(function(err) {
    if (err) return next(err)
    peopleQuery.ref('_page.people');
    page.render('people')
  })
})

app.get('/people/:id', function(page, model, params, next) {
  if (params.id === 'new') {
    return page.render('edit')
  }
  var person = model.at('people.' + params.id)
  model.subscribe(person, function(err) {
    if (err) return next(err)
    if (!person.get()) return next()
    model.ref('_page.person', person)
    page.render('edit')
  })
})

app.fn({
  done: function() {
    var model = this.model;
    var person = model.at('_page.person')
    if (!person.get('name')) {
      var checkName = person.on('change', 'name', function(value) {
        if (!value) return
        model.del('_page.nameError')
        model.removeListener('change', checkName)
      })
      model.set('_page.nameError', true)
      document.getElementById('name').focus()
      return
    }

    if (!person.get('id')) {
      model.add('people', person.get())
    }
    app.history.push('/people')
  }

, cancel: function() {
    app.history.back()
  }

, deletePerson: function() {
    // Update model without emitting events so that the page doesn't update
    this.model.silent().del('_page.person')
    app.history.back()
  }
})
