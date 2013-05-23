app = require './index.coffee'

# Leaderboard = app.ViewModel '_page',
#   init: ->
#     # Create list of players sorted in descending order by score
#     @ref 'list', @page.players.sort ['score', 'desc']
#     # A reference to the currently selected player
#     @ref 'selected', @page.players, @at('selectedId')

# Players = app.ViewModel 'players',
#   init: ->
#     # Don't do anything if already created
#     return if @get()
    
#     return
#   add: (name) ->
#     @_super.add {name, score: randomScore()}

# randomScore = -> Math.floor(Math.random() * 20) * 5

app.get app.pages.leaderboard.href, (page, model, params, next) ->
  players = model.at 'players'
  players.subscribe (err) ->
    return next err if err
    unless players.get()
      # Add some default players
      @add name for name in ['Parker Blue', 'Kelly Green', 'Winston Fairbanks']

    page.render 'leaderboard'

app.enter app.pages.leaderboard.href, (model) ->
  console.log(arguments)

app.fn 'leaderboard',
  add: ->
    name = @_page.del 'newPlayer'
    @players.add name if name
  remove: ->
    id = @_page.get 'selectedId'
    @players.del id

  incr: -> @_page.incr 'selected.score', 5
  decr: -> @_page.incr 'selected.score', -5

  select: (e) ->
    @_page.set 'selectedId', e.get('.id')
  deselect: ->
    @_page.del 'selectedId'
