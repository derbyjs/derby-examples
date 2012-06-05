var derby = require('derby')
  , app = derby.createApp(module)
  , get = app.get

derby.use(require('derby-ui-boot'))
derby.use(require('./ui'))

var pages = [
  {url: '/', title: 'Home'}
, {url: '/people', title: 'People'}
, {url: '/people/new', title: 'Add somebody'}
]

function render(name, page, params) {
  var ctx = {
    pages: pages
  , activeUrl: params.url
  }
  page.render(name, ctx)
}

get('/', function(page, model, params) {
  render('home', page, params)
})

get('/people', function(page, model, params) {
  model.subscribe('people', 'directoryIds', function(err, people) {
    model.refList('_people', people, 'directoryIds')
    render('people', page, params)
  })
})

function renderEdit(page, model, params, id) {
  model.subscribe('people.' + id, function(err, person) {
    model.ref('_person', person)
    render('edit', page, params)
  })
}

get('/people/:id', function(page, model, params) {
  var id = params.id
  model.del('_newId')
  model.del('_nameError')
  if (id === 'new') {
    model.async.incr('peopleCount', function(err, count) {
      id = count.toString()
      model.set('_newId', id)
      renderEdit(page, model, params, id)
    })
  } else {
    renderEdit(page, model, params, id)
  }
})

app.ready(function(model) {
  var history = app.view.history

  app.done = function() {
    if (!model.get('_person.name')) {
      var checkName = function(value) {
        if (!value) return
        model.del('_nameError')
        model.removeListener('_person.name', checkName)
      }
      model.on('set', '_person.name', checkName)
      model.set('_nameError', true)
      document.getElementById('name').focus()
      return
    }

    var newId = model.get('_newId')
    if (newId != null) model.push('directoryIds', newId)
    history.push('/people')
  }

  app.cancel = function() {
    history.back()
  }

  app.deletePerson = function() {
    model.async.get('directoryIds', function(err, ids) {
      if (ids) {
        var id = model.get('_person.id')
          , i = ids.indexOf(id)
        if (i > -1) model.remove('directoryIds', i)
      }
      history.back()
    }) 
  }
})
