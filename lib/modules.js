var fs = require('fs');
var path = require('path');
var url = require('url');

var htaccess = require('./htaccess.js');
var core = require('./core.js');

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

String.prototype.contains = function(char) {
    return this.indexOf(char) >= 0;
};

module.exports = function(config, mods) {
    var initialize_hooks = { };
    var request_hooks = { };
    var access_hooks = { };
    var process_hooks = [ ];
    var response_hooks = { };
    var error_hook = function(code, env, callback) {
        callback(null, env);
    };
    
    var enabled_mods = [];
    var mod_information = { };
    
    var states = null;
    
    for(var prop in mods) {
        var mod;
        try {
            mod = require('../contrib/' + 'mod_' + prop);
        } catch(e) {
            try {
                if(prop.contains('/') || prop.charAt(0) == '.') {
                    mod = require(path.resolve(prop));
                } else {
                    mod = require('mod_' + prop);
                }
            } catch(e) {
                mod = null;
                console.error('unable to load module', prop);
            }
        }
        if(mod !== null) {
            initialize_mod(prop, mod, mods[prop]);
        }
    }
    
    function initialize_mod(name, mod, arg) {
        enabled_mods.push(name);
        
        if(mod.initialize) {
            mod.initialize(config, arg);
        }
        if(mod.register_request_hook) {
            request_hooks[name] = mod.register_request_hook(config);
        }
        if(mod.register_access_hooks) {
            access_hooks[name] = mod.register_access_hooks(config);
        }
        if(mod.register_process_hooks) {
            var handlers = mod.register_process_hooks(config);
            handlers.forEach(function(value) {
                value.mod = name;
                process_hooks.push(value);
            });
        }
        if(mod.register_response_hook) {
            response_hooks[name] = mod.register_response_hook(config);
        }
        
        mod_information[name] = { };
        if(mod.version) {
            mod_information[name].version = mod.version();
        }
    }
    
    function resolve(path, env, current) {
        if(!current) {
            current = '';
        }
        
        if(config.override) {
            var data = '';
            try {
                var file = env.server.base + current + '/.htaccess';
                var access = htaccess(file, access_hooks, states);
                path = access.apply(path, env, current);
            } catch(e) {
                if(url.parse(path).pathname === null) {
                    path = 'index.html';
                }
            }
            if(path === null) {
                return null;
            }
        } else {
            if(url.parse(path).pathname === null) {
                path = 'index.html';
            }
        }
        
        var tokens = path.severe('/', 2);
        if(tokens.length > 1) {
            if(tokens[0] === '') {
                return resolve(tokens[1], env, current);
            } else {
                return resolve(tokens[1], env, current + '/' + tokens[0]);
            }
        } else {
            return current + '/' + tokens[0];
        }
    }
    
    this.begin_request = function() {
        states = {
            core: { },
            _deferred: []
        };
        enabled_mods.forEach(function(mod) {
            states[mod] = { };
        });
    };
    
    this.request_hooks = function(env, callback) {
        for(var mod in request_hooks) {
            try {
                request_hooks[mod].sync(states[mod], env);
            } catch(e) {
                env.error.log(mod + ':', e);
                env.response.status(500);
                error_hook(500, env, callback);
            }
        }
        env.request.url = resolve(env.request.url, env);
        callback(null, env);
    };
    
    this.process_hooks = function(env, callback) {
        if(!env.response.status()) {
            try {
                var pathname = env.request.path;
                var handled;
                var hook;
                for(var i = 0; i < process_hooks.length; i++) {
                    handled = false;
                    hook = process_hooks[i];
                    if(hook.regex.test(pathname)) {
                        handled = hook.handler.call(states[hook.mod], env, callback);
                        if(handled) { break; }
                    }
                }
                if(!handled) {
                    var code = core.default_handler(env, callback);
                    if(code && code != 200) {
                        error_hook(code, env, callback);
                    }
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
                response_hooks[mod].sync(states[mod], env);
            } catch(e) {
                env.error.log(mod + ':', e);
                env.response.status(500);
                error_hook(500, env, callback);
            }
        }
        callback(null, env);
    };
    
    this.end_request = function() {
        states = null;
    };
};
