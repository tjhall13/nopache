var fs = require('fs');

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
};

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
    var commands = [];
    
    var blank = /^[ ]*(#.*)?[ ]*$/;
    var lines = data.split('\n').filter(function(line) {
        return !blank.test(line);
    });
    
    var open_tag = /^[ ]*<[ ]*([a-zA-Z0-9]+)(?:[ ](.*))?>$/;
    var close_tag = /^[ ]*<[ ]*\/[ ]*([a-zA-Z0-9]+)[ ]*>$/;
    var command = /^[ ]*([a-zA-Z0-9]+)(?:[ ](.*))?$/;
    
    var stack = [];
    var symbol, tag = null;
    
    lines.forEach(function(line) {
        symbol = command.exec(line);
        if(symbol) {
            symbol = command.exec(line);
            commands.push({
                cmd: symbol[1],
                args: symbol[2] ? symbol[2].args() : []
            });
        } else {
            symbol = open_tag.exec(line);
            if(symbol) {
                stack.push({
                    tag: tag,
                    commands: commands
                });
                
                commands = [];
                tag = {
                    cmd: symbol[1],
                    args: symbol[2] ? symbol[2].args() : []
                };
            } else {
                symbol = close_tag.exec(line);
                if(symbol) {
                    if(tag.cmd == symbol[1]) {
                        var ctx = stack.pop();
                        tag.children = commands;
                        
                        commands = ctx.commands;
                        commands.push(tag);
                        tag = ctx.tag;
                    } else {
                        // Tag misalignment
                        console.error('Tag misalignment', line);
                    }
                } else {
                    // Not a valid command
                    console.error('Not a valid command:', line);
                }
            }
        }
    });
    
    return {
        apply: function(path, env, current) {
            var state = mods.reduce(function(state, mod) {
                state[mod] = {
                    env: env,
                    url: { }
                };
                Object.defineProperty(state[mod].url, 'path', {
                    get: function() {
                        return path;
                    },
                    set: function(_path) {
                        path = _path;
                    }
                });
                Object.defineProperty(state[mod].url, 'current', {
                    get: function() {
                        return current;
                    },
                    set: function(_current) {
                        current = _current;
                    }
                });
                return state;
            }, { });
            
            var stack = [null];
            var i = 0;
            var hook;
            
            while(i < commands.length || stack.length > 0) {
                if(i < commands.length) {
                    hook = hooks[commands[i].cmd];
                    var cond = false;
                    if(hook && typeof hook.func == 'function') {
                        try {
                            cond = hook.func.apply(state[hook.mod], commands[i].args);
                            if(cond && commands[i].children) {
                                stack.push({
                                    i: i,
                                    commands: commands,
                                    cb: cond
                                });
                                
                                commands = commands[i].children;
                                i = -1;
                            }
                        } catch(e) {
                            return null;
                        }
                    } else {
                        env.error.log(commands[i].cmd + ':', 'Command not found');
                    }
                } else {
                    var ctx = stack.pop();
                    if(ctx) {
                        i = ctx.i;
                        commands = ctx.commands;
                        
                        if(typeof ctx.cb == 'function') {
                            hook = hooks[commands[i].cmd];
                            ctx.cb.call(state[hook.mod]);
                        }
                    }
                }
                i++;
            }
            
            if(path === '') {
                path = 'index.html';
            }
            return path;
        }
    };
};
