# This is the implementation of the super awesome composable JSON OT type.
#
# Spec is here: intarwebs

json = {}

json.name = 'json1'
json.url = 'http://sharejs.org/types/JSONv1'

# null instead of undefined if you don't pass an argument.
json.create = (init) -> if init? then init else null

json.checkValidOp = (op) ->

isArray = (o) -> Object.prototype.toString.call(o) == '[object Array]'
json.checkList = (elem) ->
  throw new Error 'Referenced element not a list' unless isArray(elem)

json.checkObj = (elem) ->
  throw new Error "Referenced element not an object (it was #{JSON.stringify elem})" unless elem.constructor is Object

###
eachMicro = (op, fn) ->
  for c in op
    if c.in
      for p in c.in
        fn 'in'
        fn {skip:p}
    else if c.out?
      for [0...c.out]
        fn 'out'
    else
      fn c
###

toMicros = json._toMicros = (op) ->
  newOp = []
  for c in op
    if c.in
      for p in c.in
        newOp.push 'in'
        newOp.push {skip:p}
    else if c.out?
      for [0...c.out]
        newOp.push 'out'
    else
      newOp.push c

  newOp

fromMicros = json._fromMicros = (micros) -> appendMicros [], micros


# Append an op component to the end of an op.
appendMicros = (op, micros) ->
  i = 0
  while i < micros.length
    m = micros[i]
    last = if op.length then op[op.length - 1] else null

    if m is 'in'
      # Scan.
      inRun = []
      while micros[i] is 'in' and micros[i+1].skip?
        inRun.push micros[i+1].skip
        i += 2

      if last and last.in and inRun.length
        last.in = last.in.concat inRun
      else
        op.push {in:inRun}

      continue if inRun.length
    else if m.skip?
      if last and last.in and last.in.length is 0
        last.in.push m.skip
      else
        op.push m

    else if m is 'out'
      if last and last.out?
        last.out++
      else
        op.push {out:1}

    else
      op.push m

    i++
  return op


json.apply = (snapshot, op) ->
  json.checkValidOp op
  op = clone op

  container = {data: clone snapshot}

  parents = [container]
  positions = ['data']

  # map from id -> [parent, key]
  destinations = {}
  inventory = {}

  # TODO: assert we don't go in right after an out

  goIn = ->
    throw new Error 'Nowhere to go in' unless positions[0]?
    parents.unshift parents[0][positions[0]]
    throw new Error 'invalid container' unless typeof parents[0] is 'object'
    positions.unshift null

  goOut = ->
    parents.shift()
    positions.shift()

  skip = (n) ->
    throw new Error 'invalid skip' unless (typeof n is 'number') == (isArray parents[0])
    if typeof n is 'string'
      throw new Error "Can't skip backwards" if positions[0]? and n < positions[0]
      positions[0] = n
    else
      throw new Error "Can't skip backwards" unless n > 0
      positions[0] += n

  for c in op
    if c.in
      throw Error 'not implemented' unless isArray c.in

      for k in c.in
        goIn()
        skip k

    else if c.out?
      goOut() for [1..c.out]

    else if c.skip?
      skip c.skip


    else if c.drop?
      obj = inventory[c.drop]
      console.log 'obj', obj
      console.log positions
      if typeof positions[0] is 'number'
        # Array. splice in undefined.
        parents[0].splice positions[0], 0, obj
        # Skip over the element.
        skip 1
      else
        # Object. Insert, although this is a no-op.
        parents[0][positions[0]] = obj
        # assert we don't go in next.

      if obj is undefined
        destinations[c.drop] = [parents[0], positions[0]]
      else
        delete inventory[c.drop]

    else if c.pick?
      obj = parents[0][positions[0]]
      if typeof positions[0] is 'number'
        parents[0].splice positions[0], 1
      else
        delete parents[0][positions[0]]

      d = destinations[c.pick]
      console.log 'd:', d, 'obj', obj
      if d
        d[0][d[1]] = obj
        delete destinations[c.pick]
      else
        throw new Error 'Duplicate pick' if c.pick of inventory
        inventory[c.pick] = obj

      inventory

  if Object.keys(inventory).length or Object.keys(destinations).length
    console.log "inv", inventory
    console.log "dest", destinations
    throw new Error 'mismatched pickups and drops'

  container.data


