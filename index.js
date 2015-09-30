var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var stream = require('stream');

var Sync = require('sync');

var NopacheModules = require('./modules.js');
var Environment = require('./environment.js');

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
        modules.initialize_hooks({
            error: {
                log: function() {
                    var message = Array.prototype.reduce.call(arguments, function(msg, str) {
                        return msg + ' ' + str;
                    }, '').substr(1) + '\n';
                    errorStream.write(message);
                }
            }
        });
        
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
    cli: function(config) {
        var server = new this.NopacheServer(config, { });
        server.listen();
    }
};

var nopache = module.exports;

var config = nopache.config({
    base: './test/',
    port: 2400,
    override: true,
    logfile: './error.log'
});
nopache.cli(config);
