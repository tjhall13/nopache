var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');

function NopacheServer(rootDir, port) { 
    if(rootDir.charAt(0) == '~') {
        rootDir = path.join(process.env.HOME || process.env.HOMEPATH, rootDir.substr(1));
    }
    var pathname = path.resolve(rootDir);
    
    function openRequest(request, callback) {
        var filename = path.join(pathname, request);
        var stat;
        
        try {
            stat = fs.statSync(filename);
        } catch(err) {
            callback('url does not exist', null);
            return false;
        }
        
        if(stat) {
            if(stat.isDirectory()) {
                filename = path.join(filename, 'index.html');
                stat = fs.statSync(filename);
                
                if(!stat || !stat.isFile()) {
                    callback('url does not exist', null);
                    return false;
                }
            } else if(!stat.isFile()) {
                callback('url does not exist', null);
                return false;
            }
            
            var extension = path.extname(filename);
            var type;
            
            switch(extension) {
                case '.html':
                    type = 'text/html';
                    break;
                case '.css':
                    type = 'text/css';
                    break;
                case '.js':
                    type = 'text/javascript';
                    break;
                case '.jpeg':
                    type = 'image/jpeg';
                    break;
                default:
                    type = undefined;
            }
            
            var header = { };
            
            fs.readFile(filename, function(err, data) {
                header['Content-Length'] = data.length;
                if(type) {
                    header['Content-Type'] = type;
                }
                
                callback(err, {
                    header: header,
                    body: data
                });
            });
        } else {
            callback('url does not exist', null);
            return false;
        }
    }
    
    var server = http.createServer(function(request, response) {
        var requestURL = url.parse(request.url);
        openRequest(requestURL.pathname, function(err, data) {
            if(err) {
                response.writeHead(404);
                response.end();
            } else {
                response.writeHead(200, data.header);
                response.write(data.body);
                response.end();
            }
        });
    });
    
    this.listen = function() {
        server.listen(port);
    }
}

module.exports = { nopache: NopacheServer };
