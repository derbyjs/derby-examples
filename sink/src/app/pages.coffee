app = require './index.coffee'

app.pages =
  home:
    title: 'Home'
    href: '/'
  liveCss:
    title: 'Live CSS'
    href: '/live-css'
  tableEditor:
    title: 'Table editor'
    href: '/table'
  leaderboard:
    title: 'Leaderboard'
    href: '/leaderboard'
  bindingsBench:
    title: 'Bindings benchmark'
    href: '/bindings-bench'
  submit:
    title: 'Submit form'
    href: '/submit'
  back:
    title: 'Back redirect'
    href: '/back'
  error:
    title: 'Error test'
    href: '/error'

navOrder = [
  'home'
  'liveCss'
  'tableEditor'
  'leaderboard'
  'bindingsBench'
  'submit'
  'back'
  'error'
]

app.view.fn 'navItems', (current) ->
  items = []
  for ns in navOrder
    page = app.pages[ns]
    items.push
      title: page.title
      href: page.href
      isCurrent: current == ns
  items[items.length - 1].isLast = true
  return items

app.view.fn 'pageTitle', (current) ->
  return app.pages[current]?.title
