var http = require('http');
var fs = require('fs');
var path = require('path');

// Core includes
var NopacheServer = require('../index.js').NopacheServer;

// Libs includes
var htaccess = require('../lib/htaccess.js');
var core = require('../lib/core.js');

// Contrib includes
var flat = require('../contrib/lib/flat.js');
var request = require('../contrib/lib/request.js');

// Create asynchronous testing framework
var HttpTest = require('./utils/HttpTest.js');
var framework = new HttpTest();

// Save stubs
var _createServer = http.createServer;
var _statSync = fs.statSync;
var _readFileSync = fs.readFileSync;

// Save html data
var html = fs.readFileSync('./test/html/index.html', 'utf8');
var access = fs.readFileSync('./test/html/dir/.htaccess', 'utf8');

module.exports = {
    main: {
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
        },
        
        loader: function(test) {
            var mod = require('./mod_test.js');
            mod.initialize(test);
            
            var server = new NopacheServer({
                base: path.resolve('./test/html/'),
                port: 80,
                override: true,
                logfile: 2
            }, {
                './test/mod_test.js': true
            });
            
            server.listen();
            
            framework.init(test);
            
            framework.add({ url: '/mod/query?value=1', method: 'GET' }, { status: 200, headers: { 'Content-Type': 'text/plain', 'Content-Length': 24 }, data: 'this is the modules test' });
            
            framework.begin(9, function(test) {
                server.close();
                test.done();
            });
        }
    },
    
    libs: {
        setUp: function(done) {
            fs.statSync = function(file) {
                switch(file) {
                    case 'test1/.htaccess':
                        return true;
                    default:
                        break;
                }
                throw 'file not found';
            };
            
            fs.readFileSync = function(file) {
                switch(file) {
                    case 'test1/.htaccess':
                        return access;
                    default:
                        break;
                }
                throw 'file not found';
            };
            
            done();
        },
        tearDown: function(done) {
            fs.statSync = _statSync;
            fs.readFileSync = _readFileSync;
            
            done();
        },
        
        htaccess: function(test) {
            test.expect(1);
            
            var env = {
                request: {
                    
                },
                response: {
                    
                },
                server: {
                    
                },
                error: {
                    log: function() {
                        var message = Array.prototype.reduce.call(arguments, function(msg, str) {
                            return msg + ' ' + str;
                        }, '').substr(1);
                        test.ok(false, message);
                    }
                }
            };
            
            var access = htaccess('test1/.htaccess', {
                test: {
                    'BasicCommand': function(arg1, arg2) {
           //             console.log('basic');
                    },
                    'AdvancedCommand': function(arg1) {
           //             console.log('advanced');
                        return true;
                    },
                    'NestedCommand': function() {
           //             console.log('nested');
                        return true;
                    }
                }
            });
            access.apply('', env, '');
            
            test.ok(true);
            
            test.done();
        },
        
        core: function(test) {
            test.expect(6);
            
            var state = {
                current: '',
                path: '',
                env: {
                    config: {
                        files: []
                    }
                }
            };
            
            core.commands.AcceptPathInfo.call(state, 'On');
            test.equal(state.env.config['accept-path-info'], 'on');
            
            core.commands.AddDefaultCharSet.call(state, 'On');
            test.equal(state.env.config['default-charset'], 'iso-8859-1');
            
            core.commands.ContentDigest.call(state, 'On');
            test.equal(state.env.config['content-digest'], true);
            
            core.commands.DefaultType.call(state, 'application/xml');
            test.equal(state.env.config['default-type'], 'application/xml');
            
            core.commands.ErrorDocument.call(state, 404, '/error/path');
            test.equal(state.env.config['error-documents'][404], '/error/path');
            
            core.commands.FileETag.call(state, 'INode');
            test.deepEqual(state.env.config['etag-attributes'], { inode: true, mtime: false, size: false });
            
            var cb = core.commands.Files.call(state, '?at.*');
            
            test.done();
        }
    },
    
    contrib: {
        flat: function(test) {
            test.expect(2);
            
            var output = flat.deepen({
                'test[0]': 'a',
                'test[1]': 'b',
                'test[2][prop]': 'c',
                'test[2][attr]': 'd',
                'test[2][expr][0]': 'e',
                'test[2][expr][1]': 'f'
            });
            test.deepEqual({
                test: [
                    'a',
                    'b', {
                        prop: 'c',
                        attr: 'd',
                        expr: [ 'e', 'f' ]
                    }
                ]
            }, output);
            
            var input = flat.flatten({
                test: {
                    arr: [
                        'a',
                        'b',
                        'c', {
                            obj: {
                                value: 'd'
                            }
                        }
                    ]
                }
            });
            test.deepEqual({
                'test[arr][0]': 'a',
                'test[arr][1]': 'b',
                'test[arr][2]': 'c',
                'test[arr][3][obj][value]': 'd'
            }, input);
            
            test.done();
        }
    }
};
