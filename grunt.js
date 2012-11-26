module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    lint: {
      all: [
        'src/*.js',
        'src/**/*.js'
      ]
    },
    concat: {
      'dist-all': {
        src: [
          'src/*.js',
          'src/editingWidgets/*.js',
          'src/collectionWidgets/*.js',
          'src/storageWidgets/*.js',
          'locale/*.js'
        ],
        dest: 'examples/create.js'
      },
      editonly: {
        src: [
          'src/jquery.Midgard.midgardEditable.js',
          'src/jquery.Midgard.midgardStorageBase.js',
          'src/midgardCreate.localize.js',
          'src/editingWidgets/*.js',
          'locale/locale_en.js'
        ],
        dest: 'examples/create-editonly.js'
      }
    },
    // let's only concatenate, not minify whilst watching
    watch: {
      files: '<config:lint.all>',
      tasks: 'concat'
    },
    min: {
      dist: {
        src: ['examples/create.js'],
        dest: 'examples/create-min.js'
      },
      'editonly':{
        src: ['examples/create-editonly.js'],
        dest: 'examples/create-editonly-min.js'
      }
    },
    jshint: {
      options: {
        curly: true,
        immed: false,
        undef: true,
        browser: true,
        laxbreak: true
      },
      globals: {
        jQuery: true,
        Backbone: true,
        VIE: true,
        _: true
      }
    }
  });

  // Load local tasks; we should add local tasks later.
  // grunt.loadTasks("tasks");

  // Set default
  grunt.registerTask('default', 'lint concat min');

};
