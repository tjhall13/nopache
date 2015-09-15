var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');
var Buffer = require('buffer').Buffer;

var _ = require('lodash');
var flat = require('./libs/flat.js');

module.exports = {
    NopacheServer: function(base, port, mods) {
        if(base.charAt(0) == '~') {
            base = path.join(process.env.HOME || process.env.HOMEPATH, base.substr(1));
        }
        base = path.resolve(base);
        
        if(!mods) {
            mods = {
                php: false,
                mock: false
            };
        }
        
        var env = {
            flat: flat,
            _: _
        };
        
        if(mods.mock) {
            if(mods.mock.init) {
                mods.mock.init(env);
            }
        }
        
        function phpRequest(request, callback) {
            var err;
            var requestURL = url.parse(request.url, true);
            request.path = requestURL.path;
            request.query = requestURL.query;
            
            if(mods.mock) {
                var entry = mods.mock[request.path];
                var result;
                
                if(!entry) {
                    err = {
                        status: 404
                    };
                    callback(err, null);
                    return false;
                } else {
                    if(Array.isArray(entry)) {
                        err = {
                            status: 400
                        };
                        for(var i = 0; i < entry.length; i++) {
                            if(_.isEqual(entry[i].input, request.data)) {
                                result = entry[i].output;
                                break;
                            }
                        }
                    } else if(typeof entry === 'object') {
                        result = entry;
                    } else if(typeof entry === 'function') {
                        try {
                            result = entry(request.data, env);
                        } catch(e) {
                            result = false;
                            err = {
                                status: 500
                            };
                        }
                    }
                }
                
                if(!result) {
                    callback(err, null);
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
                // PHP scripting is not available yet
                err = {
                    status: 500
                };
                callback(err, null);
                return false;
            }
        }
        
        function defaultRequest(request, callback) {
            var filename = path.join(base, request.url);
            
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
                    case '.png':
                        type = 'image/png';
                        break;
                    case '.gif':
                        type = 'image/gif';
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
        
        function access(request, entries) {
            if(entries.length == 1) {
                return false;
            } else {
                var directory = entries.shift();
                
                if(directory === '') {
                    return access(request, entries);
                } else {
                    return access(request, entries);
                }
            }
        }
        
        function openRequest(request, callback) {
            var entries = request.url.split('/');
            
            var result = access(request, entries);
            
            switch(path.extname(request.url)) {
                case '.php':
                    value = phpRequest(request, callback);
                    break;
                default:
                    value = defaultRequest(request, callback);
                    break;
            }
        }
        
        var server = http.createServer(function(request, response) {
            var data = new Buffer(0);
            request.on('data', function(frame) {
                if(typeof frame === 'string') {
                    frame = new Buffer(frame, 'utf8');
                }
                data = Buffer.concat([data, frame], data.length + frame.length);
            });
            
            var requestURL = url.parse(request.url, true);
            
            request.on('end', function() {
                var requestData = { };
                if(Object.keys(requestURL.query).length) {
                    requestData.get = requestURL.query;
                }
                if(data.length || request.method == 'POST') {
                    requestData.post = data;
                }
                
                openRequest({
                    url: requestURL.pathname,
                    method: request.method,
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
            mods: {
                php: false,
                mock: false
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
        var server = new this.NopacheServer(config.base, config.port, config.mods);
        server.listen();
    }
};
