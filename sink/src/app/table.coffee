app = require './index.coffee'
sortableTable = require './sortableTable.coffee'

app.get app.pages.tableEditor.href, (page, model, params, next) ->
  table = model.at 'sink.table'
  table.subscribe (err) ->
    return next err if err
    table.setNull
      rows: [
        {name: 1, cells: [{}, {}, {}]}
        {name: 2, cells: [{}, {}, {}]}
      ]
      lastRow: 1
      cols: [
        {name: 'A'}
        {name: 'B'}
        {name: 'C'}
      ]
      lastCol: 2
    page.render 'tableEditor'


app.ready (model) ->

  table = model.at 'sink.table'
  rows = table.at 'rows'
  cols = table.at 'cols'

  app.tableEditor =
    deleteRow: (e, el) ->
      model.at(el).remove()

    deleteCol: (e, el) ->
      # TODO: Make these move operations atomic when Racer has atomic support
      i = model.at(el).leaf()
      row = rows.get 'length'
      while row--
        rows.at(row + '.cells').remove i
      cols.remove i

    addRow: ->
      name = table.increment('lastRow') + 1
      cells = []
      col = cols.get 'length'
      while col--
        cells.push {}
      rows.push {name, cells}

    addCol: ->
      row = rows.get 'length'
      while row--
        rows.at(row + '.cells').push {}
      name = alpha table.increment('lastCol')
      cols.push {name}

  alpha = (num, out = '') ->
    mod = num % 26
    out = String.fromCharCode(65 + mod) + out
    if num = Math.floor num / 26
      return alpha num - 1, out
    else
      return out

  sortableTable.init app, app.tableEditor,
    onRowMove: (from, to) ->
      rows.move from, to
    onColMove: (from, to) ->
      # TODO: Make these move operations atomic when Racer has atomic support
      cols.move from, to
      row = rows.get 'length'
      while row--
        rows.at(row + '.cells').move from, to
