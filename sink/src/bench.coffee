app = require './index'

app.get app.pages.bench.href, (page) ->
  page.render 'bench'

app.component 'bench:circles', class BenchCircles
  init: (model) ->
    @n = model.get('n') || 100
    boxes = []
    for i in [0...@n]
      boxes.push
        count: 0
        top: 0
        left: 0
        color: 0
        content: 0
    @boxes = model.at 'boxes'
    @boxes.set boxes
    model.set 'modes', ['setAll', 'setBox', 'setProperty']

  start: (mode) ->
    clearTimeout @timeout
    @model.set 'mode', mode
    @fn = this[mode]
    @frames = 0
    @startTime = +new Date
    @run()

  stop: ->
    clearTimeout @timeout

  run: ->
    @fn()
    if @frames++ == 20
      fps = @frames * 1000 / (new Date - @startTime)
      @model.set 'fps', fps.toFixed(1)
      @frames = 0
      @startTime = +new Date
    @timeout = setTimeout =>
      @run()
    , 0

  tickProperty: (box) ->
    count = box.increment 'count'
    box.set 'top', Math.sin(count / 10) * 10
    box.set 'left', Math.cos(count / 10) * 10
    box.set 'color', count % 255
    box.set 'content', count % 100
  setProperty: ->
    for i in [0...@n]
      @tickProperty @boxes.at(i)
    return

  tickBox: (box) ->
    count = box.get('count') + 1
    box.set
      count: count
      top: Math.sin(count / 10) * 10
      left: Math.cos(count / 10) * 10
      color: count % 255
      content: count % 100
  setBox: ->
    for i in [0...@n]
      @tickBox @boxes.at(i)
    return

  boxValue: (box, i) ->
    count = box.count + 1
    return {
      count: count
      top: Math.sin(count / 10) * 10
      left: Math.cos(count / 10) * 10
      color: count % 255
      content: count % 100
    }
  setAll: ->
    previous = @boxes.get()
    value = []
    for box, i in previous
      value.push @boxValue(box, i)
    @boxes.set value
