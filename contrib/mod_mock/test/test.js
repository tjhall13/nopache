var Buffer = require('buffer').Buffer;

var mod = require('../index.js');

var mock = {
    'object.php': {
        headers: {
            'Content-Type': 'image/jpeg'
        },
        data: new Buffer(0)
    },
    
    'array.php': [{
        request: {
            get: { value: 1 },
            cookies: { test: 'true' }
        },
        response: {
            headers: {
                'Content-Type': 'text/html'
            },
            data: '<html><body>Hello</body></html>'
        }
    }, {
        request: {
            post: { value: 2 },
            cookies: { test: 'true' }
        },
        response: {
            headers: {
                'Content-Type': 'text/html'
            },
            data: '<html><body>World</body></html>'
        }
    }],
    
    'function.asp': function(data) {
        return {
            headers: {
                'Content-Type': 'application/json'
            },
            data: data.get
        };
    },
    
    'string.asp': 'Module Mock test String'
};

var tests = [{
    file: 'object.php',
    request: {
        method: 'get',
        headers: { }
    },
    handle: true,
    http: {
        status: 200,
        headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': 0
        },
        data: new Buffer(0)
    }
}, {
    file: 'array.php',
    request: {
        method: 'get',
        query: { value: 1 },
        headers: {
            cookie: 'test=true'
        }
    },
    handle: true,
    http: {
        status: 200,
        headers: {
            'Content-Type': 'text/html',
            'Content-Length': 31
        },
        data: new Buffer('<html><body>Hello</body></html>')
    }
}, {
    file: 'array.php',
    request: {
        method: 'post',
        data: new Buffer('value=2'),
        headers: {
            cookie: 'test=true',
            'content-type': 'application/x-www-form-urlencoded'
        }
    },
    handle: true,
    http: {
        status: 200,
        headers: {
            'Content-Type': 'text/html',
            'Content-Length': 31
        },
        data: new Buffer('<html><body>World</body></html>')
    }
}, {
    file: 'array.php',
    request: {
        method: 'get',
        query: { },
        headers: {
            cookie: 'test=true'
        }
    },
    handle: true,
    http: {
        status: 400,
        headers: { },
        data: new Buffer(0)
    }
}, {
    file: 'function.asp',
    request: {
        method: 'get',
        query: { value: 2 },
        headers: {
            cookie: 'test=true'
        }
    },
    handle: true,
    http: {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': 11
        },
        data: new Buffer('{"value":2}')
    }
}, {
    file: 'string.asp',
    request: {
        method: 'get',
        headers: {
            cookie: 'test=true'
        }
    },
    handle: true,
    http: {
        status: 200,
        headers: {
            'Content-Type': 'text/plain',
            'Content-Length': 23
        },
        data: new Buffer('Module Mock test String')
    }
}, {
    file: 'fake.html',
    request: {
        method: 'get',
        headers: {
            cookie: 'test=true'
        }
    },
    handle: false
}, {
    file: 'fake.php',
    request: {
        method: 'get',
        headers: {
            cookie: 'test=true'
        }
    },
    handle: false
}];

module.exports = {
    mock: function(test) {
        test.expect(21);
        
        test.equal(mod.version(), '0.9.0');
        
        mod.register_initialize_hook({ }, mock);
        var handlers = mod.register_process_hooks();
        
        tests.forEach(function(input) {
            var found = false;
            var handled;
            
            var http = {
                status: undefined,
                headers: { },
                data: new Buffer(0)
            };
            
            var response = {
                status: function(status) {
                    http.status = status;
                },
                headers: function(headers, merge) {
                    if(merge) {
                        for(var header in headers) {
                            http.headers[header] = headers[header];
                        }
                    } else {
                        http.headers = headers;
                    }
                },
                data: function(data, stream) {
                    if(stream) {
                        http.data = Buffer.concat(http.data, new Buffer(data));
                    } else {
                        http.data = new Buffer(data);
                    }
                }
            };
            
            var error = {
                log: function(msg) { console.error(msg); }
            };
            
            function valid(err, data) {
                test.ok(!err);
                test.deepEqual(http, input.http);
            }
            
            for(var i = 0; i < handlers.length; i++) {
                found = handlers[i].regex.test(input.file);
                if(found) {
                    input.request.path = input.file;
                    handled = handlers[i].handler({
                        request: input.request,
                        response: response,
                        server: { },
                        error: error
                    }, valid);
                    break;
                }
            }
            if(!found) {
                handled = false;
            }
            test.equal(handled, input.handle);
        });
        
        test.done();
    }
};

/*

module.exports.mock({
    expect: function() { },
    ok: function() { },
    done: function() { }
});

*/
