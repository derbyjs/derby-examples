exports.create = function(model, self) {

  exports.click = function(e) {
    var button = e.target.getAttribute('data-button')
      , cancelled
    if (!button) return
    cancelled = self.trigger('close', button)
    if (cancelled) return
    self.set('show', false)
  }
}
