var path = require('path');
var Buffer = require('buffer').Buffer;

var request = require('../lib/request.js');
var pkg = require('./package.json');

function handle_object(object, env, callback) {
    env.response.status(200);
    env.response.headers(object.headers);
    switch(typeof object.data) {
        case 'string':
            env.response.data(new Buffer(object.data));
            break;
        case 'object':
        if(Buffer.isBuffer(object.data)) {
            env.response.data(object.data);
        } else {
            env.response.headers({ 'Content-Type': 'application/json' }, true);
            env.response.data(new Buffer(JSON.stringify(object.data)));
        }
            break;
        default:
            break;
    }
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

var hooks = { };

module.exports = {
    register_initialize_hook: function(config, arg) {
        try {
            var mocks = require(path.resolve(arg));
            var ext;
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
        } catch(e) {
            console.error(e);
        }
    },
    register_process_hooks: function() {
        var handlers = [];
        for(var ext in hooks) {
            handlers.push({
                regex: new RegExp('^(.+)\\.' + ext.substr(1) + '$'),
                handler: hooks[ext]
            });
        }
        return handlers;
    },
    
    version: function() {
        return pkg.version;
    }
};
