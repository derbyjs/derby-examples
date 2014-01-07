app = require './index'

randomScore = -> Math.floor(Math.random() * 20) * 5

app.get app.pages.leaderboard.href, (page, model, params, next) ->
  model.query('players', {$orderby: {score: -1}, $limit: 5}).subscribe (err) ->
    return next err if err
    page.render 'leaderboard'

app.component 'leaderboard:content', class Leaderboard
  init: (model) ->
    @players = model.root.at 'players'
    filter = model.sort @players, (a, b) -> b?.score - a?.score
    filter.ref model.at('list')

  create: ->
    @dom.on document, 'click', (e) =>
      @deselect() unless @board.contains e.target

  add: ->
    name = @model.del 'newPlayer'
    @players.add {name, score: randomScore()} if name
  remove: ->
    @model.del 'selected'
  increment: (byNum) ->
    @model.increment 'selected.score', byNum

  select: (player) ->
    @model.ref 'selected', @players.at player.id
  deselect: ->
    @model.removeRef 'selected'
