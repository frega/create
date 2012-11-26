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
          // no ui, no toolbar, no notifications.
          'src/jquery.Midgard.midgardEditable.js',
          'src/jquery.Midgard.midgardStorageBase.js',
          'src/midgardCreate.localize.js',
          // currently one collection widget needs to be provided @see #151.
          'src/collectionWidgets/jquery.Midgard.midgardCreateCollectionAdd.js',
          'src/editingWidgets/jquery.Midgard.midgardEditableBase.js',
          'src/editingWidgets/jquery.Midgard.midgardEditableEditorAloha.js',
          'locale/locale_en.js'
        ],
        dest: 'examples/create-editonly.js'
      },
      'basic': {
        src: [
          'src/jquery.Midgard.midgardCreate.js',
          'src/jquery.Midgard.midgardEditable.js',
          'src/jquery.Midgard.midgardToolbar.js',
          'src/jquery.Midgard.midgardNotifications.js',
          'src/jquery.Midgard.midgardStorageBase.js',
          'src/midgardCreate.localize.js',
          'src/collectionWidgets/jquery.Midgard.midgardCreateCollectionAdd.js',
          'src/editingWidgets/jquery.Midgard.midgardEditableBase.js',
          'src/editingWidgets/jquery.Midgard.midgardEditorHallo.js',
          'src/storageWidgets/jquery.Midgard.midgardStorage.js',
          'locale/locale_en.js'
        ],
        dest: 'examples/create-basic.js'
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
      },
      'basic': {
        src: ['examples/create-basic.js'],
        dest: 'examples/create-basic-min.js'
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
