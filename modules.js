var url = require('url');
var fs = require('fs');
var path = require('path');

var htaccess = require('./htaccess.js');
var mime = require('./mime.js');

String.prototype.severe = function(delimeter, count) {
    var i, j = 0;
    var char, array = [];
    for(i = 0; i < this.length && count > 1; i++) {
        if(this.charAt(i) == delimeter) {
            array.push(this.substr(j, i - j));
            count--;
            j = i + 1;
        }
    }
    
    if(count) {
        array.push(this.substr(j));
    }
    
    return array;
};

module.exports = function(config, mods) {
    var initialize_hooks = { };
    var access_hooks = { };
    var process_hooks = { };
    var response_hooks = { };
    var error_hook = function(code, env, callback) {
        callback(null, code);
    };
    
    var mod;
    for(var prop in mods) {
        mod = 'mod_' + prop;
    }
    
    function resolve(path, env, current) {
        if(!current) {
            current = config.base;
        }
        
        if(config.override) {
            var data = '';
            try {
                fs.statSync(current + '/.htaccess');
                data = fs.readFileSync(current + '/.htaccess', 'utf8');
            } catch(e) { }
            var access = new htaccess(data, access_hooks);
            path = access.apply(path, env, current);
            if(path == null) {
                return null;
            }
        } else {
            if(path === '') {
                path = 'index.html';
            }
        }
        
        var tokens = path.severe('/', 2);
        if(tokens.length > 1) {
            return resolve(tokens[1], env, current + '/' + tokens[0]);
        } else {
            return current + '/' + tokens[0];
        }
    }
    
    function default_handler(env, callback) {
        var ext = path.extname(env.request.path);
        try {
            var stat = fs.statSync(env.request.path);
            if(stat && !stat.isDirectory()) {
                fs.readFile(env.request.path, function(err, data) {
                    if(err) {
                        env.error.log(err);
                        env.response.status(500);
                        callback(null, 500);
                    } else {
                        env.response.status(200);
                        env.response.headers({
                            'Content-Type': mime.lookup(ext.substr(1)),
                            'Content-Length': data.length
                        });
                        env.response.data(data);
                        callback(null, 200);
                    }
                });
            } else {
                env.response.status(403);
                error_hook(403, env, callback);
                callback(null, 403);
            }
        } catch(e) {
            env.response.status(404);
            error_hook(404, env, callback);
        }
    }
    
    this.initialize_hooks = function(env) {
        for(var mod in initialize_hooks) {
            try {
                initialize_hooks[mod].handler.call(initialize_hooks[mod].context);
            } catch(e) {
                env.error.log(mod + ': ' + e);
            }
        }
    };
    
    this.request_hooks = function(env, callback) {
        var req = url.parse(env.request.url, true);
        
        var path = req.pathname;
        if(path.charAt(0) == '/') {
            path = path.substr(1);
        }
        path = resolve(env.request.url, env);
        env.request.path = path;
        
        callback(null, env);
    };
    
    this.process_hooks = function(env, callback) {
        if(!env.response.status()) {
            try {
                var ext = path.extname(env.request.path);
                var handler = process_hooks[ext];
                if(!handler || !handler(env, callback)) {
                    default_handler(env, callback);
                }
            } catch(e) {
                callback(e, null);
            }
        } else {
            error_hook(env.response.status(), env, callback);
        }
    };
    
    this.response_hooks = function(env, callback) {
        for(var mod in response_hooks) {
            try {
                response_hooks[mod].handler.sync(response_hooks[mod].context, env);
            } catch(e) {
                env.error.log(mod + ':', e);
                env.response.status(500);
                error_hook(500, env, callback);
            }
        }
        callback(null, env);
    };
};
