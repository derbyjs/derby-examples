exports.create = function(self) {

  exports.connect = function() {
    // Hide the reconnect link for a second after clicking it
    self.set('hideReconnect', true)
    setTimeout(function() {
      self.set('hideReconnect', false)
    }, 1000)
    self.socket.socket.connect()
  }

  exports.reload = function() {
    window.location.reload()
  }
}
