# Tests for JSON2 OT type. (src/types/json2.coffee)
#
# Spec: https://github.com/josephg/ShareJS/wiki/JSON2
#
# This suite is based on the JSON tests.

assert = require 'assert'
json3 = require '../src/json3'

randomizer = require './randomizer'
{randomInt, randomReal, randomWord, transformX} = randomizer

clone = (o) -> JSON.parse(JSON.stringify o)

randomKey = (obj) ->
  if Array.isArray(obj)
    if obj.length == 0
      undefined
    else
      randomInt obj.length
  else
    ks = Object.keys obj
    return ks[randomInt ks.length]

# Generate a random new key for a value in obj.
# obj must be an Object.
randomNewKey = (obj) ->
  # There's no do-while loop in coffeescript.
  key = randomWord()
  key = randomWord() while obj[key] != undefined
  key

# Generate a random object
randomThing = ->
  switch randomInt 6
    when 0 then null
    when 1 then ''
    when 2 then randomWord()
    when 3
      obj = {}
      obj[randomNewKey(obj)] = randomThing() for [1..randomInt(5)]
      obj
    when 4 then (randomThing() for [1..randomInt(5)])
    when 5 then randomInt(50)

# Pick a random path to something in the object.
randomPath = (data) ->
  path = []

  while randomReal() < 0.85 and typeof data == 'object'
    key = randomKey data
    break unless key?

    path.push key
    data = data[key]
  
  path

randomLocation = (container) ->
  path = randomPath container.data

  # parent = the container for the operand. parent[key] contains the operand.
  parent = container
  key = 'data'
  for p in path
    parent = parent[key]
    key = p
  operand = parent[key]

  {path, parent, key, operand}

# Is path1 a strict parent of path2?
isParent = (path1, path2) ->
  return false if path1.length >= path2.length
  for p, i in path1
    return false if p isnt path2[i]
  true

pathCompare = (p1, p2) ->
  for i in [0...Math.min p1.length, p2.length]
    return -1 if p1[i] < p2[i]
    return 1 if p1[i] > p2[i]

  return p1.length - p2.length


goTo = (op, oldPath, newPath) ->
  console.log 'go to ', oldPath, newPath
  common = 0
  common++ while common < oldPath.length and common < newPath.length and oldPath[common] == newPath[common]
  
  skip = if oldPath.length > common && newPath.length > common
    common++
    1
  else
    0

  oldExtra = oldPath.length - common
  newExtra = newPath.length - common

  if oldExtra
    op.push {out:oldExtra}
  if skip
    op.push {skip:newPath[common - 1]}
  if newExtra
    op.push {in:newPath[common...]}

genTests = (type) ->
  describe 'transform', ->
    t = (a, b, expected) ->
      assert.deepEqual (toMicro expected), type.transform (toMicro a), (toMicro b), 'left'
      assert.deepEqual (toMicro expected), type.transform (toMicro a), (toMicro b), 'right'

    testIndependent = (a, b) ->
      t a, b, a
      t b, a, b

    it.skip 'object moves', ->
      testIndependent [{in:['a']}, {pick:0}, {skip:'b'}, {drop:0}], [{in:['c']}, {pick:0}, {skip:'d'}, {drop:0}]

      t [{in:['x', 'a']}, {pick:0}, {skip:'b'}, {drop:0}],
        [{in:['x']}, {pick:0}, {skip:'y'}, {drop:0}],
        [{in:['y', 'a']}, {pick:0}, {skip:'b'}, {drop:0}]

      t [{in:['x']}, {pick:0}, {skip:'y'}, {drop:0}],
        [{in:['x', 'a']}, {pick:0}, {skip:'b'}, {drop:0}],
        [{in:['x']}, {pick:0}, {skip:'y'}, {drop:0}]

      t [{in:['a']}, {pick:0}, {skip:'b'}, {drop:0}],
        [{in:['b']}, {pick:0}, {skip:'c'}, {drop:0}],
        [{in:['a']}, {pick:0}, {skip:'b'}, {drop:0}, {skip:'c'}, 'del']

      t [{in:['b']}, {pick:0}, {skip:'c'}, {drop:0}],
        [{in:['a']}, {pick:0}, {skip:'b'}, {drop:0}],
        [{in:['c']}, 'del']

      t [{in:['x', 'a']}, {pick:0}, {out:1}, {skip:'y'}, {in:['b']}, {drop:0}],
        [{in:['y']}, {pick:0}, {skip:'z'}, {drop:0}],
        [{in:['x', 'a']}, {pick:0}, {out:1}, {skip:'z'}, {in:['b']}, {drop:0}]

      t [{in:['x', 'a']}, {pick:0}, {out:1}, {skip:'z'}, {drop:0}],
        [{in:['x']}, {pick:0}, {skip:'y'}, {drop:0}],
        [{in:['y', 'a']}, {pick:0}, {out:1}, {skip:'z'}, {drop:0}]


    it 'array moves'
      



  type.generateRandomOp = (data) ->
    op = []
    container = data: clone(data)

    until from and to and pathCompare(from.path, to.path) != 0 and !isParent from.path, to.path
      from = randomLocation container
      to = randomLocation container until typeof to?.operand is 'object'
      
    console.log from
    console.log to


    if randomReal() < 0.1 and typeof to[to.length-1] == 'string'
      to[to.length-1] = randomWord()


    obj = from.operand

    if pathCompare(from.path, to.path) < 0
      goTo op, [], from.path
      op.push {pick:0}
      goTo op, from.path, to.path
      op.push {drop:0}

      if Array.isArray to.parent
        to.parent.splice to.key, 0, obj
      else
        to.parent[to.key] = obj

      if Array.isArray from.parent
        from.parent.splice from.key, 1
      else
        delete from.parent[from.key]
    else
      goTo op, [], to.path
      op.push {drop:0}
      goTo op, to.path, from.path
      op.push {pick:0}
    
      if Array.isArray from.parent
        from.parent.splice from.key, 1
      else
        delete from.parent[from.key]

      if Array.isArray to.parent
        to.parent.splice to.key, 0, obj
      else
        to.parent[to.key] = obj

    [op, container.data]

  #console.log JSON.stringify(type.generateRandomOp({x:5, y:[1,2,3,{z:'internet'}]})) for [1..5]

  describe 'micros', ->
    for [1..500]
      [op] = type.generateRandomOp {x:5, y:[1,2,3,{z:'internet'}]}
      micros = type._toMicros op
      op_ = type._fromMicros micros

      #console.log '-------'
      #console.log op
      #console.log op_
      #console.log micros

      assert.deepEqual op, op_

  describe 'randomizer', -> it.skip 'passes', ->
    @slow 6000
    randomizer type, 1000

describe 'json', ->
  describe 'native type', -> genTests json3
  #exports.webclient = genTests require('../helpers/webclient').types.json

