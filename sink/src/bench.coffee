app = require './index'

app.get app.pages.bench.href, (page) ->
  page.render 'bench'

app.component 'bench:circles', class BenchCircles
  init: (model) ->
    @n = model.get('n') || 100
    @boxes = model.at 'boxes'
    boxes = (new Box(0) for i in [0...@n])
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

  setAll: ->
    previous = @boxes.get()
    boxes = (new Box(box.count + 1) for box in previous)
    @boxes.set boxes

class Box
  constructor: (count) ->
    this.count = count
    this.top = Math.sin(count / 10) * 10
    this.left = Math.cos(count / 10) * 10
    this.color = count % 255
    this.content = count % 100
