app = require './index'

route = app.pages.liveCss.href + '/:popped(popout)?'

app.get route, (page, model, params, next) ->
  data = model.at 'sink.liveCss'
  data.subscribe (err) ->
    return next err if err
    data.createNull
      styles: [
        {prop: 'color', value: '#c00', active: true}
        {prop: 'font-weight', value: 'bold', active: true}
        {prop: 'font-size', value: '18px', active: false}
      ]
      outputText: 'Edit this text...'
    page.render 'live-css'

app.get from: route, to: route, ->
  # This is a transition route, which defines how to apply an update
  # without re-rendering the entire page. Since we've bound to the
  # render parameters directly, we don't need to do anything

app.component 'live-css', class LiveCss
  init: (model) ->
    model.ref 'poppedOut', model.scope('$render.params.popped')
    styles = model.ref 'styles', model.scope('sink.liveCss.styles')
    outputText = model.ref 'outputText', model.scope('sink.liveCss.outputText')

  addStyle: ->
    @model.push 'styles', {}

  deleteStyle: (i) ->
    @model.remove 'styles', i

  hasActiveStyles: (styles) ->
    for style in styles || []
      return true if style.active
    return false
