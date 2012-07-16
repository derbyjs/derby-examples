http = require 'http'
express = require 'express'
derby = require 'derby'
hello = require './hello'

expressApp = express()
server = http.createServer expressApp
# The server-side store syncs data over Socket.IO
store = derby.createStore listen: server

expressApp
  .use(express.static __dirname + '/public')
  # The store creates models for incoming requests
  .use(store.modelMiddleware())
  # App routes create an Express middleware
  .use(hello.router())

server.listen 3000
