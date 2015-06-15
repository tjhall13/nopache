var http = require('http');
var fs = require('fs');

var NopacheServer = require('../index.js').NopacheServer;
var HttpTest = require('../utils/HttpTest.js');

// Create asynchronous testing framework
var framework = new HttpTest();

// Save stubs
var _createServer = http.createServer;

var server;
var html = fs.readFileSync('tests/html/index.html', 'utf8');

var cgi = {
    mock: {
        php: {
            '/php/test.php': {
                response: [
                    {
                        input: {
                            post: {
                                data1: 'value1',
                                data2: 'value2'
                            }
                        },
                        output: {
                            type: 'json',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            data: {
                                data: 'value'
                            }
                        }
                    },
                    {
                        input: {
                            get: {
                                arg1: 'value1'
                            }
                        },
                        output: {
                            type: 'text',
                            headers: {
                                'Content-Type': 'text/html'
                            },
                            data: '<html></html>'
                        }
                    }
                ]
            }
        }
    },
    mods: false
};

module.exports = {
    setUp: function(done) {
        // Stub methods used
        http.createServer = function(handler) {
            return {
                listen: function(port, callback) {
                    // Open handler to requests
                    framework.run = handler;
                    
                    if(callback) {
                        callback();
                    }
                },
                close: function(callback) {
                    // Close handler
                    framework.run = function() { };
                    
                    if(callback) {
                        callback();
                    }
                }
            };
        };
        
        server = new NopacheServer('tests/html/', 2400, cgi);
        server.listen();
        
        done();
    },
    tearDown: function(done) {
        server.close();
        
        // Restore stubs
        http.createServer = _createServer;
        
        done();
    },
    
    all: {
        index: function(test) {
            framework.init(test);
            
            framework.add({ url: '/', method: 'GET' }, { status: 200, headers: { 'Content-Type': 'text/html' }, data: html });
            framework.add({ url: '/index.html', method: 'GET' }, { status: 200, headers: { 'Content-Type': 'text/html' }, data: html });
            framework.add({ url: '/fake.html', method: 'GET' }, { status: 404, headers: { }, data: '' });
            
            framework.test();
        },
        
        php: function(test) {
            framework.init(test);
            
            framework.add({ url: '/php/test.php', method: 'POST', query: { data1: 'value1', data2: 'value2' } }, { status: 200, headers: { 'Content-Type': 'application/json' }, data: { data: 'value' } });
            framework.add({ url: '/php/test.php', method: 'GET', query: { arg1: 'value1' } }, { status: 200, headers: { 'Content-Type': 'text/html' }, data: '<html></html>' });
            framework.add({ url: '/php/test.php', method: 'GET', query: { } }, { status: 500, headers: { }, data: '' });
            framework.add({ url: '/php/fake.php', method: 'GET' }, { status: 404, headers: { }, data: '' });
            
            framework.test();
        }
    }
};
