app = require './index.coffee'

app.view.fn 'cssProperty', (style) ->
  if style.active then "#{style.prop || ''}: #{style.value || ''};" else ''

app.view.fn 'hasActiveStyles', (styles) ->
  for style in styles || []
    return true if style.active
  return false

app.get app.pages.liveCss.href, (page, model, params, next) ->
  liveCss = model.at 'liveCss'
  liveCss.subscribe (err) ->
    return next err if err
    liveCss.setNull 'styles', [
      {prop: 'color', value: '#c00', active: true}
      {prop: 'font-weight', value: 'bold', active: true}
      {prop: 'font-size', value: '18px', active: false}
    ]
    liveCss.setNull 'outputText', 'Edit this text...'
    page.render 'liveCss'

# This is a transition route, which defines how to apply an update
# without re-rendering the entire page. Note that going directly to
# '/live-css/popout' will first call the route above and then call
# the forward route below before rendering
app.get from: app.pages.liveCss.href, to: app.pages.liveCss.href + '/popout',
  forward: (model) ->
    model.set '_page.poppedOut', true
  back: (model) ->
    model.del '_page.poppedOut'

app.fn 'liveCss',
  addStyle: ->
    @model.push 'liveCss.styles', {}
  deleteStyle: (e) ->
    e.at().remove()
