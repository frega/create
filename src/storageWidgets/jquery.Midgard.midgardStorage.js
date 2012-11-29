//     Create.js - On-site web editing interface
//     (c) 2011-2012 Henri Bergius, IKS Consortium
//     Create may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://createjs.org/
(function (jQuery, undefined) {
  // Run JavaScript in strict mode
  /*global jQuery:false _:false window:false */
  'use strict';

  jQuery.widget('Midgard.midgardStorage', jQuery.Midgard.midgardStorageBase, {
    options: {
      // Whether to use localstorage
      localStorage: false,
      removeLocalstorageOnIgnore: true,
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
      // CSS selector for the Edit button, leave to null to not bind
      // notifications to any element
      editSelector: '#midgardcreate-edit a',
      localize: function (id, language) {
        return window.midgardCreate.localize(id, language);
      },
      language: null
    },

    _create: function () {
      if (window.localStorage) {
        this.options.localStorage = true;
      }
      // Call super, this will invoke _bindEditables.
      jQuery.Midgard.midgardStorageBase.prototype._create.call(this);

      var widget = this;
      var eventPrefix = 'midgardstorage';
      // Bind savedentity event to update/remove localStorage.
      this.element.bind(eventPrefix + 'savedentity' , function(event,options) {
        widget._removeLocal(options.entity);
      });

      // Show notification on save.
      this.element.bind(eventPrefix + 'saved', function(event,options) {
        var notification_msg;
        if (options.totalSaved > 1) {
          notification_msg = _.template(widget.options.localize('saveSuccessMultiple', widget.options.language), {
            number: options.totalSaved
          });
        } else {
          notification_msg = _.template(widget.options.localize('saveSuccess', widget.options.language), {
            label: options.changedModels[0].getSubjectUri()
          });
        }
        jQuery('body').midgardNotifications('create', {
          body: notification_msg
        });
      });

      // Show notifications on error.
      this.element.bind(eventPrefix + 'error', function(event,options) {
        var notification_msg = _.template(widget.options.localize('saveError', widget.options.language), {
          error: options.error.responseText || ''
        });
        jQuery('body').midgardNotifications('create', {
          body: notification_msg,
          timeout: 0
        });
      });
    },

    _bindEditables: function () {
      // Call super.
      jQuery.Midgard.midgardStorageBase.prototype._bindEditables.call(this);

      var widget = this;
      this.restorables = [];
      var restorer;

      widget.element.bind(widget.options.editableNs + 'changed', function (event, options) {
        widget._saveLocal(options.instance);
      });

      widget.element.bind(widget.options.editableNs + 'enable', function (event, options) {
        // Duplicates code in midgardStorageBase but we can't guarantee order of execution.
        if (!options.instance._originalAttributes) {
          options.instance._originalAttributes = _.clone(options.instance.attributes);
        }

        if (!options.instance.isNew() && widget._checkLocal(options.instance)) {
          // We have locally-stored modifications, user needs to be asked
          widget.restorables.push(options.instance);
        }

        /*_.each(options.instance.attributes, function (attributeValue, property) {
          if (attributeValue instanceof widget.vie.Collection) {
            widget._readLocalReferences(options.instance, property, attributeValue);
          }
        });*/
      });

      widget.element.bind('midgardcreatestatechange', function (event, options) {
        if (options.state === 'browse' || widget.restorables.length === 0) {
          widget.restorables = [];
          if (restorer) {
            restorer.close();
          }
          return;
        }
        restorer = widget.checkRestore();
      });

      widget.element.bind('midgardstorageloaded', function (event, options) {
        if (_.indexOf(widget.changedModels, options.instance) === -1) {
          widget.changedModels.push(options.instance);
        }
      });


    },

    checkRestore: function () {
      var widget = this;
      if (widget.restorables.length === 0) {
        return;
      }

      var message;
      var restorer;
      if (widget.restorables.length === 1) {
        message = _.template(widget.options.localize('localModification', widget.options.language), {
          label: widget.restorables[0].getSubjectUri()
        });
      } else {
        message = _.template(widget.options.localize('localModifications', widget.options.language), {
          number: widget.restorables.length
        });
      }

      var doRestore = function (event, notification) {
        widget.restoreLocalAll();
        restorer.close();
      };

      var doIgnore = function (event, notification) {
        widget.ignoreLocal();
        restorer.close();
      };

      restorer = jQuery('body').midgardNotifications('create', {
        bindTo: widget.options.editSelector,
        gravity: 'TR',
        body: message,
        timeout: 0,
        actions: [
          {
            name: 'restore',
            label: widget.options.localize('Restore', widget.options.language),
            cb: doRestore,
            className: 'create-ui-btn'
          },
          {
            name: 'ignore',
            label: widget.options.localize('Ignore', widget.options.language),
            cb: doIgnore,
            className: 'create-ui-btn'
          }
        ],
        callbacks: {
          beforeShow: function () {
            if (!window.Mousetrap) {
              return;
            }
            window.Mousetrap.bind(['command+shift+r', 'ctrl+shift+r'], function (event) {
              event.preventDefault();
              doRestore();
            });
            window.Mousetrap.bind(['command+shift+i', 'ctrl+shift+i'], function (event) {
              event.preventDefault();
              doIgnore();
            });
          },
          afterClose: function () {
            if (!window.Mousetrap) {
              return;
            }
            window.Mousetrap.unbind(['command+shift+r', 'ctrl+shift+r']);
            window.Mousetrap.unbind(['command+shift+i', 'ctrl+shift+i']);
          }
        }
      });
      return restorer;
    },

    restoreLocalAll: function () {
      _.each(this.restorables, function (instance) {
        this.readLocal(instance);
      }, this);
      this.restorables = [];
    },

    ignoreLocal: function () {
      if (this.options.removeLocalstorageOnIgnore) {
        _.each(this.restorables, function (instance) {
          this._removeLocal(instance);
        }, this);
      }
      this.restorables = [];
    },

    _saveLocal: function (model) {
      if (!this.options.localStorage) {
        return;
      }

      if (model.isNew()) {
        // Anonymous object, save as refs instead
        if (!model.primaryCollection) {
          return;
        }
        return this._saveLocalReferences(model.primaryCollection.subject, model.primaryCollection.predicate, model);
      }
      window.localStorage.setItem(model.getSubjectUri(), JSON.stringify(model.toJSONLD()));
    },

    _getReferenceId: function (model, property) {
      return model.id + ':' + property;
    },

    _saveLocalReferences: function (subject, predicate, model) {
      if (!this.options.localStorage) {
        return;
      }

      if (!subject || !predicate) {
        return;
      }

      var widget = this;
      var identifier = subject + ':' + predicate;
      var json = model.toJSONLD();
      if (window.localStorage.getItem(identifier)) {
        var referenceList = JSON.parse(window.localStorage.getItem(identifier));
        var index = _.pluck(referenceList, '@').indexOf(json['@']);
        if (index !== -1) {
          referenceList[index] = json;
        } else {
          referenceList.push(json);
        }
        window.localStorage.setItem(identifier, JSON.stringify(referenceList));
        return;
      }
      window.localStorage.setItem(identifier, JSON.stringify([json]));
    },

    _checkLocal: function (model) {
      if (!this.options.localStorage) {
        return false;
      }

      var local = window.localStorage.getItem(model.getSubjectUri());
      if (!local) {
        return false;
      }

      return true;
    },

    hasLocal: function (model) {
      if (!this.options.localStorage) {
        return false;
      }

      if (!window.localStorage.getItem(model.getSubjectUri())) {
        return false;
      }
      return true;
    },

    readLocal: function (model) {
      if (!this.options.localStorage) {
        return;
      }

      var local = window.localStorage.getItem(model.getSubjectUri());
      if (!local) {
        return;
      }
      if (!model._originalAttributes) {
        model._originalAttributes = _.clone(model.attributes);
      }
      var parsed = JSON.parse(local);
      var entity = this.vie.entities.addOrUpdate(parsed, {
        overrideAttributes: true
      });

      this._trigger('loaded', null, {
        instance: entity
      });
    },

    _readLocalReferences: function (model, property, collection) {
      if (!this.options.localStorage) {
        return;
      }

      var identifier = this._getReferenceId(model, property);
      var local = window.localStorage.getItem(identifier);
      if (!local) {
        return;
      }
      collection.add(JSON.parse(local));
    },

    revertChanges: function (model) {
      var widget = this;

      // Remove unsaved collection members
      if (!model) { return; }
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
    },

    _removeLocal: function (model) {
      if (!this.options.localStorage) {
        return;
      }

      window.localStorage.removeItem(model.getSubjectUri());
    }
  });
})(jQuery);
