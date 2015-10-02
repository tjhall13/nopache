/*
    variable regex: (?:(?:[_$a-zA-Z][_$a-zA-Z0-9]*)|(?:[0-9][1-9]*))
    path regex: (variable)(?:\[((?:variable\]\[)*variable)\])?
*/

module.exports = {
    deepen: function(data) {
        var object = [];
        var path, frame, key;
        var keys = [];
        
        var regex = /((?:(?:[_$a-zA-Z][_$a-zA-Z0-9]*)|(?:[0-9][1-9]*)))(?:\[((?:(?:(?:[_$a-zA-Z][_$a-zA-Z0-9]*)|(?:[0-9][1-9]*))\]\[)*(?:(?:[_$a-zA-Z][_$a-zA-Z0-9]*)|(?:[0-9][1-9]*)))\])?/;
            
        var populate = function(frame, key, keys, value) {
            if(!frame) {
                frame = [];
            }
            
            if(key.match(/[^0-9]/) && Array.isArray(frame)) {
                frame = frame.reduce(function(obj, value, ref) {
                    obj[ref] = value;
                    return obj;
                }, {});
            }
            
            if(keys.length === 0) {
                frame[key] = value;
            } else {
                frame[key] = populate(frame[key], keys.shift(), keys, value);
            }
            
            return frame;
        };
        
        for(var prop in data) {
            path = regex.exec(prop);
            
            keys.push(path[1]);
            if(path[2]) {
                Array.prototype.push.apply(keys, path[2].split(']['));
            }
            
            object = populate(object, keys.shift(), keys, data[prop]);
        }
        
        return object;
    },
    
    flatten: function(data) {
        var object = {};
        
        var merge = function(object, path, data) {
            if(typeof data === 'object') {
                if(Array.isArray(data)) {
                    data.forEach(function(value, index) {
                        merge(object, path + '[' + index + ']', value);
                    });
                } else {
                    for(var prop in data) {
                        merge(object, path + '[' + prop + ']', data[prop]);
                    }
                }
            } else {
                object[path] = data;
            }
        };
        
        if(Array.isArray(data)) {
            data.forEach(function(value, index) {
                merge(object, '[' + index + ']', value);
            });
        } else {
            for(var prop in data) {
                merge(object, prop, data[prop]);
            }
        }
        
        return object;
    }
};
