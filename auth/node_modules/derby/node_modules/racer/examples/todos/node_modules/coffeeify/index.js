var coffee = require('coffee-script');
var through = require('through');
var convert = require('convert-source-map');

function compile(file, data) {
    var compiled = coffee.compile(data, { sourceMap: true, generatedFile: file, inline: true, literate: isLiterate(file) });
    var comment = convert
        .fromJSON(compiled.v3SourceMap)
        .setProperty('sources', [ file ])
        .toComment();

    return compiled.js + '\n' + comment;
}

function isCoffee (file) {
    return /\.((lit)?coffee|coffee\.md)$/.test(file);
}

function isLiterate (file) {
    return /\.(litcoffee|coffee\.md)$/.test(file);
}

module.exports = function (file) {
    if (!isCoffee(file)) return through();

    var data = '';
    return through(write, end);

    function write (buf) { data += buf }
    function end () {
        this.queue(compile(file, data));
        this.queue(null);
    }
};
