# This is a simple test of the randomizer, using a trivial OT type.

randomizer = require '../randomizer'

# Each op is [expectedSnapshot, increment]. This type is not intended for actual use.
count = {}
count.name = 'count'
count.create = -> 1

count.apply = (snapshot, op) ->
  [v, inc] = op
  throw new Error "Op #{v} != snapshot #{snapshot}" unless snapshot == v
  snapshot + inc

count.transform = (op1, op2) ->
  throw new Error "Op1 #{op1[0]} != op2 #{op2[0]}" unless op1[0] == op2[0]
  [op1[0] + op2[1], op1[1]]

count.compose = (op1, op2) ->
  throw new Error "Op1 #{op1} + 1 != op2 #{op2}" unless op1[0] + op1[1] == op2[0]
  [op1[0], op1[1] + op2[1]]

count.generateRandomOp = (doc) ->
  [[doc, 1], doc + 1]


describe 'type count', ->
  it 'should pass the randomizer tests', ->
    @slow 200
    randomizer count

