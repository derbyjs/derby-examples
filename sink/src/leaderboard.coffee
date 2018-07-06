app = require './index'

randomScore = -> Math.floor(Math.random() * 20) * 5

app.get app.pages.leaderboard.href, (page, model, params, next) ->
  model.query('players', {$sort: {score: -1, name: 1}, $limit: 10}).subscribe (err) ->
    return next err if err
    page.render 'leaderboard'

app.component 'leaderboard', class Leaderboard
  init: (model) ->
    @players = model.root.at 'players'
    model.ref 'list', @players.sort {limit: 5}, (a, b) ->
      # Guard against null values
      return 0 unless a && b
      # Sort first by score, descending
      return 1 if a.score < b.score
      return -1 if a.score > b.score
      # Sort second by name, ascending
      return 1 if a.name > b.name
      return -1 if a.name < b.name
      return 0

  create: ->
    @dom.on 'click', (e) =>
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
