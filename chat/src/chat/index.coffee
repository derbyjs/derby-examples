# Derby exposes framework features on this module
app = require('derby').createApp module

## ROUTES ##

NUM_USER_IMAGES = 10

app.get '/:roomName?', (page, model, {roomName}, next) ->
  # Only handle URLs that use alphanumberic characters, underscores, and dashes
  return page.redirect '/lobby' unless /^[a-zA-Z0-9_-]+$/.test roomName

  room = model.at "rooms.#{roomName}"
  users = model.at 'users'
  model.subscribe room, users, (err) ->
    return next err if err
    model.ref '_room', room

    # setNull will set a value if the object is currently null or undefined
    room.setNull 'messages', []

    userId = model.get '_session.userId'
    user = model.ref '_user', users.at(userId)

    # Render page if the user already exists
    return page.render() if user.get()

    # Otherwise, initialize user and render
    userCount = model.at 'chat.userCount'
    userCount.fetch (err) ->
      return next err if err
      userCount.increment (err) ->
        return next err if err
        user.set
          name: 'User ' + userCount.get()
          picClass: 'pic' + (userCount.get() % NUM_USER_IMAGES)
        page.render()

## CONTROLLER FUNCTIONS ##

months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
displayTime = (time) ->
  time = new Date time
  hours = time.getHours()
  period = if hours < 12 then ' am, ' else ' pm, '
  hours = (hours % 12) || 12
  minutes = time.getMinutes()
  minutes = '0' + minutes if minutes < 10
  return hours + ':' + minutes + period + months[time.getMonth()] +
    ' ' + time.getDate() + ', ' + time.getFullYear()

app.view.fn 'displayTime', (message) ->
  return message && displayTime(message.time)

app.fn 'postMessage', ->
  comment = @model.get '_page.newComment'
  return unless comment
  @model.push '_room.messages',
    userId: @model.get '_session.userId'
    comment: comment
    time: +new Date
  @model.set '_page.newComment', ''

app.view.inline ->
  do window.onresize = ->
    height = document.getElementById('messageList').offsetHeight
    document.getElementById('messages').scrollTop = height

app.ready (model) ->
  messages = document.getElementById 'messages'
  messageList = document.getElementById 'messageList'

  atBottom = true
  @dom.addListener messages, 'scroll', (e) ->
    bottom = messageList.offsetHeight
    containerHeight = messages.offsetHeight
    scrollBottom = messages.scrollTop + containerHeight
    atBottom = bottom < containerHeight || scrollBottom > bottom - 100

  # Regular model mutator events are emitted after both the model and view
  # bindings have been updated
  model.on 'insert', '_room.messages', (index, values, isLocal) ->
    # Scoll page when adding a message or when another user adds a message
    # and the page is already at the bottom
    if isLocal || atBottom
      messages.scrollTop = messageList.offsetHeight
