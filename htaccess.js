String.prototype.args = function() {
    var char, prev;
    var inString = false;
    var inSet = false;
    
    var output = [];
    var str = '';
    
    for(var i = 0; i < this.length; i++) {
        char = this[i];
        if(char == ' ' && !inSet && !inString) {
            output.push(str);
            str = '';
        } else {
            switch(char) {
                case '[':
                    inSet = true;
                    break;
                case ']':
                    inSet = false;
                    break;
                case '"':
                    inString = (prev == '\\') ? inString : !inString;
                    break;
            }
            str += char;
        }
        prev = char;
    }
    
    output.push(str);
    
    return output.filter(function(arg) {
        return arg !== '';
    });
}

module.exports = function(file, access_hooks) {
    fs.statSync(file);
    var data = fs.readFileSync(file, 'utf8');
    
    var mods = [];
    var hooks = { };
    for(var mod in access_hooks) {
        mods.push(mod);
        for(var hook in access_hooks[mod]) {
            hooks[hook] = {
                mod: mod,
                func: access_hooks[mod][hook]
            };
        }
    }
    
    var lines = data.split('\n').filter(function(line) {
        return line != '';
    });
    
    var regex = /^([a-zA-Z0-9]+)(?:[ ](.*))$/;
    
    var commands = lines.map(function(line) {
        var parts = regex.exec(line);
        return {
            cmd: parts[1],
            args: parts[2] ? parts[2].args() : []
        };
    });
    
    return {
        apply: function(path, env, current) {
            var state = mods.reduce(function(state, mod) {
                state[mod] = {
                    env: env,
                    current: current
                };
                Object.defineProperty(state[mod], 'path', {
                    get: function() {
                        return path;
                    },
                    set: function(_path) {
                        path = _path;
                    }
                });
                return state;
            }, { });
            
            for(var i = 0; i < commands.length; i++) {
                var hook = hooks[commands[i].cmd];
                if(hook && typeof hook.func == 'function') {
                    try {
                        hook.func.apply(state[hook.mod], commands[i].args);
                    } catch(e) {
                        return null;
                    }
                } else {
                    env.error.log(commands[i].cmd, ': command could not be executed');
                }
            }
            
            if(path === '') {
                path = 'index.html';
            }
            return path;
        }
    };
};
