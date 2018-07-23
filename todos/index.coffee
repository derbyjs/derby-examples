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

  # Subscribe to the data for the todo list
  group = model.at "groups.#{groupName}"
  todosQuery = model.query 'todos', {group: groupName}
  model.subscribe group, todosQuery, (err) ->
    return next err if err

    unless group.get()?
      # Create some todos if this is a new group
      id0 = model.add 'todos', {group: groupName, completed: true, text: 'Done already'}
      id1 = model.add 'todos', {group: groupName, completed: false, text: 'Example todo'}
      id2 = model.add 'todos', {group: groupName, completed: false, text: 'Another example'}
      group.create {
        todoIds: [id1, id2, id0]
      }

    # Once we have the data loaded, render the page
    page.render()


## CONTROLLER FUNCTIONS ##

app.component 'todo-list', class TodoList

  init: ->
    # getAttribute() should be used to get inputs passed into components via
    # attributes. It is also possible to get values from the component's
    # model. Using getAttribute is preferred for getting attribute inputs.
    # This is because if a template is passsed in, getAttribute() will render
    # it into a string, whereas the model will return a Template object
    @groupName = @getAttribute 'groupName'
    # It is recommended practice to create scoped models for any paths that
    # will be used within a component in its init method. This makes it clear
    # on reading the code what the component's controller may read or modify
    @newTodo = @model.at 'newTodo'
    # model.at() and model.scope() both return a scoped model. The difference
    # is that model.at() is relative to the current model scope and
    # model.scope() is absolute from the root scope
    @todoIds = @model.scope "groups.#{@groupName}.todoIds"
    @todos = @model.scope 'todos'

    # Create a reference to the todoIds path for use in the view
    @model.ref 'todoIds', @todoIds

    # Reactive model functions are commonly used to calcuate computed values
    # for use in views
    @model.start 'remainingTodos', @todoIds, @todos, (ids, todos) ->
      remaining = 0
      return remaining unless ids && todos
      for id in ids
        todo = todos[id]
        remaining++ if todo && !todo.completed
      return remaining

  create: ->
    # create() is called on the client only. This will load jQuery in the
    # browser and not on the server
    require './vendor/jquery-1.9.1.min'
    require './vendor/jquery-ui-1.10.3.custom.min'

    # Make the list draggable using jQuery UI
    container = $(@todosContainer)
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
        node = @todosContainer.childNodes[1]
        if node.nodeType == 8
          node.parentNode.insertBefore node, @todosContainer.firstChild

        from = container.children().index(ui.item)
        # Move the item in the model, which will also update the DOM binding
        @todoIds.move from, to

    # Move a todo to the bottom if it was checked off
    @todos.on 'change', '*.completed', (id, completed, previous, isLocal) =>
      return unless completed && isLocal
      i = @todoIds.get()?.indexOf id
      return unless i >= 0
      # Move id from the current position to the end of the list
      @todoIds.move i, -1

  add: ->
    # Clear input
    text = @newTodo.del()
    # Don't add a blank todo
    return unless text

    # Create a new document in the todos collection
    addedId = @todos.add
      group: @groupName
      completed: false
      text: text

    # Insert the new todo before the first completed item in the list or
    # append to the end if none are completed
    for id, i in @todoIds.get()
      break if @todos.at("#{id}.completed").get()
    @todoIds.insert i, addedId

  remove: (i) ->
    [id] = @todoIds.remove i
    @todos.del id
