var derby = require('derby')
  , app = derby.createApp(module)
  , get = app.get

derby.use(require('derby-ui-boot'))
derby.use(require('../../ui'))

get('/', function(page, model) {
  model.subscribe('test', function(err, test) {
    test.setNull('numbers', [
      {text: 'First'}
    , {text: 'Second'}
    , {text: 'Third'}
    ])
    test.setNull('colors', [
      {text: 'Red'}
    , {text: 'Orange'}
    , {text: 'Purple'}
    ])
    test.setNull('color', 'Purple')
    page.render()
  })
})

app.ready(function(model) {
  app.on('create:testModal', function(modal) {
    modal.on('close', function(action, cancel) {
      if (!window.confirm('Action: ' + action + '\n\nContinue to close?')) {
        cancel()
      }
    })
  })
  app.showModal = function() {
    model.set('_showModal', true)
  }
})
