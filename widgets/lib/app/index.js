var derby = require('derby')
  , app = derby.createApp(module)
  , get = app.get

derby.use(require('derby-ui-boot'))
derby.use(require('./ui'))

get('/', function(page, model) {
  model.subscribe('test', function(err, test) {
    test.setNull('options', [
      {text: 'First'}
    , {text: 'Second'}
    , {text: 'Third'}
    ])
    page.render()
  })
})

app.ready(function(model) {
  app.showModal = function() {
    model.set('_showModal', true)
  }
})
