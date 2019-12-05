class Chrome {
  getYear(ts) {
    return new Date(ts).getFullYear();
  }
}

Chrome.view = {
  file: __dirname + '/chrome',
  dependencies: [
    require('d-connection-alert'),
    require('d-before-unload')
  ]
};
module.exports = Chrome;
