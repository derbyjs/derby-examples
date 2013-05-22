app = require('derby').createApp module

## REACTIVE FUNCTIONS ##

app.view.fn 'remaining', (todos) ->
  remaining = 0
  for todo in todos || []
    remaining++ if todo && !todo.completed
  return remaining


## ROUTES ##

app.get '/', (page) ->
  page.redirect '/home'

app.get '/:groupName', (page, model, {groupName}, next) ->
  # Only handle URLs that use alphanumberic characters, underscores, and dashes
  return next() unless /^[a-zA-Z0-9_-]+$/.test groupName

  group = model.at "groups.#{groupName}"
  group.subscribe (err) ->
    return next err if err

    # Create some todos if this is a new group
    todoIds = group.at 'todoIds'
    unless todoIds.get()
      id0 = model.add 'todos', {completed: true, text: 'Done already'}
      id1 = model.add 'todos', {completed: false, text: 'Example todo'}
      id2 = model.add 'todos', {completed: false, text: 'Another example'}
      todoIds.set [id1, id2, id0]

    # Queries may be specified in terms of a Mongo query or a model path that
    # contains an id or list of ids
    model.query('todos', todoIds).subscribe (err) ->
      return next err if err

      # Create a two-way updated list with todos as items
      list = model.refList '_page.list', 'todos', todoIds

      page.render()


## CONTROLLER FUNCTIONS ##

app.fn
  add: ->
    # Don't add a blank todo
    text = @newTodo.get()
    return unless text
    @newTodo.del()
    # Insert the new todo before the first completed item in the list
    # or append to the end if none are completed
    for todo, i in @list.get()
      break if todo?.completed
    @list.insert i, {text, completed: false}
  del: (e) ->
    e.at().remove()

app.ready (model) ->
  @list = model.at '_page.list'
  @newTodo = model.at '_page.newTodo'

  # Make the list draggable using jQuery UI
  from = null
  ul = $('#todos')
  ul.sortable
    handle: '.handle'
    axis: 'y'
    containment: '#dragbox'
    start: (e, ui) =>
      item = ui.item[0]
      from = ul.children().index(item)
    update: (e, ui) =>
      item = ui.item[0]
      to = ul.children().index(item)
      # Use the Derby ignore option to suppress the normal move event
      # binding, since jQuery UI will move the element in the DOM.
      # Also, note that refList index arguments can either be an index
      # or the item's id property
      @list.pass(ignore: item.id).move from, to

  @list.on 'change', '*.completed', (i, completed, previous, isLocal) =>
    # Move the item to the bottom if it was checked off
    @list.move i, -1  if completed && isLocal
