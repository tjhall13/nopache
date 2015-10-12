var fs = require('fs');
var path = require('path');
var minimatch = require('minimatch');

var types = {
    'application/javascript': [ 'js' ],
    'image/gif': [ 'gif' ],
    'image/jpeg': [ 'jpg', 'jpeg' ],
    'image/png': [ 'png' ],
    'text/css': [ 'css' ],
    'text/html': [ 'html', 'htm' ],
    'text/json': [ 'json' ]
};

var mime = (function(table) {
    var output = { };
    for(var mime in table) {
        for(var i = 0; i < table[mime].length; i++) {
            output[table[mime][i]] = mime;
        }
    }
    
    return {
        types: table,
        lookup: function(ext) {
            return output[ext];
        }
    };
})(types);

module.exports = {
    default_handler: function(env, callback) {
        var pathname = env.server.base + env.request.path;
        var ext = path.extname(pathname);
        try {
            var stat = fs.statSync(pathname);
            if(stat && !stat.isDirectory()) {
                fs.readFile(pathname, function(err, data) {
                    if(err) {
                        env.error.log(err);
                        env.response.status(500);
                        callback(null, 500);
                        return false;
                    } else {
                        env.response.status(200);
                        env.response.headers({
                            'Content-Type': mime.lookup(ext.substr(1)),
                            'Content-Length': data.length
                        });
                        env.response.data(data);
                        callback(null, 200);
                        return false;
                    }
                });
            } else {
                // Directory indexing
                env.response.status(403);
                return 403;
            }
        } catch(e) {
            env.response.status(404);
            return 404;
        }
    },
    
    commands: {
        'AcceptPathInfo': function(status) {
            this.env.config['accept-path-info'] = status.toLowerCase();
        },
        
        'AddDefaultCharSet': function(charset) {
            switch(charset.toLowerCase()) {
                case 'on':
                    charset = 'iso-8859-1';
                    break;
                case 'off':
                    charset = null;
                    break;
                default:
                    break;
            }
            this.env.config['default-charset'] = charset;
        },
        
        'ContentDigest': function(status) {
            this.env.config['content-digest'] = status.toLowerCase() == 'on';
        },
        
        'DefaultType': function(type) {
            this.env.config['default-type'] = type.toLowerCase() == 'none' ? false : type;
        },
        
        'ErrorDocument': function(code, document) {
            if(!this.env.config['error-documents']) {
                this.env.config['error-documents'] = { };
            }
            this.env.config['error-documents'][code] = document;
        },
        
        'FileETag': function(inode, mtime, size) {
            var _inode = false, _mtime = false, _size = false;
            if(inode && !mtime && !size) {
                switch(inode.toLowerCase()) {
                    case 'all':
                    case 'default':
                        _inode = true; _mtime = true; _size = true;
                        break;
                    case 'none':
                        _inode = false; _mtime = false; _size = false;
                        break;
                    case 'inode':
                        _inode = true; _mtime = false; _size = false;
                        break;
                }
            } else {
                for(var i in arguments) {
                    if(typeof i == 'number') {
                        switch(arguments[i].toLowerCase()) {
                            case 'inode':
                                _inode = true;
                                break;
                            case 'mtime':
                                _mtime = true;
                                break;
                            case 'size':
                                _size = true;
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
            
            this.env.config['etag-attributes'] = { };
            this.env.config['etag-attributes'].inode = _inode;
            this.env.config['etag-attributes'].mtime = _mtime;
            this.env.config['etag-attributes'].size = _size;
        },
        
        'Files': function(flag, expr) {
            if(flag == '~') {
                expr = new RegExp(expr);
            } else {
                expr =  minimatch.makeRe(flag, { });
            }
            
            var config = this.env.config;
            var url = this.url;
            
            this.env.config = { files: [] };
            this.url = { };
            
            return function() {
                this.env.config.files.push({
                    regex: expr,
                    config: this.env.config,
                    url: this.url
                });
                
                this.env.config = config;
                this.url = url;
            };
        },
        
        'FilesMatch': function(expr) {
            expr = new RegExp(expr);
            
            var config = this.env.config;
            var url = this.url;
            
            this.env.config = { files: [] };
            this.url = { };
            
            return function() {
                this.env.config.files.push({
                    regex: expr,
                    config: this.env.config,
                    url: this.url
                });
                
                this.env.config = config;
                this.url = url;
            };
        },
        
        'ForceType': function(type) {
            this.env.config['mime-type'] = type;
        },
        
        'IfDefine': function(define) {
            // TODO: get command line argument defines
            return false;
        },
        
        'IfModule': function(module) {
            // TODO: get loaded modules
            return false;
        },
        
        'Limit': function() {
            var method = this.env.request.method.toLowerCase();
            for(var i = 0; i < arguments.length; i++) {
                if(arguments[i].toLowerCase() == method) {
                    return true;
                }
            }
            return false;
        },
        
        'LimitExcept': function() {
            var method = this.env.request.method.toLowerCase();
            for(var i = 0; i < arguments.length; i++) {
                if(arguments[i].toLowerCase() == method) {
                    return false;
                }
            }
            return true;
        },
        
        'LimitBodyResource': function(size) {
            this.env.config['body-resource-limit'] = size;
        },
        
        'LimitXMLRequestBody': function(size) {
            this.env.config['xml-request-limit'] = size;
        },
        
        'Options': function() {
            
        },
        
        'SetHandler': function(handler) {
            this.env.config.handler = handler;
        }
    }
};
