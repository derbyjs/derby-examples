var path = require('path')
var derby = require('derby')
var isProduction = derby.util.isProduction

module.exports = function() {
  var staticPages = derby.createStatic(path.dirname(path.dirname(__dirname)))

  return function(err, req, res, next) {
    if (err == null) return next()

    console.log(err.stack ? err.stack : err)

    // Customize error handling here
    var message = err.message || err.toString()
      , status = parseInt(message)
    if (status === 404) {
      staticPages.render('404', res, {url: req.url}, 404)
    } else {
      res.send( ((status >= 400) && (status < 600)) ? status : 500)
    }
  }
}
