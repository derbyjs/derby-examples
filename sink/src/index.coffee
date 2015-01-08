app = module.exports = require('derby').createApp 'sink', __filename
app.use require('derby-debug')
app.serverUse module, 'derby-stylus'
app.loadViews __dirname + '/../views'
app.loadStyles __dirname + '/../styles'
app.component require('d-connection-alert')
app.component require('d-before-unload')

require './pages'

require './bench'
require './live-css'
require './home'
require './leaderboard'
require './table'

['get', 'post', 'put', 'del'].forEach (method) ->
  app[method] app.pages.submit.href, (page, model, {body, query}) ->
    argsJson = JSON.stringify {method, body, query}, null, '  '
    model.set '_page.args', argsJson
    page.render 'submit'

app.get app.pages.error.href, ->
  throw new Error 500

app.get app.pages.back.href, (page) ->
  page.redirect 'back'
