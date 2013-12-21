app = require('derby').createApp()
app.loadViews __dirname + '/../../views/error'
app.loadStyles __dirname + '/../../styles/error'

module.exports = ->
  return (err, req, res, next) ->
    return next() unless err?

    message = err.message || err.toString()
    status = parseInt message
    status = if 400 <= status < 600 then status else 500

    if status < 500
      console.log err.message || err
    else
      console.log err.stack || err

    page = app.createPage req, res
    page.renderStatic status, status.toString()
