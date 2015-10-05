var url = require('url');
var flat = require('./flat.js');

function parseData(request) {
    var enc = request.headers['content-type'];
    switch(enc) {
        case 'multipart/form-data':
            var boundary = request.headers.boundary;
            // really don't have the patience for this shit
            break;
        case 'application/x-www-form-urlencoded':
            this.post = flat.deepen(url.parse('?' + request.data.toString(), true).query);
            break;
    }
}

module.exports = {
    parse: function(env) {
        if(!env.request.headers.cookie) {
            env.request.headers.cookie = '';
        }
        
        var requestData = {
            method: env.request.method.toLowerCase(),
            get: env.request.query,
            post: { },
            files: { },
            cookies: env.request.headers.cookie.split(';').reduce(function(cookies, cookie) {
                var tokens = cookie.trim().split('=');
                cookies[tokens[0]] = tokens[1];
                return cookies;
            }, { }),
            server: {
                'SERVER_ADDR': env.server.addr,
                'SERVER_NAME': env.server.name,
                'SERVER_PROTOCOL': env.request.version,
                'REQUEST_METHOD': env.request.method,
                
                'DOCUMENT_ROOT': env.server.base,
                'HTTP_ACCEPT': env.request.headers.accept,
                'HTTP_ACCEPT_CHARSET': env.request.headers['accept-charset'],
                'HTTP_ACCEPT_ENCODING': env.request.headers['accept-encoding'],
                'HTTP_ACCEPT_LANGUAGE': env.request.headers['accept-language'],
                'HTTP_CONNECTION': env.request.headers.connection,
                'HTTP_HOST': env.request.headers.host,
                'HTTP_USER_AGENT': env.request.headers['user-agent'],
                'HTTPS': env.server.ssl ? 'true' : false,
                'REMOTE_HOST': env.request.addr,
                'REMOTE_PORT': env.request.port,
                'REMOTE_USER': env.request.auth ? env.request.auth.split(':')[0] : undefined
            }
        };
        
        parseData.call(requestData, env.request);
        return requestData;
    },
    compare: function compare(expected, actual) {
        var type = typeof expected;
        if(type == typeof actual) {
            var equal = true;
            if(type == 'object' && expected !== null) {
                for(var prop in expected) {
                    equal = equal && compare(expected[prop], actual[prop]);
                }
                return equal;
            } else {
                return expected == actual;
            }
        } else {
            return expected == actual;
        }
    }
};
