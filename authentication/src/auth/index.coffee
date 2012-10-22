derby = require 'derby'
{get, view, ready} = derby.createApp module

derby.use(require '../../ui')

# Sets up the model, the reactive function for stats and renders the todo list
get '/', (page, model) ->
	model.subscribe "users.#{model.session.userId}", (err, user) ->
		model.ref '_user', user
		page.render()

ready (model) ->
	#nothing here