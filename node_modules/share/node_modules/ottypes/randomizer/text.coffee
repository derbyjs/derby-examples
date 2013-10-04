
{randomInt, randomWord} = require './randomizer'
{text} = require '../lib'

text.generateRandomOp = (docStr) ->
  initial = docStr

  op = []
  expectedDoc = ''

  consume = (len) ->
    expectedDoc += docStr[...len]
    docStr = docStr[len..]

  addInsert = ->
    # Insert a random word from the list somewhere in the document
    skip = randomInt Math.min docStr.length, 5
    word = randomWord() + ' '

    op.push skip
    consume skip

    op.push word
    expectedDoc += word

  addDelete = ->
    skip = randomInt Math.min docStr.length, 5

    op.push skip
    consume skip

    length = randomInt Math.min docStr.length, 4
    op.push {d:length}
    docStr = docStr[length..]

  while docStr.length > 0
    # If the document is long, we'll bias it toward deletes
    chance = if initial.length > 100 then 3 else 2
    switch randomInt(chance)
      when 0 then addInsert()
      when 1, 2 then addDelete()
    
    if randomInt(7) is 0
      break

  # The code above will never insert at the end of the document. Its important to do that
  # sometimes.
  addInsert() if randomInt(10) == 0

  expectedDoc += docStr
  [text.normalize(op), expectedDoc]
 
text.generateRandomDoc = randomWord



