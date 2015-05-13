module.exports = (grunt) ->

  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")

    concat:
      main:
        files:
          'dist/doTA.js': ['doTA.js']
          'dist/ngDoTA.js': ['doTA.js', 'ngDoTA.js']

    uglify:
      minify:
        options:
          mangle: true
          compress:
            drop_console: true
            unsafe: true
        files:
          'dist/doTA.min.js': ['dist/doTA.js']
          'dist/ngDoTA.min.js': ['dist/ngDoTA.js']

    'string-replace':
      dist:
        files:
          'dist/': ['dist/doTA.min.js']
        options:
          replacements: [
            pattern: /\bD\([^)]+\)\s*\+\s*|\\n/ig,
            replacement: ''
          ]

  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-string-replace'

  grunt.registerTask 'default',           ['build']
  grunt.registerTask 'build',             ['concat:main', 'uglify', 'string-replace']
