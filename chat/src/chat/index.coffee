# Derby exposes framework features on this module
app = require('derby').createApp module
app.loadViews()
app.loadStyles()

## ROUTES ##

NUM_USER_IMAGES = 10
ONE_DAY = 1000 * 60 * 60 * 24

app.on 'model', (model) ->
  # Defined by name so that it can be re-initialized on the client
  model.fn 'pluckUserIds', (items = {}, additional) ->
    ids = {}
    ids[additional] = true if additional
    for key, item of items
      ids[item.userId] = true if item?.userId
    return Object.keys ids

app.get '/:room?', (page, model, {room}, next) ->
  # Only handle URLs that use alphanumberic characters, underscores, and dashes
  return page.redirect '/lobby' unless room && /^[a-zA-Z0-9_-]+$/.test room
  model.set '_page.room', room

  messagesQuery = model.query 'messages',
    room: room
    # time: {$gt: new Date - ONE_DAY}

  messagesQuery.subscribe (err) ->
    return next err if err

    # Subscribe to all displayed userIds, including the userIds associated
    # with each message and the current session's userId
    model.start 'pluckUserIds', '_page.userIds', 'messages', '_session.userId'
    usersQuery = model.query 'users', '_page.userIds'
    usersQuery.subscribe (err) ->
      return next err if err

      user = model.ref '_page.user', 'users.' + model.get('_session.userId')

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

app.component 'messages', class Messages
  # Called on both the server and the client before rendering
  init: (model) ->
    # Filters and sorts get computed in the client, so messages will appear
    # immediately even if the client is offline
    timeSort = (a, b) -> a?.time - b?.time
    model.sort('collection', timeSort).ref model.at('list')

  # Called only on the browser after the component and its children are created
  create: (model) ->
    # Scroll to the bottom by default
    @atBottom = true
    # Scoll the page on message insertion or when a new message is loaded by the
    # subscription, which might happen after insertion
    model.on 'all', 'items', =>
      # Don't auto-scroll the page if the user has scrolled up from the bottom
      return unless @atBottom
      @container.scrollTop = @list.offsetHeight

  scroll: ->
    # Update whether the user scrolled up from the bottom or not
    bottom = @list.offsetHeight
    containerHeight = @container.offsetHeight
    scrollBottom = @container.scrollTop + containerHeight
    @atBottom = bottom < containerHeight || scrollBottom > bottom - 100

app.fn 'count', (value = {}) ->
  return Object.keys(value).length

months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
app.fn 'displayTime', (message) ->
  time = message && message.time
  return unless time
  time = new Date time
  hours = time.getHours()
  period = if hours < 12 then ' am, ' else ' pm, '
  hours = (hours % 12) || 12
  minutes = time.getMinutes()
  minutes = '0' + minutes if minutes < 10
  return hours + ':' + minutes + period + months[time.getMonth()] +
    ' ' + time.getDate() + ', ' + time.getFullYear()

app.fn 'postMessage', ->
  comment = @model.del '_page.newComment'
  return unless comment
  # Scroll the page regardless when posting
  @atBottom = true
  @model.add 'messages',
    room: @model.get '_page.room'
    userId: @model.get '_session.userId'
    comment: comment
    time: +new Date
