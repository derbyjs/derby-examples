// self is a scoped model underneath _$component.{uid}

// Components must export a create function, which only runs
// in the browser
exports.create = function(model, self, dom, elements) {
  var toggle = elements.toggle
    , menu = elements.menu
    , open = self.at('open')

  // Listeners added inside of a component are removed when the
  // page is re-rendered client side
  dom.addListener(document.documentElement, 'click', function(e) {
    if (e.target === toggle || menu.contains(e.target)) return
    open.set(false)
  })

  exports.clickToggle = function() {
    open.set(!open.get())
  }

  exports.clickMenu = function(e) {
    var item = model.at(e.target)
      , value = item.get().text
    open.set(false)
    if (value != null) {
      self.set('value', value)
    }
  }
}

// Components may export an init function, which runs on both
// the server and browser before rendering
exports.init = function(model, self) {
  self.setNull('value', self.get('items.0.text'))
}
