assert = require 'assert'
util = require 'util'
fs = require 'fs'

# You can use this to enable debugging info in this file.
p = -> #util.debug
i = -> # (o) -> util.inspect o, colors:true, depth:3

# By default, use a new seed every 6 hours. This balances making test runs stable while debugging
# with avoiding obscure bugs caused by a rare seed.
seed = Math.floor Date.now() / (1000*60*60*6)

if seed?
  mersenne = require './mersenne'

  mersenne.seed seed
  randomReal = exports.randomReal = mersenne.rand_real
else
  randomReal = exports.randomReal = Math.random

# Generate a random int 0 <= k < n
randomInt = exports.randomInt = (n) -> Math.floor randomReal() * n

# Return a random word from a corpus each time the method is called
randomWord = exports.randomWord = do ->
  words = fs.readFileSync(__dirname + '/jabberwocky.txt').toString().split(/\W+/)
  -> words[randomInt(words.length)]

# Cross-transform function. Transform server by client and client by server. Returns
# [server, client].
transformX = exports.transformX = (type, left, right) ->
  [type.transform(left, right, 'left'), type.transform(right, left, 'right')]

# Transform a list of server ops by a list of client ops.
# Returns [serverOps', clientOps'].
# This is O(serverOps.length * clientOps.length)
transformLists = (type, serverOps, clientOps) ->
  #p "Transforming #{i serverOps} with #{i clientOps}"
  serverOps = for s in serverOps
    clientOps = for c in clientOps
      #p "X #{i s} by #{i c}"
      [s, c_] = transformX type, s, c
      c_
    s
  
  [serverOps, clientOps]

# Compose a whole list of ops together
composeList = (type, ops) -> ops.reduce type.compose

# Hax. Apparently this is still the fastest way to deep clone an object,
# assuming we have support for JSON.
#
# This is needed because calling apply() now destroys the original object.
clone = (o) -> JSON.parse(JSON.stringify o)

# Returns client result
testRandomOp = (type, initialDoc = type.create()) ->
  makeDoc = -> ops:[], result:initialDoc
  opSets = (makeDoc() for [0...3])
  [client, client2, server] = opSets

  for [0...10]
    doc = opSets[randomInt 3]
    [op, doc.result] = type.generateRandomOp doc.result
    doc.ops.push(op)

  p "Doc #{i initialDoc} + #{i ops} = #{i result}" for {ops, result} in [client, client2, server]

  checkSnapshotsEq = (a, b) ->
    if type.serialize
      assert.deepEqual type.serialize(a), type.serialize(b)
    else
      assert.deepEqual a, b

  # First, test type.apply.
  for set in opSets
    s = clone initialDoc
    s = type.apply s, op for op in set.ops

    checkSnapshotsEq s, set.result

  # If the type has a shatter function, we should be able to shatter all the
  # ops, apply them and get the same results.
  if type.shatter
    for set in opSets
      s = clone initialDoc
      for op in set.ops
        for atom in type.shatter op
          s = type.apply s, atom

      checkSnapshotsEq s, set.result

  if type.invert?
    # Invert all the ops and apply them to result. Should end up with initialDoc.
    testInvert = (doc, ops = doc.ops) ->
      snapshot = clone doc.result

      # Sadly, coffeescript doesn't seem to support iterating backwards through an array.
      # reverse() reverses an array in-place so it needs to be cloned first.
      ops = doc.ops.slice().reverse()
      for op in ops
        op_ = type.invert op
        snapshot = type.apply snapshot, op_

      checkSnapshotsEq snapshot, initialDoc
  
    testInvert set for set in opSets

  # If all the ops are composed together, then applied, we should get the same result.
  if type.compose?
    p 'COMPOSE'
    compose = (doc) ->
      if doc.ops.length > 0
        doc.composed = composeList type, doc.ops
        # .... And this should match the expected document.
        checkSnapshotsEq doc.result, type.apply clone(initialDoc), doc.composed

    compose set for set in opSets

    testInvert? set, [set.composed] for set in opSets when set.composed?
  
    # Check the diamond property holds
    if client.composed? && server.composed?
      [server_, client_] = transformX type, server.composed, client.composed

      s_c = type.apply clone(server.result), client_
      c_s = type.apply clone(client.result), server_

      # Interestingly, these will not be the same as s_c and c_s above.
      # Eg, when:
      #  server.ops = [ [ { d: 'x' } ], [ { i: 'c' } ] ]
      #  client.ops = [ 1, { i: 'b' } ]
      checkSnapshotsEq s_c, c_s

      if type.tp2
        # This is an interesting property which I don't think is strictly
        # enforced by the TP2 property, but which my text-tp2 type holds. I'm
        # curious if this will hold for any TP2 type.
        #
        # Given X, [A,B] based on a document, I'm testing if:
        #  T(T(x, A), B) == T(x, A.B).
        #
        # Because this holds, it is possible to collapse intermediate ops
        # without effecting the OT code.
        x1 = server.composed
        x1 = type.transform x1, c, 'left' for c in client.ops

        x2 = server.composed
        x2 = type.transform x2, client.composed, 'left'

        assert.deepEqual x1, x2

      if type.tp2 and client2.composed?
        # TP2 requires that T(op3, op1 . T(op2, op1)) == T(op3, op2 . T(op1, op2)).
        lhs = type.transform client2.composed, type.compose(client.composed, server_), 'left'
        rhs = type.transform client2.composed, type.compose(server.composed, client_), 'left'

        assert.deepEqual lhs, rhs

  if type.prune?
    p 'PRUNE'
    
    [op1] = type.generateRandomOp initialDoc
    [op2] = type.generateRandomOp initialDoc

    for idDelta in ['left', 'right']
      op1_ = type.transform op1, op2, idDelta
      op1_pruned = type.prune op1_, op2, idDelta

      assert.deepEqual op1, op1_pruned

  # Now we'll check the n^2 transform method.
  if client.ops.length > 0 && server.ops.length > 0
    p "s #{i server.result} c #{i client.result} XF #{i server.ops} x #{i client.ops}"
    [s_, c_] = transformLists type, server.ops, client.ops
    p "XF result #{i s_} x #{i c_}"
