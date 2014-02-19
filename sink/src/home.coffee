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

app.proto.colorInputValue =
  get: (name, titleColor) -> name
  set: (value, name, titleColor) ->
    return if name == titleColor then [value, value] else [value]

app.proto.titleInputValue =
  get: (titleColor) -> titleColor
  set: (value, titleColor) ->
    for color, i in @model.get('home.colors') || []
      if color.name == titleColor
        @model.setDiff 'home.colors.' + i + '.name', value
    return [value]
