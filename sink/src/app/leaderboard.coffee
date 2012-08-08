{get, ready, view} = app = require './index'
{render} = require './shared'

randomScore = -> Math.floor(Math.random() * 20) * 5

addPlayer = (players, name) ->
  players.add {name, score: randomScore()}

get '/leaderboard', (page, model) ->
  model.subscribe 'sink.leaderboard', (err, leaderboard) ->
    players = leaderboard.at 'players'
    unless players.get()
      for name in ['Parker Blue', 'Kelly Green', 'Winston Fairbanks']
        addPlayer players, name

    # Create list of players sorted in descending order by score
    list = players.sort ['score', 'desc']
    leaderboard.ref '_list', list

    leaderboard.ref '_selected', players, leaderboard.at('_selectedId')
    render page, 'leaderboard'


ready (model) ->
  leaderboard = model.at 'sink.leaderboard'
  players = leaderboard.at 'players'
  newPlayer = leaderboard.at '_newPlayer'
  selectedId = leaderboard.at '_selectedId'
  selected = leaderboard.at '_selected'

  app.leaderboard =
    add: ->
      return unless name = newPlayer.get()
      addPlayer players, name
      newPlayer.set ''
    remove: ->
      id = selected.get 'id'
      players.del id

    incr: -> selected.incr 'score', 5
    decr: -> selected.incr 'score', -5

    select: (e, el) ->
      id = model.at(el).get 'id'
      selectedId.set id
    deselect: ->
      selectedId.set null
