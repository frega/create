//     Create.js - On-site web editing interface
//     (c) 2011-2012 Henri Bergius, IKS Consortium
//     Create may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://createjs.org/
(function (jQuery, undefined) {
  // Run JavaScript in strict mode
  /*global jQuery:false _:false window:false */
  'use strict';

  jQuery.widget('Midgard.midgardStorageBase', {
    saveEnabled: true,
    options: {
      // VIE instance to use for storage handling
      vie: null,
      // URL callback for Backbone.sync
      url: '',
      // Whether to enable automatic saving
      autoSave: false,
      // How often to autosave in milliseconds
      autoSaveInterval: 5000,
      // Whether to save entities that are referenced by entities
      // we're saving to the server.
      saveReferencedNew: false,
      saveReferencedChanged: false,
      // Namespace used for events from midgardEditable-derived widget
      editableNs: 'midgardeditable',
      localize: function (id, language) {
        return window.midgardCreate.localize(id, language);
      },
      language: null
    },

    _create: function () {
      var widget = this;
      this.changedModels = [];

      this.vie = this.options.vie;

      this.vie.entities.bind('add', function (model) {
        // Add the back-end URL used by Backbone.sync
        model.url = widget.options.url;
        model.toJSON = model.toJSONLD;
      });

      widget._bindEditables();
      if (widget.options.autoSave) {
        widget._autoSave();
      }
    },

    _autoSave: function () {
      var widget = this;
      widget.saveEnabled = true;

      var doAutoSave = function () {
        if (!widget.saveEnabled) {
          return;
        }

        if (widget.changedModels.length === 0) {
          return;
        }

        widget.saveRemoteAll({
          // We make autosaves silent so that potential changes from server
          // don't disrupt user while writing.
          silent: true
        });
      };

      var timeout = window.setInterval(doAutoSave, widget.options.autoSaveInterval);

      this.element.bind('startPreventSave', function () {
        if (timeout) {
          window.clearInterval(timeout);
          timeout = null;
        }
        widget.disableAutoSave();
      });
      this.element.bind('stopPreventSave', function () {
        if (!timeout) {
          timeout = window.setInterval(doAutoSave, widget.options.autoSaveInterval);
        }
        widget.enableAutoSave();
      });

    },

    enableAutoSave: function () {
      this.saveEnabled = true;
    },

    disableAutoSave: function () {
      this.saveEnabled = false;
    },

    _bindEditables: function () {
      var widget = this;

      console.log('_bindEditables', widget.options.editableNs);


      widget.element.bind(widget.options.editableNs + 'changed', function (event, options) {
        if (_.indexOf(widget.changedModels, options.instance) === -1) {
          widget.changedModels.push(options.instance);
        }
      });

      widget.element.bind(widget.options.editableNs + 'disable', function (event, options) {
        console.log('disable', options);
        widget.revertChanges(options.instance);
      });

      widget.element.bind(widget.options.editableNs + 'enable', function (event, options) {
        if (!options.instance._originalAttributes) {
          options.instance._originalAttributes = _.clone(options.instance.attributes);
        }
      });
    },

    saveReferences: function (model) {
      _.each(model.attributes, function (value, property) {
        if (!value || !value.isCollection) {
          return;
        }

        value.each(function (referencedModel) {
          if (this.changedModels.indexOf(referencedModel) !== -1) {
            // The referenced model is already in the save queue
            return;
          }

          if (referencedModel.isNew() && this.options.saveReferencedNew) {
            return referencedModel.save();
          }

          if (referencedModel.hasChanged() && this.options.saveReferencedChanged) {
            return referencedModel.save();
          }
        }, this);
      }, this);
    },

    saveRemote: function (model, options) {
      // Optionally handle entities referenced in this model first
      this.saveReferences(model);

      this._trigger('saveentity', null, {
        entity: model,
        options: options
      });

      var widget = this;
      model.save(null, _.extend({}, options, {
        success: function (m, response) {
          // From now on we're going with the values we have on server
          model._originalAttributes = _.clone(model.attributes);
          window.setTimeout(function () {
            // Remove the model from the list of changed models after saving
            widget.changedModels.splice(widget.changedModels.indexOf(model), 1);
          }, 0);
          if (_.isFunction(options.success)) {
            options.success(m, response);
          }
          widget._trigger('savedentity', null, {
            entity: model,
            options: options
          });
        },
        error: function (m, response) {
          if (_.isFunction(options.error)) {
            options.error(m, response);
          }
        }
      }));
    },

    saveRemoteAll: function (options) {
      var widget = this;
      if (widget.changedModels.length === 0) {
        return;
      }

      widget._trigger('save', null, {
        entities: widget.changedModels,
        options: options,
        // Deprecated
        models: widget.changedModels
      });

      var needed = widget.changedModels.length;
      var totalSaved = needed;

      widget.disableAutoSave();
      _.each(widget.changedModels, function (model) {
        this.saveRemote(model, {
          success: function (m, response) {
            needed--;
            if (needed <= 0) {
              // All models were happily saved
              widget._trigger('saved', null, {
                changedModels: widget.changedModels,
                totalSaved: totalSaved,
                options: options
              });
              if (options && _.isFunction(options.success)) {
                options.success(m, response);
              }
              widget.enableAutoSave();
            }
          },
          error: function (m, err) {
            if (options && _.isFunction(options.error)) {
              options.error(m, err);
            }
            widget._trigger('error', null, {
              instance: model,
              error: err
            });
          }
        });
      }, this);
    },

    revertChanges: function (model) {

      var widget = this;

      // Remove unsaved collection members
      if (!model) { return; }
      debugger ;
      _.each(model.attributes, function (attributeValue, property) {
        if (attributeValue instanceof widget.vie.Collection) {
          var removables = [];
          attributeValue.forEach(function (model) {
            if (model.isNew()) {
              removables.push(model);
            }
          });
          attributeValue.remove(removables);
        }
      });

      // Restore original object properties
      if (!model.changedAttributes()) {
        if (model._originalAttributes) {
          model.set(model._originalAttributes);
        }
        return;
      }

      model.set(model.previousAttributes());
    }

  });
})(jQuery);
