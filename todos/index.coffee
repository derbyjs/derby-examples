app = module.exports = require('derby').createApp 'todos', __filename
app.use require('derby-debug')
app.serverUse module, 'derby-stylus'
app.loadViews __dirname
app.loadStyles __dirname
app.component require('d-connection-alert')
app.component require('d-before-unload')


## ROUTES ##

app.get '/', (page) ->
  page.redirect '/home'

app.get '/:groupName', (page, model, {groupName}, next) ->
  # Only handle URLs that use alphanumberic characters, underscores, and dashes
  return next() unless /^[a-zA-Z0-9_-]+$/.test groupName

  group = model.at "groups.#{groupName}"
  group.subscribe (err) ->
    return next err if err

    unless group.get()?
      # Create some todos if this is a new group
      id0 = model.add 'todos', {group: groupName, completed: true, text: 'Done already'}
      id1 = model.add 'todos', {group: groupName, completed: false, text: 'Example todo'}
      id2 = model.add 'todos', {group: groupName, completed: false, text: 'Another example'}
      group.create {
        todoIds: [id1, id2, id0]
      }

    model.query('todos', {group: groupName}).subscribe (err) ->
      return next err if err

      # Create a two-way updated list with todos as items
      list = model.refList '_page.list', 'todos', group.at('todoIds')

      page.render()


## CONTROLLER FUNCTIONS ##

app.proto.create = (model) ->
  require './vendor/jquery-1.9.1.min'
  require './vendor/jquery-ui-1.10.3.custom.min'

  @list = model.at '_page.list'
  @newTodo = model.at '_page.newTodo'

  # Make the list draggable using jQuery UI
  container = $('#todos')
  container.sortable
    handle: '.handle'
    axis: 'y'
    containment: '#dragbox'
    update: (e, ui) =>
      # Get the index of the new position
      to = container.children().index(ui.item)
      # Move the item back to its original position and get the index, so that
      # the current order in the DOM is consistent with the model
      container.sortable('cancel')
      # jQuery sortable messes up the order of the comment that marks the each
      # block on canceling. Hack to move the comment back into place if needed
      node = container[0].childNodes[1]
      if node.nodeType == 8
        node.parentNode.insertBefore node, node.previousSibling

      from = container.children().index(ui.item)
      # Move the item in the model, which will also update the DOM binding
      @list.move from, to

  @list.on 'change', '*.completed', (i, completed, previous, isLocal) =>
    # Move the item to the bottom if it was checked off
    @list.move i, -1  if completed && isLocal

app.proto.add = ->
  # Don't add a blank todo
  text = @newTodo.get()
  return unless text
  @newTodo.del()
  # Insert the new todo before the first completed item in the list
  # or append to the end if none are completed
  for todo, i in @list.get()
    break if todo?.completed
  groupName = @model.get '$render.params.groupName'
  todo = {group: groupName, completed: false, text: text}
  @model.add 'todos', todo
  @list.insert i, todo

app.proto.remove = (i) ->
  @list.remove i

app.proto.remaining = (todos) ->
  remaining = 0
  for todo in todos || []
    remaining++ if todo && !todo.completed
  return remaining
