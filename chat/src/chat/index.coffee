# Derby exposes framework features on this module
app = require('derby').createApp module
# app.loadViews()
# app.loadStyles()

app.views.register('app:Page',
  '<!DOCTYPE html>' +
  '<html>' +
  '<head>' +
    '<meta charset="utf-8">' +
    '<title>{{view $render.prefix + "Title"}}</title>' +
    '{{view $render.prefix + "Styles"}}' +
    '{{view $render.prefix + "Head"}}' +
  '</head>' +
  '<body class="{{bodyClass($render.ns)}}">' +
    '{{view $render.prefix + "Body"}}'
);
app.views.register('app:Styles', '<style id="_css">body,h1,h2,h3,h4,input,pre,select,textarea,th {font: 13px/normal arial, sans-serif;}body,fieldset,form,h1,h2,h3,h4,input,ul,li,ol,p,td,textarea,th {margin: 0;padding: 0;}ul {margin: 0 normal;}table {border-collapse: collapse;}fieldset,img {border: 0;}body {background: #bbb;color: #000;}a {color: #01c;}li {margin: 8px 0;clear: both;}input {-webkit-box-sizing: border-box;-moz-box-sizing: border-box;box-sizing: border-box;margin: 0;padding: 1px;height: 22px;}#page {position: absolute;left: 0;right: 0;top: 0;bottom: 0;overflow: hidden;}#alert {position: absolute;text-align: center;top: 0;left: 0;width: 100%;height: 0;z-index: 99;}#alert > p {background: #fff1a8;border: 1px solid #999;border-top: 0;-webkit-border-radius: 0 0 3px 3px;border-radius: 0 0 3px 3px;display: inline-block;line-height: 21px;padding: 0 12px;}#messages {overflow-y: scroll;-webkit-overflow-scrolling: touch;left: 0;right: 0;top: 0;bottom: 65px;position: absolute;}#messages-list {list-style: none;position: relative;overflow: hidden;}.message,#inputs {margin: 0 8px 0 64px;}.message {background: #fff;-webkit-border-radius: 8px;border-radius: 8px;min-height: 32px;padding: 8px 12px;white-space: pre-wrap;}.time {float: right;color: #888;}.pic {background: url("/img/s.png");width: 48px;height: 48px;position: absolute;left: 0;margin: 0 8px;}.pic0 {background-position: 0 0px;}.pic1 {background-position: 0 -48px;}.pic2 {background-position: 0 -96px;}.pic3 {background-position: 0 -144px;}.pic4 {background-position: 0 -192px;}.pic5 {background-position: 0 -240px;}.pic6 {background-position: 0 -288px;}.pic7 {background-position: 0 -336px;}.pic8 {background-position: 0 -384px;}.pic9 {background-position: 0 -432px;}#foot {background: #ddd;width: 100%;height: 48px;border-top: 1px solid #eee;position: absolute;bottom: 0;padding: 8px 0;}#inputs-form {margin-top: 4px;}#inputs-comment {width: 100%;}</style>');

app.views.register 'app:Title', '''
  Chat ({{count(messages)}}) - {{_page.user.name}}
  '''

app.views.register 'app:Head', '''
  <meta name="viewport" content="width=device-width">
  '''

app.views.register 'app:Body', '''
  <div id="page">
    <view name="chat"
      collection="{{messages}}"
      users="{{users}}"
      user="{{_page.user}}"
      cat="pretty"
      room="{{_page.room}}">
    </view>
  </div>
  <view name="scripts"></view>
  '''

app.views.register 'app:chat', '''
  <div id="messages" as="container" on="scroll: onScroll()">
    <ul id="messages-list" as="list">
      {{each list as #message}}
        <li><view name="chat-message"></view></li>
      {{/}}
    </ul>
  </div>
  <div id="foot">
    <div class="pic {{user.picClass}}"></div>
    <div id="inputs">
      <input id="inputs-name" value="{{user.name}}">
      <form id="inputs-form" on="submit: messages.add()">
        <input id="inputs-comment" value="{{newComment}}" autofocus>
      </form>
    </div>
  </div>
  '''

app.views.register 'app:chat-message', '''
  <div class="pic {{users[#message.userId].picClass}}"></div>
  <div class="message">
    <p class="time">{{displayTime(#message)}}</p>
    <p><b>{{users[#message.userId].name}}</b></p>
    <p>{{#message.comment}}</p>
  </div>
  '''

app.views.register 'app:scripts', '''
  <script>
    (window.onresize = function() {
      var height = document.getElementById('messages-list').offsetHeight;
      document.getElementById('messages').scrollTop = height;
    })();
  </script>
  '''

## ROUTES ##

NUM_USER_IMAGES = 10
ONE_DAY = 1000 * 60 * 60 * 24

app.on 'model', (model) ->
  global.MODEL = model
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
    $limit: 100
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

app.component 'chat', class Chat
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

  onScroll: ->
    # Update whether the user scrolled up from the bottom or not
    bottom = @list.offsetHeight
    containerHeight = @container.offsetHeight
    scrollBottom = @container.scrollTop + containerHeight
    @atBottom = bottom < containerHeight || scrollBottom > bottom - 100

  add: (e) ->
    e.preventDefault()
    console.log('HIHI')
    comment = @model.del 'newComment'
    return unless comment
    # Scroll the page regardless when posting
    @atBottom = true
    @model.add 'collection',
      room: @model.get 'room'
      userId: @model.get 'user.id'
      comment: comment
      time: +new Date

app.proto.count = (value) ->
  return Object.keys(value || {}).length

months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
app.proto.displayTime = (message) ->
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
