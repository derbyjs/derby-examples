var scripts = {
  connectionAlert: require('./connectionAlert')
, dropdown: require('./dropdown')
, modal: require('./modal')
}

module.exports = ui
ui.decorate = 'derby'

function ui(derby, options) {
  derby.createLibrary(__filename, scripts, options)
}
