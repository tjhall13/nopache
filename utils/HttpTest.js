var Semaphore = {
    createSemaphore: require('semaphore')
};
var Buffer = require('buffer').Buffer;

module.exports = function() {
    function Request(request) {
        var str = '';
        if(request.query) {
            str = '?';
            for(var key in request.query) {
                str = str.concat(key, '=', request.query[key], '&');
            }
            str = str.substring(0, str.length - 1);
        }
        this.url = request.url + str;
        this.method = request.method;
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
        
        test.httpEqual = function(expected, actual, message) {
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
                    actual.data = buffer.toString('utf8');
                    break;
                case 'application/json':
                    actual.data = JSON.parse(buffer.toString('utf8'));
                    break;
            }
            
            test.httpEqual(expected, actual);
            
            callback.apply(params);
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
    
    this.test = function() {
        sem = Semaphore.createSemaphore(testArray.length);
        context.expect(testArray.length);
        
        testArray.forEach(function(value, index, array) {
            sem.take(function() {
                self.run(value.request, value.response);
            });
        });
        
        sem.take(testArray.length, function() {
            sem.leave(testArray.length);
            context.done();
        });
    };
    
    this.run = function() { };
};
