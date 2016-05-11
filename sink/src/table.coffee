app = require './index'
app.component require '../components/sortable-table'

app.get app.pages.table.href, (page, model, params, next) ->
  model.subscribe 'sink.table', (err) ->
    return next err if err
    model.createNull 'sink.table', {rows: []}
    page.render 'table'

app.component 'table', class TableEditor
  init: (model) ->
    @rows = model.scope 'sink.table.rows'
    model.ref 'table', @rows

  onRowMove: (from, to) ->
    @rows.move from, to

  onColMove: (from, to) ->
    row = @rows.get 'length'
    while row--
      @rows.move row + '.cells', from, to
    return

  addRow: ->
    cells = []
    col = @rows.get '0.cells.length'
    while col--
      cells.push {}
    @rows.push {cells}

  addCol: ->
    row = @rows.get 'length'
    while row--
      @rows.push row + '.cells', {}
    return

  deleteRow: (i) ->
    @rows.remove i

  deleteCol: (i) ->
    row = @rows.get 'length'
    while row--
      @rows.remove row + '.cells', i
    return

  colName: (num, out = '') ->
    mod = num % 26
    out = String.fromCharCode(65 + mod) + out
    return if num = Math.floor num / 26
      @colName num - 1, out
    else
      out
