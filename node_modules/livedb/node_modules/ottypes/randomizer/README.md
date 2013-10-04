# The Randomizer

This directory contains The Randomizer (Bug finding hound, destroyer of confidence).

It also contains the random op generators for the built in types. These
functions are mixed in to their respective types.

**type.generateRandomOp(snapshot) -> [op, newSnapshot]**: generateRandomOp
generates a random operation that is valid for the given snapshot. It returns
the operation along with the expected result of applying the operation. Do not
use type.apply to generate the expected snapshot - that would make it very hard
to find bugs in the apply function itself.

**randomizer(type, iterations)**: Runs the randomizer. The randomizer generates
a few new operations from the initial document snapshot and tests that the
various OT functions do what they're supposed to. The type must have a
generateRandomOp function defined for the randomizer to do its magic.

