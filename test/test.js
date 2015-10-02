var http = require('http');
var fs = require('fs');
var path = require('path');

var NopacheServer = require('../index.js').NopacheServer;
var HttpTest = require('./utils/HttpTest.js');

// Create asynchronous testing framework
var framework = new HttpTest();

// Save stubs
var _createServer = http.createServer;

var html = fs.readFileSync('./test/html/index.html', 'utf8');

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
        
        done();
    },
    tearDown: function(done) {
        // Restore stubs
        http.createServer = _createServer;
        
        done();
    },
    
    all: {
        index: function(test) {
            var server = new NopacheServer({
                base: path.resolve('./test/html/'),
                port: 80
            });
            
            server.listen();
            
            framework.init(test);
            
            framework.add({ url: '/', method: 'GET' }, { status: 200, headers: { 'Content-Type': 'text/html', 'Content-Length': html.length }, data: html });
            framework.add({ url: '/index.html', method: 'GET' }, { status: 200, headers: { 'Content-Type': 'text/html', 'Content-Length': html.length }, data: html });
            framework.add({ url: '/dir/', method: 'GET' }, { status: 200, headers: { 'Content-Type': 'text/html', 'Content-Length': html.length }, data: html });
            framework.add({ url: '/dir/index.html', method: 'GET' }, { status: 200, headers: { 'Content-Type': 'text/html', 'Content-Length': html.length }, data: html });
            framework.add({ url: '/dir/fake.html', method: 'GET' }, { status: 404, headers: { }, data: '' });
            framework.add({ url: '/fake.html', method: 'GET' }, { status: 404, headers: { }, data: '' });
            
            framework.begin(function(test) {
                server.close();
                test.done();
            });
        }
    }
};
