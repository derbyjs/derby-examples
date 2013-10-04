// This is a really simple OT type. Its not compiled with the web client, but it could be.
//
// Its mostly included for demonstration purposes and its used in the meta unit tests.
//
// This defines a really simple text OT type which only allows inserts. (No deletes).
//
// Ops look like:
//   {position:#, text:"asdf"}
//
// Document snapshots look like:
//   {str:string}

module.exports = {
  // The name of the OT type. The type itself is exposed to ottypes[type.name] and ottypes[type.uri].
  // The name can be used instead of the actual type in all API methods in ShareJS.
  name: 'simple',

  // Canonical name.
  uri: 'http://sharejs.org/types/simple',

  // Create a new document snapshot. Initial data can be passed in.
  create: function(initial) {
    if (initial == null)
      initial = '';

    return {str: initial};
  },

  // Apply the given op to the document snapshot. Returns the new snapshot.
  apply: function(snapshot, op) {
    if (op.position < 0 || op.position > snapshot.str.length)
      throw new Error('Invalid position');

    var str = snapshot.str;
    str = str.slice(0, op.position) + op.text + str.slice(op.position);
    return {str: str};
  },

  // Transform op1 by op2. Returns transformed version of op1.
  // Sym describes the symmetry of the operation. Its either 'left' or 'right'
  // depending on whether the op being transformed comes from the client or the
  // server.
  transform: function(op1, op2, sym) {
    var pos = op1.position;

    if (op2.position < pos || (op2.position === pos && sym === 'left')) {
      pos += op2.text.length;
    }

    return {position: pos, text: op1.text};
  }
};

