var path = require('path');
var Buffer = require('buffer').Buffer;

var request = require('../lib/request.js');
var pkg = require('./package.json');

function Mock() {
    var hooks = { };
    
    function handle_object(object, env, callback) {
        env.response.status(200);
        env.response.headers(object.headers);
        var data;
        switch(typeof object.data) {
            case 'string':
                data = new Buffer(object.data);
                break;
            case 'object':
            if(Buffer.isBuffer(object.data)) {
                data = object.data;
            } else {
                env.response.headers({ 'Content-Type': 'application/json' }, true);
                data = new Buffer(JSON.stringify(object.data));
            }
                break;
            default:
                data = new Buffer(0);
                break;
        }
        env.response.headers({ 'Content-Length': data.length }, true);
        env.response.data(data);
        callback(null, env);
        return true;
    }

    function handle_string(str, env, callback) {
        var response = {
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': str.length
            },
            data: new Buffer(str)
        };
        
        return handle_object(response, env, callback);
    }

    function handle_array(arr, data, env, callback) {
        arr.forEach(function(value) {
            if(request.compare(value.request, data)) {
                return handle_object(value.response, env, callback);
            }
        });
        
        env.response.status(404);
        callback(null, env);
        return false;
    }

    function handle_function(func, data, env, callback) {
        var response = func.call(env, data);
        return handle_object(response, env, callback);
    }

    function handle_request(mock, env, callback) {
        var requestData = request.parse(env);
        switch(typeof mock) {
            case 'function':
                handle_function(mock, requestData, env, callback);
                break;
            case 'object':
            if(Array.isArray(mock)) {
                handle_array(mock, requestData, env, callback);
            } else {
                handle_object(mock, env, callback);
            }
                break;
            case 'string':
                handle_string(mock, env, callback);
                break;
            default:
                return false;
        }
        return true;
    }
    
    this.register_initialize_hook = function(config, arg) {
        var mocks;
        var ext;
        
        if(typeof arg == 'string') {
            try {
                mocks = require(path.resolve(arg));
            } catch(e) {
                console.error(e);
            }
        } else if(typeof arg == 'object') {
            mocks = arg;
        }
        var handler = function(env, callback) {
            var mock = mocks[env.request.path];
            if(mock) {
                return handle_request(mock, env, callback);
            } else {
                return false;
            }
        };
        for(var file in mocks) {
            ext = path.extname(file);
            if(!hooks[ext]) {
                hooks[ext] = handler;
            }
        }
    };
    
    this.register_process_hooks = function() {
        var handlers = [];
        for(var ext in hooks) {
            handlers.push({
                regex: new RegExp('^(.+)\\.' + ext.substr(1) + '$'),
                handler: hooks[ext]
            });
        }
        return handlers;
    };
    
    this.version = function() {
        return pkg.version;
    };
}

module.exports = new Mock();
