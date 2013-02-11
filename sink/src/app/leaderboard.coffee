app = require './index'

Leaderboard = app.Collection '_leaderboard',
  init: ->
    # Create list of players sorted in descending order by score
    @ref 'list', @page.players.sort ['score', 'desc']
    # A reference to the currently selected player
    @ref 'selected', @page.players, @at('selectedId')

Players = app.Collection 'players',
  init: ->
    # Don't do anything if already created
    return if @get()
    # Add some default players
    @add name for name in ['Parker Blue', 'Kelly Green', 'Winston Fairbanks']
    return
  add: (name) ->
    @_super.add {name, score: randomScore()}

randomScore = -> Math.floor(Math.random() * 20) * 5


app.get app.pages.leaderboard.href, (page, model) ->
  model.subscribe Players, ->
    page.init Leaderboard, Players
    page.render 'leaderboard'

app.fn 'leaderboard',
  add: ->
    name = @_leaderboard.del 'newPlayer'
    @players.add name if name
  remove: ->
    id = @_leaderboard.get 'selectedId'
    @players.del id

  incr: -> @_leaderboard.incr 'selected.score', 5
  decr: -> @_leaderboard.incr 'selected.score', -5

  select: (e) ->
    @_leaderboard.set 'selectedId', e.get('.id')
  deselect: ->
    @_leaderboard.del 'selectedId'
