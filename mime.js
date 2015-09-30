var table = {
    'text/html': [ 'html', 'htm' ],
    'text/json': [ 'json' ],
    'application/javascript': [ 'js' ],
    'text/css': [ 'css' ],
    'image/jpeg': [ 'jpg', 'jpeg' ],
    'image/png': [ 'png' ],
    'image/gif': [ 'gif' ]
};

var lookup = (function(table) {
    var output = { };
    for(var mime in table) {
        table[mime].forEach(function(ext) {
            output[ext] = mime;
        });
    }
    return output;
})(table);

module.exports = {
    lookup: function(ext) {
        return lookup[ext];
    }
};
