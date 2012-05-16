exports.create = function(model, self) {

  exports.connect = function() {
    // Hide the reconnect link for a second after clicking it
    self.set('hideReconnect', true)
    setTimeout(function() {
      self.set('hideReconnect', false)
    }, 1000)
    model.socket.socket.connect()
  }

  exports.reload = function() {
    window.location.reload()
  }
}
