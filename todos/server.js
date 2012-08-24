if (process.env.NODE_ENV === 'production') {
  require('./lib/server').listen(3003);
} else {
  require('derby').run(__dirname + '/lib/server', 3003);
}
