var config = {
  styles: '../styles/ui'
, scripts: {
    connectionAlert: require('./connectionAlert')
  }
};

config.filename = __filename

module.exports = ui

function ui(derby, options) {
  derby.createLibrary(config, options)
}
