Array.prototype.contains = function(value) {
    for(var i = 0; i < this.length; i++) {
        if(value == this[i]) {
            return true;
        }
    }
    return false;
};

module.exports = {
    register_access_hooks: function(config) {
        return {
            'LogLevel': function() { },
            'RewriteEngine': function(on) {
                this.enable = (on.toLowerCase() == 'on');
            },
            'RewriteBase': function(base) {
                // Still don't know what to do with this
                this.base = base.charAt(base.length - 1) == '/' ? base.substr(0, base.length - 1) : base;
                this.path = '/' + this.path;
            },
            'RewriteCond': function(path, cond) {
            },
            'RewriteRule': function(regex, path, flags) {
                if(flags) {
                    flags = flags
                        .substr(1, flags.length - 2)
                        .split(',')
                        .map(function(flag) {
                            return flag.trim();
                        });
                } else {
                    flags = [];
                }
            
                regex = new RegExp(regex);
                if(this.path.match(regex)) {
                    this.path = this.path.replace(regex, path);
                    
                    if(flags.contains('R')) {
                        this.env.response.status(302);
                        this.env.response.headers({ 'Location': this.base + this.path });
                        
                        throw { error: 'redirect' };
                    }
                }
            }
        };
    }
};
