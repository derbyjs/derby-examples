var derby = require('derby')

derby.use(require('derby-ui-boot'))
derby.use(require('../../ui'))

var app = derby.createApp(module);

var pages = [
  {url: '/', title: 'Home'}
, {url: '/people', title: 'People'}
, {url: '/people/new', title: 'Add somebody'}
]

function render(name, page) {
  var ctx = {
    pages: pages
  , activeUrl: page.params.url
  }
  page.render(name, ctx)
}

app.get('/', function(page, model) {
  render('home', page)
})

app.get('/people', function(page, model, params, next) {
  model.subscribe('people', 'directory.ids', function(err) {
    if (err) return next(err)
    model.refList('_page.people', 'people', 'directory.ids')
    render('people', page)
  })
})

app.get('/people/:id', function(page, model, params, next) {
  if (params.id === 'new') {
    return render('edit', page)
  }
  var person = model.at('people.' + params.id)
  model.subscribe(person, 'directory.ids', function(err) {
    if (err) return next(err)
    if (!person.get()) return next()
    model.ref('_page.person', person)
    render('edit', page)
  })
})

app.fn({
  done: function() {
    var model = this.model;
    var name = model.at('_page.person.name')
    if (!name.get()) {
      var checkName = name.on('change', function(value) {
        if (!value) return
        model.del('_page.nameError')
        name.removeListener('change', checkName)
      })
      model.set('_page.nameError', true)
      document.getElementById('name').focus()
      return
    }

    if (!model.get('_page.person.id')) {
      var id = model.add('people', model.get('_page.person'))
      model.push('directory.ids', id)
    }
    app.history.push('/people')
  }

, cancel: function() {
    app.history.back()
  }

, deletePerson: function() {
    var model = this.model;
    var ids = model.at('directory.ids')
    var id = model.get('_page.person.id')
    var i = (ids.get() || []).indexOf(id)
    if (i > -1) model.remove('directory.ids', i)
    // Update model without emitting events so that the page doesn't update
    model.silent().del('_page.person')
    app.history.back()
  }
});
