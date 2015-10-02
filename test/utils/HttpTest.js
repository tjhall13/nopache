var Semaphore = {
    createSemaphore: require('semaphore')
};
var Buffer = require('buffer').Buffer;

module.exports = function() {
    function Request(request) {
        var str = '';
        var data = null;
        
        if(request.query) {
            str = '?';
            for(var key in request.query) {
                str = str.concat(key, '=', request.query[key], '&');
            }
            str = str.substring(0, str.length - 1);
        }
        if(request.body) {
            data = request.body;
        }
        
        this.httpVersion = '1.1';
        this.url = request.url + str;
        this.method = request.method;
        this.headers = { };
        this.trailers = { };
        this.socket = {
            remoteAddress: '127.0.0.1',
            remotePort: 16000,
            remoteFamily: 'IPv4',
            
            localAddress: '127.0.0.1',
            localPort: 80
        };
        
        this.on = function(event, callback) {
            if(event == 'data' && data) {
                callback(data);
            }
            
            if(event == 'end') {
                callback();
            }
        };
    }

    function Response(test, expected, callback, params) {
        var actual = {
            status: 0,
            headers: { },
            data: ''
        };
        
        if(!params) {
            params = [];
        }
        
        var buffer = new Buffer(0);
        
        test.httpEqual = function(actual, expected, message) {
            if(expected.status == actual.status) {
                for(var header in expected.headers) {
                    if(expected.headers[header] != actual.headers[header]) {
                        return this.equal(expected, actual, message);
                    }
                }
                return this.deepEqual(expected.data, actual.data, message);
            } else {
                return this.equal(expected, actual, message);
            }
        };
        
        this.writeHead = function(status, headers) {
            actual.status = status;
            if(headers) {
                actual.headers = headers;
            }
        };
        
        this.write = function(data) {
            buffer = Buffer.concat([buffer, data]);
        };
        
        this.end = function(data) {
            if(data) {
                this.write(data);
            }
            
            switch(actual.headers['Content-Type']) {
                case 'text/html':
                case 'text/plain':
                    actual.data = buffer.toString('utf8');
                    break;
                case 'application/json':
                    actual.data = JSON.parse(buffer.toString('utf8'));
                    break;
            }
            
            test.httpEqual(expected, actual);
            
            callback.apply(this, params);
        };
    }
    
    var self = this;
    var context;
    var testArray = [];
    var sem;
    
    this.init = function(test) {
        context = test;
        testArray = [];
        sem = null;
    };
    
    this.add = function(request, response) {
        testArray.push({
            request: new Request(request),
            response: new Response(context, response, function() {
                sem.leave();
            })
        });
    };
    
    this.begin = function(expect, callback) {
        if(callback === undefined && typeof expect == 'function') {
            callback = expect;
            expect = 0;
        }
        if(testArray.length) {
            sem = Semaphore.createSemaphore(testArray.length);
            context.expect(testArray.length + expect);
            
            testArray.forEach(function(value, index, array) {
                sem.take(function() {
                    self.run(value.request, value.response);
                });
            });
            
            sem.take(testArray.length, function() {
                sem.leave(testArray.length);
                callback(context);
            });
        } else {
            callback(context);
        }
    };
    
    this.run = function() { };
};
