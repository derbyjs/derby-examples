app = module.exports = require('derby').createApp 'chat', __filename
app.use require('derby-debug')
app.serverUse module, 'derby-stylus'
app.loadViews __dirname
app.loadStyles __dirname
app.component require('d-connection-alert')
app.component require('d-before-unload')

NUM_USER_IMAGES = 10
ONE_DAY = 1000 * 60 * 60 * 24

getUserPaths = (messages = {}, userId) ->
  paths = ["users.#{userId}"]
  for id, message of messages
    paths.push "users.#{message.userId}"
  return paths

app.get '/:room?', (page, model, {room}, next) ->
  # Only handle URLs that use alphanumberic characters, underscores, and dashes
  return page.redirect '/lobby' unless room && /^[a-zA-Z0-9_-]+$/.test room
  model.set '_page.room', room

  messagesQuery = model.query 'messages',
    room: room
    time: {$gt: new Date - ONE_DAY}

  messagesQuery.subscribe (err) ->
    return next err if err

    messages = model.get 'messages'
    userId = model.get '_session.userId'
    paths = getUserPaths messages, userId
    model.subscribe paths, (err) ->
      return next err if err

      user = model.at "users.#{userId}"
      # Render page if the user already exists
      return page.render() if user.get()

      # Otherwise, initialize user and render
      userCount = model.at 'chat.userCount'
      userCount.fetch (err) ->
        return next err if err
        userCount.create(0) unless userCount.get()?
        userCount.increment (err) ->
          return next err if err
          user.create
            name: 'User ' + userCount.get()
            picClass: 'pic' + (userCount.get() % NUM_USER_IMAGES)
          page.render()

# Called on both the server and the client before rendering
app.proto.init = (model) ->
  # Filters and sorts get computed in the client, so messages will appear
  # immediately even if the client is offline
  timeSort = (a, b) -> a?.time - b?.time
  model.sort('messages', timeSort).ref '_page.list'

# Called only on the browser after rendering
app.proto.create = (model) ->
  # Times are suppressed when server rendering, since we don't know the client's
  # timezone. More ideally, the user's timezone would be stored on the server
  # and passed to the formatTime function
  model.set '_page.showTime', true

  # Scroll to the bottom by default
  @atBottom = true
  # Scoll the page on message insertion or when a new message is loaded by the
  # subscription, which might happen after insertion
  model.on 'all', '_page.list', =>
    # Don't auto-scroll the page if the user has scrolled up from the bottom
    return unless @atBottom
    @container.scrollTop = @list.offsetHeight

  # Subscribe to new users as messages are loaded
  model.on 'load', 'messages.*', =>
    messages = model.get 'messages'
    userId = model.get '_session.userId'
    paths = getUserPaths messages, userId
    model.subscribe paths

app.proto.onScroll = ->
  # Update whether the user scrolled up from the bottom or not
  bottom = @list.offsetHeight
  containerHeight = @container.offsetHeight
  scrollBottom = @container.scrollTop + containerHeight
  @atBottom = bottom < containerHeight || scrollBottom > bottom - 100

app.proto.add = ->
  comment = @model.del '_page.newComment'
  return unless comment
  # Scroll the page regardless when posting
  @atBottom = true
  @model.add 'messages',
    room: @model.get '_page.room'
    userId: @model.get '_session.userId'
    comment: comment
    time: +new Date

app.proto.count = (value) ->
  return Object.keys(value || {}).length

MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
app.proto.formatTime = (message) ->
  time = message && message.time
  return unless time
  time = new Date time
  hours = time.getHours()
  period = if hours < 12 then ' am, ' else ' pm, '
  hours = (hours % 12) || 12
  minutes = time.getMinutes()
  minutes = '0' + minutes if minutes < 10
  return hours + ':' + minutes + period + MONTHS[time.getMonth()] +
    ' ' + time.getDate() + ', ' + time.getFullYear()
