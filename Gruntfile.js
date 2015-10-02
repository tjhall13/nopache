/*
 * nopache
 * https://github.com/tjhall13/nopache
 *
 * Copyright (c) 2015 Trevor Hall
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
    grunt.initConfig({
        jshint: {
            core: [
                'index.js',
                'lib/*.js'
            ],
            contrib: [
                'contrib/lib/*.js',
                'contrib/mod_*/*.js'
            ],
            tests: [
                'test/*.js',
                'test/**/*.js',
                'contrib/mod_*/test/*.js'
            ],
            options: {
                node: true
            }
        },
        nodeunit: {
            core: [
                'test/test.js'
            ],
            contrib: [
                'contrib/mod_*/test/test.js'
            ]
        }
    });
    
    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint', 'nodeunit']);
};
