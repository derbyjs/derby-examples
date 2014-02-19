app = require './index'

# Define a view helper functions for use in templates
app.proto.unspace = (s) ->
  return s if typeof s isnt 'string'
  return s.replace /\s/g, ''

app.proto.capitalize = (s) ->
  return s if typeof s isnt 'string'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

app.get app.pages.home.href, (page, model, params, next) ->
  titleColor = model.at 'home.titleColor'
  colors = model.at 'home.colors'
  model.subscribe titleColor, colors, (err) ->
    return next err if err
    titleColor.setNull 'black'
    colors.setNull [
      {name: 'black'}
      {name: 'deep pink'}
      {name: 'lime green'}
      {name: 'coral'}
      {name: 'dark turquoise'}
      {name: 'dark orchid'}
    ]
    page.render 'home'

# app.enter app.pages.home.href, (model) ->
#   colors = model.at 'home.colors'
#   titleColor = model.at 'home.titleColor'

#   # DOM bindings pass in the event object as the last argument
#   # when they set a value in the model

#   # Set the color of the currently selected option when updating
#   # the titleColor to keep that option selected
#   titleColor.on 'beforeBinding:change', (value, previous, passed) ->
#     return unless passed.$e
#     titleSelect = document.getElementById 'title-select'
#     if passed.$e.target.id == 'title-input'
#       colors.at(titleSelect.selectedIndex).set 'name', value

#   # Set the color of the title when updating an option if the
#   # option is currently selected
#   colors.on 'beforeBinding:change', '*.name', (index, value, previous, passed) ->
#     return unless passed.$e
#     titleSelect = document.getElementById 'title-select'
#     if passed.$e.target.className == 'color-input' && parseInt(index) == titleSelect.selectedIndex
#       titleColor.set value
