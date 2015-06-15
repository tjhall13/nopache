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
            all: [
                'Gruntfile.js',
                'index.js',
                'tests/*.js'
            ],
            options: {
                node: true
            }
        },
        nodeunit: {
            all: ['tests/*.js']
        }
    });
    
    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // By default, lint and run all tests.
    grunt.registerTask('default', ['jshint', 'nodeunit']);
};
