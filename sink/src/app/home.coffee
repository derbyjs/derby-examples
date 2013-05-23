app = require './index.coffee'

# Define a view helper functions for use in templates
app.view.fn 'unspace', (s) ->
  s && s.replace /\s/g, ''

app.view.fn 'capitalize', (s) ->
  s && s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

app.get app.pages.home.href, (page, model) ->
  home = model.at 'home'
  home.subscribe (err) ->
    home.setNull 'titleColor', 'black'
    home.setNull 'colors', [
      {name: 'black'}
      {name: 'deep pink'}
      {name: 'lime green'}
      {name: 'coral'}
      {name: 'dark turquoise'}
      {name: 'dark orchid'}
    ]
    page.render 'home'

app.fn 'home',
  select: (e) ->
    @model.set 'home.titleColor', e.get('.name')

app.enter app.pages.home.href, (model) ->
  colors = model.at 'home.colors'
  titleColor = model.at 'home.titleColor'

  # DOM bindings pass in the event object as the last argument
  # when they set a value in the model

  # Set the color of the currently selected option when updating
  # the titleColor to keep that option selected
  titleColor.on 'pre:set', (value, previous, isLocal, e) ->
    titleSelect = document.getElementById 'titleSelect'
    if e && e.target.id == 'titleInput'
      colors.at(titleSelect.selectedIndex).set 'name', value

  # Set the color of the title when updating an option if the
  # option is currently selected
  colors.on 'pre:set', '*.name', (index, value, previous, isLocal, e) ->
    titleSelect = document.getElementById 'titleSelect'
    if e && e.target.className == 'colorInput' && parseInt(index) == titleSelect.selectedIndex
      titleColor.set value
