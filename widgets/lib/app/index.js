var derby = require('derby')
  , app = derby.createApp(module)
  , get = app.get
  , ui = require('./ui')

// TODO: Figure out how to make browserify allow components to be in root directory
derby.use(ui)

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