#    p "applying #{i c_} to #{i server.result}"
    s_c = c_.reduce type.apply, clone server.result
    c_s = s_.reduce type.apply, clone client.result

    checkSnapshotsEq s_c, c_s

    # ... And we'll do a round-trip using invert().
    if type.invert?
      c_inv = c_.slice().reverse().map type.invert
      server_result_ = c_inv.reduce type.apply, clone(s_c)
      checkSnapshotsEq server.result, server_result_
      orig_ = server.ops.slice().reverse().map(type.invert).reduce(type.apply, server_result_)
      checkSnapshotsEq orig_, initialDoc
  
  client.result

collectStats = (type) ->
  functions = ['transform', 'compose', 'apply', 'prune']

  orig = {}
  orig[fn] = type[fn] for fn in functions when type[fn]?
  restore = ->
    type[fn] = orig[fn] for fn in functions when orig[fn]?
  
  stats = {}
  stats[fn] = 0 for fn in functions when orig[fn]?

  collect = (fn) -> (args...) ->
    stats[fn]++
    orig[fn].apply null, args
  
  type[fn] = collect fn for fn in functions when orig[fn]?

  [stats, restore]

# Run some iterations of the random op tester. Requires a random op generator for the type.
module.exports = (type, iterations = 2000) ->
  assert.ok type.generateRandomOp
  assert.ok type.transform

  [stats, restore] = collectStats type

  console.error "   Running #{iterations} randomized tests for type #{type.name}..."
  console.error "     (seed: #{seed})" if seed?

  warnUnless = (fn) -> console.error "NOTE: Not running #{fn} tests because #{type.name} does not have #{fn}() defined" unless type[fn]?
  warnUnless 'invert'
  warnUnless 'compose'

  doc = type.create()

  console.time 'randomizer'
  iterationsPerPct = iterations / 100
  for n in [0..iterations]
    if n % (iterationsPerPct * 2) == 0
      process.stdout.write (if n % (iterationsPerPct * 10) == 0 then "#{n / iterationsPerPct}" else '.')
    doc = testRandomOp(type, doc)
  console.log()

  console.timeEnd 'randomizer'

  console.log "Performed:"
  console.log "\t#{fn}s: #{number}" for fn, number of stats

  restore()

module.exports[k] = v for k, v of exports
