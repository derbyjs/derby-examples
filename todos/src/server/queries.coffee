store = require('./index').store

store.query.expose 'todos', 'forGroup', (group) ->
  @where('group').equals(group)
