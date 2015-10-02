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
            build: [
                'Gruntfile.js'
            ],
            core: [
                'index.js',
                'modules.js',
                'environment.js',
                'htaccess.js',
                'mime.js'
            ],
            contrib: [
                'contrib/libs/*.js'
            ],
            tests: [
                'test/*.js',
                'test/**/*.js'
            ],
            options: {
                node: true
            }
        },
        nodeunit: {
            all: ['test/test.js']
        }
    });
    
    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint', 'nodeunit']);
};