makeIter = (op) ->
  path = []
  idx = 0 # index in op
  offset = 0 # offset in op[idx]

  take = (maxSkip) ->
    return null if idx == op.length

    c = op[idx]

    if c.skip?
      if typeof c.skip is 'number'
        if !maxSkip? or c.skip - offset <= maxSkip
          part = if offset then {skip:c.skip - offset} else c
          ++idx; offset = 0
          part
        else
          offset += maxSkip
          {skip:maxSkip}
      else
        if !maxSkip? or (offset || c.skip) <= maxSkip
          ++idx; offset = 0
          c
        else
          offset = maxSkip
          {skip:maxSkip}

    else if c is 'up' and maxSkip?
      {skip:maxSkip}
    else
      ++idx
      c

  peek = ->
    op[idx]

  [take, peek]

json.transform = (op, otherOp, side) ->
  console.log 'x', op, otherOp, side
  
  throw new Error "side (#{side}) must be 'left' or 'right'" unless side in ['left', 'right']

  checkOp op
  checkOp otherOp
  newOp = []
  [take, peek] = makeIter toMicros op

  inventory = {}
  destinations = {}


  base = null

  pump = (n, depth = 0) ->
    loop
      c = peek()
      return unless c? # End of op.

      if c.skip? and depth is 0
        append newOp, take n

        # We skipped past the end.
        if c.skip >= n
          return

        # Not skipping far enough. Advance n and continue.
        if typeof n is 'number' then n += c.skip else n = c.skip
      else
        if c is 'in'
          depth++
        else if c is 'out'
          return if depth is 0
          depth--
        append newOp, take()
        return if depth is 0 and n is null

  suspendedDepth = 0
  path = []
  pos = null

  for other in toMicros otherOp
    if suspendedDepth
      if other is 'in'
        path.push pos
        pos = null
        suspendedDepth++
      else if other is 'out'
        pos = path.pop()
        suspendedDepth--
      else if other.skip?
        if typeof other.skip is 'number'
          pos += other.skip
        else
          pos = other.skip
      #else if other.pick?



      continue

    if other is 'in'
      c = peek()
      if c is 'in'
        append newOp, take()
      else
        # Ok, here we need to walk over the other ops
        depth = 1
        #while depth

    else if other.skip?
      # Pump until we pass component.
      dest = other.skip
      depth = 0

      loop
        append newOp, c = take()

        if (c.skip? and depth == 0 and c.skip >= dest) or (depth == 0 and c is 'out')
          # finish.
          break
        else
          if c is 'in'
            depth++
          else if c is 'out'
            depth--


  newOp






# Checks if two paths, p1 and p2 match.
json.pathMatches = (p1, p2, ignoreLast) ->
  return false unless p1.length == p2.length

  for p, i in p1
    return false if p != p2[i] and (!ignoreLast or i != p1.length - 1)
      
  true

json.append = (dest, c) ->
  throw new Error 'not implemented'

json.compose = (op1, op2) ->
  json.checkValidOp op1
  json.checkValidOp op2

  newOp = clone op1

  newOp

json.normalize = (op) ->
  newOp = []
  
  op = [op] unless isArray op

  for c in op
    c.p ?= []
    json.append newOp, c
  
  newOp

# hax, copied from test/types/json. Apparently this is still the fastest way to deep clone an object, assuming
# we have browser support for JSON.
# http://jsperf.com/cloning-an-object/12
clone = (o) -> JSON.parse(JSON.stringify o)

# Returns true if an op at otherPath may affect an op at path
json.canOpAffectOp = (otherPath, path) ->
  return true if otherPath.length == 0
  return false if path.length == 0

  path = path[...path.length-1]
  otherPath = otherPath[...otherPath.length-1]

  for p,i in otherPath
    if i >= path.length
      return false
    if p != path[i]
      return false

  # Same
  return true

if WEB?
  exports.types ||= {}

  # [] is used to prevent closure from renaming types.text
  exports.types.json = json
else
  module.exports = json


