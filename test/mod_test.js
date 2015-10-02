var test;

module.exports = {
    register_initialize_hook: function(config, arg) {
        test.ok(arg);
    },
    
    register_request_hook: function(config) {
        return function(env, callback) {
            test.ok(true);
            callback(null, env);
        };
    },
    
    register_access_hooks: function(config) {
        return {
            'TestCommand': function(arg1, arg2) {
                test.equal(arg1, 'arg1');
                test.equal(arg2, '"argument 2"');
                
                test.equal(this.current, '/mod');
                test.equal(this.path, 'query?value=1');
            }
        };
    },
    
    register_process_hooks: function(config) {
        return [{
            regex: /^\/mod\/(.+)/,
            handler: function(env, callback) {
                test.equal(env.request.path, '/mod/query');
                test.deepEqual(env.request.query, { value: 1});
                
                env.response.status(200);
                env.response.headers({
                    'Content-Type': 'text/plain',
                    'Content-Length': 24
                });
                env.response.data('this is the modules test');
                
                callback(null, env);
                return true;
            }
        }];
    },
    
    register_response_hook: function(config) {
        return function(env, callback) {
            test.ok(true);
            callback(null, env);
        };
    },
    
    initialize: function(_test) {
        test = _test;
    }
};