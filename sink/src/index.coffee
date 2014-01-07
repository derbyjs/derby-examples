app = module.exports = require('derby').createApp 'sink', __filename
app.loadViews __dirname + '/../views'
app.loadStyles __dirname + '/../styles'
app.component require('d-connection-alert')
app.component require('d-before-unload')

require './pages'

require './bench'
require './home'
require './leaderboard'
# require './live-css'
# require './table'

# ['get', 'post', 'put', 'del'].forEach (method) ->
#   app[method] app.pages.submit.href, (page, model, {body, query}) ->
#     args = JSON.stringify {method, body, query}, null, '  '
#     page.render 'submit', {args}

# app.get app.pages.error.href, ->
#   throw new Error 500

# app.get app.pages.back.href, (page) ->
#   page.redirect 'back'
