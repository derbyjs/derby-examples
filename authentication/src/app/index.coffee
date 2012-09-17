parseUrl = require('url').parse
{get, view, ready} = app = require('derby').createApp module


get "/", (page, model, params)->
  page.render "home"

ready (model) ->
  window.model = model

  model.set '_showReconnect', true
  app.connect = ->
    model.set '_showReconnect', false
    setTimeout (-> model.set '_showReconnect', true), 1000
    model.socket.socket.connect()
  app.reload = -> window.location.reload()
