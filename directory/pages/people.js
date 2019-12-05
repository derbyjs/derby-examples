class PeopleList {
  init(model) {
    model.ref('people', model.scope('people').sort(nameAscending));
  }
};

function nameAscending(a, b) {
  var aName = (a && a.name || '').toLowerCase();
  var bName = (b && b.name || '').toLowerCase();
  if (aName < bName) return -1;
  if (aName > bName) return 1;
  return 0;
}

PeopleList.view = {
  file: __dirname + '/people',
  dependencies: [
    require('./chrome')
  ]
};
module.exports = PeopleList;
