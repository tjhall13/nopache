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
server = new NopacheServer(base, port[, php]);

// Start web server
server.listen();

// Close web server
server.close();
```

## PHP Interface
```javascript
// Create a static response
var php = {
    '/example.php': {
        type: 'text',
        headers: {
            'Content-Type': 'text/plain'
        },
        data: 'Hello World'
    }
};

// Create an array of responses depending on request data
var php = {
    '/example.php': [
        {
            input: {
                get: { foo: 'value' }
            },
            output: {
                type: 'text',
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
                type: 'text',
                headers: {
                    'Content-Type': 'text/plain'
                },
                data: 'World'
            }
        },
    ]
};

// Create a response that calls a javascript function
var php = {
    '/example.php': function(input) {
        // input == { get: { foo: 'value' } }
        var output = {
            type: 'text',
            headers: {
                'Content-Type': 'text/plain'
            },
            data: 'World'
        };
        return output;
    }
};

// Use php interface
var server = new NopacheServer(base, port, php);
```

# License

MIT
