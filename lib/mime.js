var table = {
    'application/javascript': [ 'js' ],
    'image/gif': [ 'gif' ],
    'image/jpeg': [ 'jpg', 'jpeg' ],
    'image/png': [ 'png' ],
    'text/css': [ 'css' ],
    'text/html': [ 'html', 'htm' ],
    'text/json': [ 'json' ]
};

var lookup = (function(table) {
    var output = { };
    for(var mime in table) {
        for(var i = 0; i < table[mime].length; i++) {
            output[table[mime][i]] = mime;
        }
    }
    return output;
})(table);

module.exports = {
    lookup: function(ext) {
        return lookup[ext];
    }
};
