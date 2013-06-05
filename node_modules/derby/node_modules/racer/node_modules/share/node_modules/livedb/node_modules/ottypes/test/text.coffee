# Tests for the ShareDB compatible text type.

fs = require 'fs'
assert = require 'assert'

randomizer = require '../randomizer'
{text} = require '../lib'

readOp = (file) ->
  op = for c in JSON.parse file.shift()
    if typeof c is 'number'
      c
    else if c.i?
      c.i
    else
      {d:c.d.length}

  text.normalize op


describe 'text', ->
  describe 'text-transform-tests.json', ->
    it 'should transform correctly', ->
      testData = fs.readFileSync(__dirname + '/text-transform-tests.json').toString().split('\n')

      while testData.length >= 4
        op = readOp testData
        otherOp = readOp testData
        type = testData.shift()
        expected = readOp testData

        result = text.transform op, otherOp, type

        assert.deepEqual result, expected

    it 'should compose without crashing', ->
      testData = fs.readFileSync(__dirname + '/text-transform-tests.json').toString().split('\n')

      while testData.length >= 4
        testData.shift()
        op1 = readOp testData
        testData.shift()
        op2 = readOp testData

        # nothing interesting is done with result... This test just makes sure compose runs
        # without crashing.
        result = text.compose(op1, op2)

  describe '#create()', ->
    it 'should return an empty string when called with no arguments', ->
      assert.strictEqual '', text.create()
    it 'should return any string thats passed in', ->
      assert.strictEqual '', text.create ''
      assert.strictEqual 'oh hi', text.create 'oh hi'
    it 'throws when something other than a string is passed in', ->
      assert.throws (-> text.create 123), /must be a string/

  it 'should normalize sanely', ->
    assert.deepEqual [], text.normalize [0]
    assert.deepEqual [], text.normalize ['']
    assert.deepEqual [], text.normalize [{d:0}]

    assert.deepEqual [], text.normalize [1,1]
    assert.deepEqual [], text.normalize [2,0]
    assert.deepEqual ['a'], text.normalize ['a', 100]
    assert.deepEqual ['ab'], text.normalize ['a', 'b']
    assert.deepEqual ['ab'], text.normalize ['ab', '']
    assert.deepEqual ['ab'], text.normalize [0, 'a', 0, 'b', 0]
    assert.deepEqual ['a', 1, 'b'], text.normalize ['a', 1, 'b']

  describe '#transformCursor()', ->
    # This test was copied from https://github.com/josephg/libot/blob/master/test.c
    ins = [10, "oh hi"]
    del = [25, {d:20}]
    op = [10, 'oh hi', 10, {d:20}] # The previous ops composed together

    tc = (op, isOwn, cursor, expected) ->
      assert.deepEqual [expected, expected], text.transformCursor [cursor, cursor], op, isOwn
 
    it "shouldn't move a cursor at the start of the inserted text", ->
      tc op, false, 10, 10
  
    it "move a cursor at the start of the inserted text if its yours", ->
      tc ins, true, 10, 15
  
    it 'should move a character inside a deleted region to the start of the region', ->
      tc del, false, 25, 25
      tc del, false, 35, 25
      tc del, false, 45, 25

      tc del, true, 25, 25
      tc del, true, 35, 25
      tc del, true, 45, 25
  
    it "shouldn't effect cursors before the deleted region", ->
      tc del, false, 10, 10
  
    it "pulls back cursors past the end of the deleted region", ->
      tc del, false, 55, 35
  
    it "teleports your cursor to the end of the last insert or the delete", ->
      tc ins, true, 0, 15
      tc ins, true, 100, 15
      tc del, true, 0, 25
      tc del, true, 100, 25

    it "works with more complicated ops", ->
      tc op, false, 0, 0
      tc op, false, 100, 85
      tc op, false, 10, 10
      tc op, false, 11, 16
  
      tc op, false, 20, 25
      tc op, false, 30, 25
      tc op, false, 40, 25
      tc op, false, 41, 26

  describe 'randomizer', -> it 'passes', ->
    @slow 1500
    randomizer text


