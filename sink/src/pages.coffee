app = require './index'

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
  bench:
    title: 'Bindings benchmark'
    href: '/bench'
  submit:
    title: 'Submit form'
    href: '/submit'
  back:
    title: 'Back redirect'
    href: '/back'
  error:
    title: 'Error test'
    href: '/error'

app.proto.navItems = (current) ->
  items = []
  for ns, page of app.pages
    items.push
      title: page.title
      href: page.href
      isCurrent: current == ns
  items[items.length - 1].isLast = true
  return items

app.proto.pageTitle = (current) ->
  return app.pages[current]?.title
