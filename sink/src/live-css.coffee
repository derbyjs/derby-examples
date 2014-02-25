app = require './index'

app.get app.pages.liveCss.href, (page, model, params, next) ->
  model.subscribe 'liveCss.styles', 'liveCss.outputText', (err) ->
    return next err if err
    page.render 'live-css'

# This is a transition route, which defines how to apply an update
# without re-rendering the entire page. Note that going directly to
# '/live-css/popout' will first call the route above and then call
# the forward route below before rendering
app.get from: app.pages.liveCss.href, to: app.pages.liveCss.href + '/popout',
  forward: (model) ->
    model.set '_page.poppedOut', true
  back: (model) ->
    model.del '_page.poppedOut'

app.component 'live-css', class LiveCss
  init: (model) ->
    model.ref 'poppedOut', model.scope('_page.poppedOut')
    styles = model.ref 'styles', model.scope('liveCss.styles')
    outputText = model.ref 'outputText', model.scope('liveCss.outputText')

    styles.setNull [
      {prop: 'color', value: '#c00', active: true}
      {prop: 'font-weight', value: 'bold', active: true}
      {prop: 'font-size', value: '18px', active: false}
    ]
    outputText.setNull 'Edit this text...'

  addStyle: ->
    @model.push 'styles', {}

  deleteStyle: (i) ->
    @model.remove 'styles', i

  cssProperty: (style) ->
    if style.active then "#{style.prop || ''}: #{style.value || ''};" else ''

  hasActiveStyles: (styles) ->
    for style in styles || []
      return true if style.active
    return false
