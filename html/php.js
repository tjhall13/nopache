module.exports = {
    '/this/is/a/path.php': {
        headers: {
            'Content-Type': 'text/plain',
            'Content-Length': 14
        },
        data: 'this is a test'
    },
    '/test/array.php': [{
        request: {
            method: 'get',
            get: {
                a: 'b',
                c: 'd'
            }
        },
        response: {
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': 20
            },
            data: 'this is another test'
        }
    }, {
        request: { },
        response: {
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': 24
            },
            data: 'this is default response'
        }
    }]
};
