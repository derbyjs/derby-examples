http = require 'http'
express = require 'express'
hello = require './hello'

# Apps provide a server-side store for syncing data
store = hello.createStore()

expressApp = express()
  .use(express.static __dirname + '/public')
  .use(store.modelMiddleware())
  # Apps create an Express middleware
  .use(hello.router())

server = http.createServer(expressApp).listen 3000

store.listen server
