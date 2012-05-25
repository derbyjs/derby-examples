exports.create = function(self, dom) {
  function close(button) {
    var cancelled = self.trigger('close', button)
    if (cancelled) return
    self.set('show', false)
  }

  dom.addListener(document, 'keydown', function(e) {
    if (e.keyCode === 27) {  // Escape
      close('escape')
    }
  })

  exports.click = function(e) {
    var button = e.target.getAttribute('data-button')
    if (button) close(button)
  }
}
