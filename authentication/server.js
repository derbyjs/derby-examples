if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'debug') {
    require('./lib/server').listen(3000);
} else {
    require('derby').run(__dirname + '/lib/server', 3000);
}