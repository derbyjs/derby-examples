# Mocha test using livedb's snapshot tests
mongoskin = require 'mongoskin'
liveDbMongo = require './mongo'

# Clear mongo
clear = (callback) ->
  mongo = mongoskin.db 'localhost:27017/test?auto_reconnect', safe:true
  mongo.dropCollection 'testcollection', ->
    mongo.dropCollection 'testcollection_ops', ->
      mongo.close()

      callback()

create = (callback) ->
  clear ->
    callback liveDbMongo 'localhost:27017/test?auto_reconnect', safe: false

describe 'mongo', ->
  after (done) ->
    clear done

  require('livedb/test/snapshotdb') create
  require('livedb/test/oplog') create

