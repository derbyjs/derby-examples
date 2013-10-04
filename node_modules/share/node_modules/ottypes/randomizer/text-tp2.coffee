text = require('../lib')['text-tp2']
{randomInt, randomReal, randomWord} = require './randomizer'

text.generateRandomOp = (doc) ->
  position = {index:0, offset:0}

  remainder = doc.totalLength

  newDoc = text.create()

  op = []

  {_appendDoc:appendDoc, _takeDoc:takeDoc, _append:append} = text

  addSkip = (length = Math.min(remainder, randomInt(doc.totalLength / 2) + 1)) ->
    remainder -= length

    append op, length
    while length > 0
      part = takeDoc doc, position, length
      appendDoc newDoc, part
      length -= part.length || part

  addInsert = ->
    # Insert a random word from the list
    content = if randomInt(2) then randomWord() + ' ' else randomInt(5) + 1
    append op, {i:content}
    appendDoc newDoc, content

  addDelete = ->
    length = Math.min(remainder, randomInt(doc.totalLength / 2) + 1)
    remainder -= length

    appendDoc newDoc, length
    append op, {d:length}

    while length > 0
      part = takeDoc doc, position, length
      length -= part.length || part

  r = 0.9
  while remainder > 0 and randomReal() < r
    addSkip() if randomReal() < 0.8

    r *= 0.8
    
    if randomReal() < 0.9
      if randomReal() < 0.3 then addInsert() else addDelete()
  
  addSkip(remainder) if remainder > 0

  # The code above will never insert at the end of the document. Thats important...
  addInsert() if randomReal() < 0.3

  [op, newDoc]

# This isn't currently used by anything.
text.generateRandomDoc = ->
  stringNext = randomInt(2) == 0
  data = for [0...randomInt(10)]
    stringNext = !stringNext
    if stringNext
      randomWord() + ' '
    else
      randomInt(5) + 1

  doc = text.deserialize data


