Nopache
=======

Install:
npm install nopache

Node webserver that can simulate php requests.  Eventually nohp (A node php interpreter) will be incorportated into nopache to allow php files to be ran as they would on a full web server.

# Usage
## Nopache Server
```javascript
// Include NopacheServer in your project
var NopacheServer = require('nopache').NopacheServer;

// Create a new server instance
var server = new NopacheServer({
    base: String, // *required*
            /* Path that will be the server document root   */
    port: Number, // *required*
            /* Port number the server will listen on
    override: Boolean, // default: false
            /* Allow .htaccess files to be read             */
    logfile: String, // default: null
            /* Sets the path of the error log file          */
            /* Accepts 1, 2, 'stdout' and 'stderr'          */
            /* as special values                            */
    ssl: {  // default: false
        key: String, // *required*
            /* path to ssl key file (.pem)                  */
        cert: String, // *required*
            /* path to ssl certificate file (.crt)          */
    }
});

// Start web server
server.listen();

// Close web server
server.close();
```

## Plugin Interface
With Nopache v0.9.0 and later, anyone can write a simple plugin for the Nopache webserver.  The plugin has access to the request and response data at every stage of the server.  To use a custom plugin, use the path to the plugin as the key in the mods key-value pairs or install a plugin with npm. Plugins installed by npm must follow the naming convention mod_MYPLUGIN where MYPLUGIN is the name provided to the mods object parameter.

### Plugin Creation
To create a plugin just make a js file or node package that when imported exposes any of the 5 functions to register hooks. Those functions are:

-   `initialize(config, arg)`
-   `register_request_hook(config)`
-   `register_access_hooks(config)`
-   `register_process_hooks(config)`
-   `register_response_hook(config)`

Each function will be provided the configuration variable used to configure the server and the initialize function is given a special argument which is the value in the mods key-value pairs.

#### `initialize(config, arg)`
Called at the start up of the server to initialize the plugin.  Is given the value in the mod declaration as the arg parameter.

#### `register_request_hook(config)`
This function must return a function with the signature: `handler(env, callback)` where env is the current request environment with relevant data. callback *MUST* be called as `callback(err, data)`.  If err is not null, the server will respond with error 500.  The data parameter must be the env variable.

#### `register_access_hooks(config)`
This function must return a key-value map of htaccess file commands and handlers.  Each handler will get called when the coresponding command is given in an htaccess file with the env parameter.  `this` will be set to a separate context for each module that is mutable for the lifetime of the request.

#### `register_process_hooks(config)`
This function must return an array of objects with the key `regex`; value equal to a `RegExp` and with the key `handler`; value equal to a function with the signature `function(env, callback)`.
Example:
```javascript
{
    regex: new RegExp('^test.+regex$'),
    value: function(env, callback) {
        ...
        callback(null, env);
        return true;
    }
}
```

This function must return true if it chooses to process the request otherwise it *MUST* return false.  If it does handle the request it must call the callback with the same rules as the `request_hook`.

#### `register_response_hook(config)`
This must return a function to which will be called after the request has been processed.  The rules for the returned handler is identical to `register_request_hook`.

## Contributed Plugins
### `mock`
Mock provides an easy way to mock entire requests.  It simply requires an object or path to a file to include as an object for the mock interface.  Mocks can be static, selected from an array of possible responses based on the request data or a simple function that returns the relevant data.

#### Mock Interface
```javascript
// Create a static response
var scripts = {
    '/example.php': {
        headers: {
            'Content-Type': 'text/plain'
        },
        data: 'Hello, World!'
    }
};

// Create an array of responses depending on request data
var scripts = {
    '/example.php': [
        {
            input: {
                get: { foo: 'value' }
            },
            output: {
                headers: {
                    'Content-Type': 'text/plain'
                },
                data: 'Hello'
            }
        },
        {
            input: {
                get: { bar: 'other' }
            },
            output: {
                headers: {
                    'Content-Type': 'text/plain'
                },
                data: 'World'
            }
        },
    ]
};

// Create a response that calls a javascript function
var scripts = {
    '/example.php': function(input) {
        // input == { get: { foo: 'bar' }, post: { } ... }
        var output = {
            headers: {
                'Content-Type': 'text/plain'
            },
            data: 'Hello, World!'
        };
        return output;
    }
};

// Create server instance using mock
var config = {
    ...
};

var server = new NopacheServer(config, {
    mock: script
};
```

# License

MIT
