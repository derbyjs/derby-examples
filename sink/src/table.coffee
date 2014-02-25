app = require './index'
app.component require '../components/sortable-table'

app.get app.pages.table.href, (page, model, params, next) ->
  model.subscribe 'sink.table', (err) ->
    return next err if err
    page.render 'table'

app.component 'table', class TableEditor
  init: (model) ->
    @table = model.scope 'sink.table'
    model.ref 'table', @table

  onRowMove: (from, to) ->
    @table.move from, to

  onColMove: (from, to) ->
    row = @table.get 'length'
    while row--
      @table.move row + '.cells', from, to
    return

  addRow: ->
    cells = []
    col = @table.get '0.cells.length'
    while col--
      cells.push {}
    @table.push {cells}

  addCol: ->
    row = @table.get 'length'
    while row--
      @table.push row + '.cells', {}
    return

  deleteRow: (i) ->
    @table.remove i

  deleteCol: (i) ->
    row = @table.get 'length'
    while row--
      @table.remove row + '.cells', i
    return

  colName: (num, out = '') ->
    mod = num % 26
    out = String.fromCharCode(65 + mod) + out
    return if num = Math.floor num / 26
      @colName num - 1, out
    else
      out
