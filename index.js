var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var Buffer = require('buffer').Buffer;

var _ = require('lodash');

module.exports = {
    NopacheServer: function(base, port, cgi) {
        if(base.charAt(0) == '~') {
            base = path.join(process.env.HOME || process.env.HOMEPATH, base.substr(1));
        }
        base = path.resolve(base);
        
        var config = {
            mock: {
                php: false
            },
            mods: {
                php: false
            }
        };
        
        if(cgi) {
            if(cgi.mock) {
                if(cgi.mock.php) {
                    config.mock.php = cgi.mock.php;
                }
            }
            if(cgi.mods) {
                if(cgi.mods.php) {
                    config.mods.php = cgi.mods.php;
                }
            }
        }
        
        function phpRequest(request, callback) {
            var res;
            
            if(config.mock.php) {
                var entry = config.mock.php[request.path];
                var result;
                
                if(!entry) {
                    res = {
                        status: 404
                    };
                    callback(res, null);
                    return false;
                }
                
                if(entry.response) {
                    if(Array.isArray(entry.response)) {
                        entry.response.forEach(function(value, index, array) {
                            if(_.isEqual(value.input, request.data)) {
                                result = value.output;
                            }
                        });
                    } else if(typeof entry.response === 'object') {
                        result = entry.response;
                    } else if(typeof entry.response === 'function') {
                        result = entry.response.call(request.data);
                    }
                }
                
                if(!result) {
                    res = {
                        status: 500
                    };
                    callback(res, null);
                    return false;
                }
                
                var response = {
                    header: result.headers,
                    body: ''
                };
                
                switch(result.type) {
                    case 'text':
                    case 'data':
                        response.body = new Buffer(result.data);
                        break;
                    case 'json':
                        response.body = new Buffer(JSON.stringify(result.data));
                        break;
                }
                
                callback(null, response);
                return true;
            } else {
                res = {
                    status: 500
                };
                callback(res, null);
                return false;
            }
        }
        
        function defaultRequest(request, callback) {
            var filename = path.join(base, request.path);
            
            var stat;
            var res;
            
            try {
                stat = fs.statSync(filename);
            } catch(err) {
                res = {
                    status: 404
                };
                callback(res, null);
                return false;
            }
            
            if(stat) {
                if(stat.isDirectory()) {
                    filename = path.join(filename, 'index.html');
                    
                    try {
                        stat = fs.statSync(filename);
                    } catch(err) {
                        res = {
                            status: 404
                        };
                        callback(res, null);
                        return false;
                    }
                    
                    if(!stat || !stat.isFile()) {
                        res = {
                            status: 404
                        };
                        callback(res, null);
                        return false;
                    }
                } else if(!stat.isFile()) {
                    res = {
                        status: 404
                    };
                    callback(res, null);
                    return false;
                }
                
                var extension = path.extname(filename);
                var type;
                
                switch(extension) {
                    case '.html':
                        type = 'text/html';
                        break;
                    case '.css':
                        type = 'text/css';
                        break;
                    case '.js':
                        type = 'text/javascript';
                        break;
                    case '.jpeg':
                        type = 'image/jpeg';
                        break;
                    default:
                        type = undefined;
                        break;
                }
                
                var header = { };
                
                fs.readFile(filename, function(err, data) {
                    header['Content-Length'] = data.length;
                    if(type) {
                        header['Content-Type'] = type;
                    }
                    
                    if(err) {
                        res = {
                            status: 404
                        };
                    }
                    
                    callback(res, {
                        header: header,
                        body: data
                    });
                });
            } else {
                res = {
                    status: 404
                };
                callback(res, null);
                return false;
            }
        }
        
        function openRequest(request, callback) {
            switch(path.extname(request.path)) {
                case '.php':
                    value = phpRequest(request, callback);
                    break;
                default:
                    value = defaultRequest(request, callback);
                    break;
            }
        }
        
        var server = http.createServer(function(request, response) {
            var requestURL = url.parse(request.url, true);
            
            var requestPath = requestURL.pathname;
            var requestData = { };
            
            switch(request.method) {
                case 'GET':
                    requestData.get = requestURL.query;
                    break;
                case 'POST':
                    requestData.post = requestURL.query;
                    break;
            }
            
            openRequest({
                path: requestPath,
                data: requestData
            }, function(err, data) {
                if(err) {
                    response.writeHead(err.status, err.header);
                    if(err.body) {
                        response.write(err.body);
                    }
                    response.end();
                } else {
                    response.writeHead(200, data.header);
                    response.write(data.body);
                    response.end();
                }
            });
        });
        
        this.listen = function(callback) {
            server.listen(port, callback);
        };
        
        this.close = function(callback) {
            server.close(callback);
        };
    },
    config: function(config) {
        // Package specific defaults
        var defaults = {
            base: '.',
            port: 2400,
            cgi: {
                mock: false,
                mods: false
            }
        };
        
        // Merge options into defaults
        for(var option in config) {
            defaults[option] = config[option];
        }
        
        return defaults;
    },
    cli: function(config) {
        // Create a simple server with the provided configuration
        var server = new this.NopacheServer(config.base, config.port, config.cgi);
        server.listen();
    }
};
