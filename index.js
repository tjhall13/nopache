var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var stream = require('stream');

var Sync = require('sync');

var NopacheModules = require('./modules.js');
var Environment = require('./environment.js');

var pkg = require('./package.json');

module.exports = {
    NopacheServer: function(config, mods) {
        if(config.base.charAt(0) == '~') {
            config.base = path.join(process.env.HOME || process.env.HOMEPATH, config.base.substr(1));
        }
        config.base = path.resolve(config.base);
        
        if(config.logfile) {
            config.logfile = fs.createWriteStream(config.logfile);
        } else {
            config.logfile = new stream.Writable({
                write: function(chunk, encoding, next) { }
            });
        }
        
        if(!mods) {
            mods = { };
        }
        
        var server;
        if(config.ssl) {
            var options = {
                key: fs.readFileSync(config.ssl.key),
                cert: fs.readFileSync(config.ssl.cert)
            };
            
            server = https.createServer(options, requestHandler);
        } else {
            server = http.createServer(requestHandler);
        }
        
        var modules = new NopacheModules(config, mods);
        
        function requestHandler(request, response) {
            var env = new Environment(request, response, config);
            
            request.on('data', function(frame) {
                if(typeof frame === 'string') {
                    frame = new Buffer(frame, 'utf8');
                }
                env.request.data = Buffer.concat([env.request.data, frame], env.request.data.length + frame.length);
            });
            
            request.on('end', function() {
                Sync(function() {
                    try {
                        modules.request_hooks.sync(modules, env);
                        modules.process_hooks.sync(modules, env);
                        modules.response_hooks.sync(modules, env);
                    } catch(err) {
                        env.error.log(err);
                        env.response.status(500);
                        env.response.headers({ });
                        env.response.data(new Buffer(0));
                    }
                    env.response.end();
                });
            });
        }
        
        this.listen = function(callback) {
            server.listen(config.port, callback);
        };
        
        this.close = function(callback) {
            server.close(callback);
        };
    },
    config: function(config) {
        var defaults = {
            base: '.',
            port: 80,
            override: false,
            logfile: false
        };
        
        for(var option in config) {
            defaults[option] = config[option];
        }
        
        return defaults;
    },
    cli: function(config, mods) {
        var server = new this.NopacheServer(config, mods);
        server.listen();
    },
    version: function() {
        return pkg.version;
    }
};
