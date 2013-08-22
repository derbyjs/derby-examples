var config = {
  ns: 'boot'
, filename: __filename
, scripts: {
    dropdown: require('./dropdown')
  , modal: require('./modal')
  , tabs: require('./tabs')
  , tab: {}
  }
}

module.exports = function(app, options) {
  var outConfig = Object.create(config)
  outConfig.styles = options && options.styles ||
    __dirname + '/bootstrap-css/bootstrap.min'
  app.createLibrary(outConfig, options)
}
