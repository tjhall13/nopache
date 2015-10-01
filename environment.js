var Buffer = require('buffer').Buffer;
var url = require('url');

module.exports = function(request, response, config) {
    var _status, _headers = { };
    var _data = new Buffer(0);
    var startData = false;
    var socket = request.socket;
    
    var error = config.logfile;
    
    this.request = {
        version: request.httpVersion,
        url: request.url,
        method: request.method,
        headers: request.headers,
        data: new Buffer(0),
        trailers: request.trailers,
        
        addr: socket.remoteAddress,
        port: socket.remotePort,
        ipv6: socket.remoteFamily == 'IPv6'
    };
    
    Object.defineProperty(this.request, 'path', {
        get: function() {
            var req = url.parse(this.url);
            return req.pathname.charAt(0) == '/' ? req.pathname : '/' + req.pathname;
        }
    });
    
    Object.defineProperty(this.request, 'query', {
        get: function() {
            var req = url.parse(this.url, true);
            return req.query;
        }
    });
    
    Object.defineProperty(this.request, 'auth', {
        get: function() {
            var req = url.parse(this.url);
            return req.auth;
        }
    });

    this.response = {
        status: function(status) {
            if(status !== undefined) {
                _status = status;
            } else {
                return _status;
            }
        },
        headers: function(headers, merge) {
            if(headers !== undefined) {
                if(merge) {
                    for(var prop in headers) {
                        _headers[prop] = headers[prop];
                    }
                } else {
                    _headers = headers;
                }
            } else {
                return _headers;
            }
        },
        data: function(data, stream) {
            if(data !== undefined) {
                if(!startData) {
                    startData = true;
                    response.writeHead(_status, _headers);
                }
                if(stream) {
                    _data = Buffer.concat([new Buffer(data), new Buffer(_data)]);
                } else {
                    _data = data;
                }
            } else {
                return _data;
            }
        },
        end: function() {
            if(startData) {
                response.write(_data);
                response.end();
            } else {
                response.writeHead(_status, _headers);
                response.end();
            }
        }
    };
    
    this.server = {
        name: config.name,
        base: config.base,
        addr: socket.localAddress,
        port: socket.localPort,
        
        ssl: config.ssl
    };
    
    this.error = {
        log: function() {
            var message = Array.prototype.reduce.call(arguments, function(msg, str) {
                return msg + ' ' + str;
            }, '').substr(1) + '\n';
            error.write(message);
        }
    };
};
