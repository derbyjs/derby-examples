app = require './index.coffee'

randomScore = -> Math.floor(Math.random() * 20) * 5

app.get app.pages.leaderboard.href, (page, model, params, next) ->
  playersQuery = model.query 'players', {$orderby: {score: -1}, $limit: 5}
  playersQuery.subscribe (err) ->
    return next err if err
    list = playersQuery.ref '_page.list'
    page.render 'leaderboard'

app.enter app.pages.leaderboard.href, (model) ->
  model.on 'change', '_page.selectedId', (id) ->
    if id
      model.ref '_page.selected', 'players.' + id
    else
      model.removeRef '_page.selected'

app.fn 'leaderboard',
  add: ->
    name = @model.del '_page.newPlayer'
    @model.add 'players', {name, score: randomScore()} if name
  remove: ->
    @model.del '_page.selected'

  increment: ->
    @model.increment '_page.selected.score', 5
  decrement: ->
    @model.increment '_page.selected.score', -5

  select: (e) ->
    @model.set '_page.selectedId', e.get('.id')
  deselect: ->
    @model.del '_page.selectedId'
