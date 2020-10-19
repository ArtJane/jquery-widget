/*!
 * jQuery Widget Plugin v1.0.0
 * https://github.com/ArtJane/jquery-widget
 *
 * Author: Art Jane
 * Released under the MIT license
 */

(function (factory) {
    if (typeof define === "function" && define.amd) {

        // AMD. Register as an anonymous module.
        define(["jquery"], factory);
    } else {

        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    var widgetUuid = 0;
    var widgetSlice = Array.prototype.slice;

    $.cleanData = (function (orig) {
        return function (elems) {
            var events, elem, i;
            for (i = 0; (elem = elems[i]) != null; i++) {
                try {

                    // Only trigger remove when necessary to save time
                    events = $._data(elem, "events");
                    if (events && events.remove) {
                        $(elem).triggerHandler("remove");
                    }

                    // Http://bugs.jquery.com/ticket/8235
                } catch (e) {
                }
            }
            orig(elems);
        };
    })($.cleanData);

    $.widget = function (name, base, prototype) {
        var existingConstructor, constructor, basePrototype;

        // ProxiedPrototype allows the provided prototype to remain unmodified
        // so that it can be used as a mixin for multiple widgets (#8876)
        var proxiedPrototype = {};

        var namespace = name.split(".")[0];
        name = name.split(".")[1];
        var fullName = namespace + "-" + name;

        if (!prototype) {
            prototype = base;
            base = $.Widget;
        }

        if ($.isArray(prototype)) {
            prototype = $.extend.apply(null, [{}].concat(prototype));
        }

        // Create selector for plugin
        $.expr[":"][fullName.toLowerCase()] = function (elem) {
            return !!$.data(elem, fullName);
        };

        $[namespace] = $[namespace] || {};
        existingConstructor = $[namespace][name];
        constructor = $[namespace][name] = function (options, element) {

            // Allow instantiation without "new" keyword
            if (!this._createWidget) {
                return new constructor(options, element);
            }

            // Allow instantiation without initializing for simple inheritance
            // must use "new" keyword (the code above always passes args)
            if (arguments.length) {
                this._createWidget(options, element);
            }
        };

        // Extend with the existing constructor to carry over any static properties
        $.extend(constructor, existingConstructor, {
            version: prototype.version,

            // Copy the object used to create the prototype in case we need to
            // redefine the widget later
            _proto: $.extend({}, prototype),

            // Track widgets that inherit from this widget in case this widget is
            // redefined after a widget inherits from it
            _childConstructors: [],
            _parentConstructor: base
        });

        basePrototype = new base();

        // We need to make the options hash a property directly on the new instance
        // otherwise we'll modify the options hash on the prototype that we're
        // inheriting from
        basePrototype.options = $.widget.extend({}, basePrototype.options);
        $.each(prototype, function (prop, value) {
            if (!$.isFunction(value)) {
                proxiedPrototype[prop] = value;
                return;
            }
            proxiedPrototype[prop] = (function () {
                function _super() {
                    return base.prototype[prop].apply(this, arguments);
                }

                function _superApply(args) {
                    return base.prototype[prop].apply(this, args);
                }

                return function () {
                    var __super = this._super;
                    var __superApply = this._superApply;
                    var returnValue;

                    this._super = _super;
                    this._superApply = _superApply;

                    returnValue = value.apply(this, arguments);

                    this._super = __super;
                    this._superApply = __superApply;

                    return returnValue;
                };
            })();
        });
        constructor.prototype = $.widget.extend(basePrototype, {

            // TODO: remove support for widgetEventPrefix
            // always use the name + a colon as the prefix, e.g., draggable:start
            // don't prefix for widgets that aren't DOM-based
            widgetEventPrefix: existingConstructor ? (basePrototype.widgetEventPrefix || name) : name
        }, proxiedPrototype, {
            constructor: constructor,
            namespace: namespace,
            widgetName: name,
            widgetFullName: fullName
        });

        // If this widget is being redefined then we need to find all widgets that
        // are inheriting from it and redefine all of them so that they inherit from
        // the new version of this widget. We're essentially trying to replace one
        // level in the prototype chain.
        if (existingConstructor) {
            $.each(existingConstructor._childConstructors, function (i, child) {
                var childPrototype = child.prototype;

                // Redefine the child widget using the same prototype that was
                // originally used, but inherit from the new version of the base
                $.widget(childPrototype.namespace + "." + childPrototype.widgetName, constructor,
                    child._proto);
            });

            // Remove the list of existing child constructors from the old constructor
            // so the old child constructors can be garbage collected
            delete existingConstructor._childConstructors;
        } else {
            base._childConstructors.push(constructor);
        }

        $.widget.bridge(name, constructor);

        return constructor;
    };

    $.widget.extend = function (target) {
        var input = widgetSlice.call(arguments, 1);
        var inputIndex = 0;
        var inputLength = input.length;
        var key;
        var value;

        for (; inputIndex < inputLength; inputIndex++) {
            for (key in input[inputIndex]) {
                value = input[inputIndex][key];
                if (input[inputIndex].hasOwnProperty(key) && value !== undefined) {

                    // Clone objects
                    if ($.isPlainObject(value)) {
                        target[key] = $.isPlainObject(target[key]) ?
                            $.widget.extend({}, target[key], value) :

                            // Don't extend strings, arrays, etc. with objects
                            $.widget.extend({}, value);

                        // Copy everything else by reference
                    } else {
                        target[key] = value;
                    }
                }
            }
        }
        return target;
    };

    $.widget.bridge = function (name, object) {
        var fullName = object.prototype.widgetFullName || name;
        $.fn[name] = function (options) {
            var isMethodCall = typeof options === "string";
            var args = widgetSlice.call(arguments, 1);
            var returnValue = this;

            if (isMethodCall) {

                // If this is an empty collection, we need to have the instance method
                // return undefined instead of the jQuery instance
                if (!this.length && options === "instance") {
                    returnValue = undefined;
                } else {
                    this.each(function () {
                        var methodValue;
                        var instance = $.data(this, fullName);

                        if (options === "instance") {
                            returnValue = instance;
                            return false;
                        }

                        if (!instance) {
                            return $.error("cannot call methods on " + name +
                                " prior to initialization; " +
                                "attempted to call method '" + options + "'");
                        }

                        if (!$.isFunction(instance[options]) || options.charAt(0) === "_") {
                            return $.error("no such method '" + options + "' for " + name +
                                " widget instance");
                        }

                        methodValue = instance[options].apply(instance, args);

                        if (methodValue !== instance && methodValue !== undefined) {
                            returnValue = methodValue && methodValue.jquery ?
                                returnValue.pushStack(methodValue.get()) :
                                methodValue;
                            return false;
                        }
                    });
                }
            } else {

                // Allow multiple hashes to be passed on init
                if (args.length) {
                    options = $.widget.extend.apply(null, [options].concat(args));
                }

                this.each(function () {
                    var instance = $.data(this, fullName);
                    if (instance) {
                        instance.option(options || {});
                        if (instance._init) {
                            instance._init();
                        }
                    } else {
                        $.data(this, fullName, new object(options, this));
                    }
                });
            }

            return returnValue;
        };
    };

    $.Widget = function ( /* options, element */) {};
    $.Widget._childConstructors = [];

    $.Widget.prototype = {
        widgetName: "widget",
        widgetEventPrefix: "",
        defaultElement: "<div>",

        options: {
            classes: {},
            disabled: false,

            // Callbacks
            create: null
        },

        _createWidget: function (options, element) {
            element = $(element || this.defaultElement || this)[0];
            this.element = $(element);
            this.uuid = widgetUuid++;
            this.eventNamespace = "." + this.widgetName + this.uuid;

            this.bindings = $();
            this.hoverable = $();
            this.focusable = $();
            this.classesElementLookup = {};

            if (element !== this) {
                $.data(element, this.widgetFullName, this);
                this._on(true, this.element, {
                    remove: function (event) {
                        if (event.target === element) {
                            this.destroy();
                        }
                    }
                });
                this.document = $(element.style ?

                    // Element within the document
                    element.ownerDocument :

                    // Element is window or document
                    element.document || element);
                this.window = $(this.document[0].defaultView || this.document[0].parentWindow);
            }

            this.options = $.widget.extend({},
                this.options,
                this._getCreateOptions(),
                options);

            this._beforeCreate();

            this._create();

            if (this.options.disabled) {
                this._setOptionDisabled(this.options.disabled);
            }

            this._trigger("create", null, this._getCreateEventData());
            this._init();
        },

        _getCreateOptions: function () {
            return {};
        },

        _getCreateEventData: $.noop,

        _beforeCreate: $.noop,

        _create: $.noop,

        _init: $.noop,

        destroy: function () {
            var that = this;

            this._destroy();
            $.each(this.classesElementLookup, function (key, value) {
                that._removeClass(value, key);
            });

            // We can probably remove the unbind calls in 2.0
            // all event bindings should go through this._on()
            this.element
                .off(this.eventNamespace)
                .removeData(this.widgetFullName);
            this.widget()
                .off(this.eventNamespace)
                .removeAttr("aria-disabled");

            // Clean up events and states
            this.bindings.off(this.eventNamespace);
        },

        _destroy: $.noop,

        widget: function () {
            return this.element;
        },

        option: function (key, value) {
            var options = key;
            var parts;
            var curOption;
            var i;

            if (arguments.length === 0) {

                // Don't return a reference to the internal hash
                return $.widget.extend({}, this.options);
            }

            if (typeof key === "string") {

                // Handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
                options = {};
                parts = key.split(".");
                key = parts.shift();
                if (parts.length) {
                    curOption = options[key] = $.widget.extend({}, this.options[key]);
                    for (i = 0; i < parts.length - 1; i++) {
                        curOption[parts[i]] = curOption[parts[i]] || {};
                        curOption = curOption[parts[i]];
                    }
                    key = parts.pop();
                    if (arguments.length === 1) {
                        return curOption[key] === undefined ? null : curOption[key];
                    }
                    curOption[key] = value;
                } else {
                    if (arguments.length === 1) {
                        return this.options[key] === undefined ? null : this.options[key];
                    }
                    options[key] = value;
                }
            }

            this._setOptions(options);

            return this;
        },

        _setOptions: function (options) {
            var key;

            for (key in options) {
                this._setOption(key, options[key]);
            }

            return this;
        },

        _setOption: function (key, value) {
            if (key === "classes") {
                this._setOptionClasses(value);
            }

            this.options[key] = value;

            if (key === "disabled") {
                this._setOptionDisabled(value);
            }

            return this;
        },

        _setOptionClasses: function (value) {
            var classKey, elements, currentElements;

            for (classKey in value) {
                currentElements = this.classesElementLookup[classKey];
                if (value[classKey] === this.options.classes[classKey] ||
                    !currentElements ||
                    !currentElements.length) {
                    continue;
                }

                // We are doing this to create a new jQuery object because the _removeClass() call
                // on the next line is going to destroy the reference to the current elements being
                // tracked. We need to save a copy of this collection so that we can add the new classes
                // below.
                elements = $(currentElements.get());
                this._removeClass(currentElements, classKey);

                // We don't use _addClass() here, because that uses this.options.classes
                // for generating the string of classes. We want to use the value passed in from
                // _setOption(), this is the new value of the classes option which was passed to
                // _setOption(). We pass this value directly to _classes().
                elements.addClass(this._classes({
                    element: elements,
                    keys: classKey,
                    classes: value,
                    add: true
                }));
            }
        },

        _setOptionDisabled: function (value) {
            this._toggleClass(this.widget(), this.widgetFullName + "-disabled", null, !!value);

            // If the widget is becoming disabled, then nothing is interactive
            if (value) {
                this._removeClass(this.hoverable, null, "ui-state-hover");
                this._removeClass(this.focusable, null, "ui-state-focus");
            }
        },

        enable: function () {
            return this._setOptions({disabled: false});
        },

        disable: function () {
            return this._setOptions({disabled: true});
        },

        _classes: function (options) {
            var full = [];
            var that = this;

            options = $.extend({
                element: this.element,
                classes: this.options.classes || {}
            }, options);

            function processClassString(classes, checkOption) {
                var current, i;
                for (i = 0; i < classes.length; i++) {
                    current = that.classesElementLookup[classes[i]] || $();
                    if (options.add) {
                        current = $($.unique(current.get().concat(options.element.get())));
                    } else {
                        current = $(current.not(options.element).get());
                    }
                    that.classesElementLookup[classes[i]] = current;
                    full.push(classes[i]);
                    if (checkOption && options.classes[classes[i]]) {
                        full.push(options.classes[classes[i]]);
                    }
                }
            }

            this._on(options.element, {
                "remove": "_untrackClassesElement"
            });

            if (options.keys) {
                processClassString(options.keys.match(/\S+/g) || [], true);
            }
            if (options.extra) {
                processClassString(options.extra.match(/\S+/g) || []);
            }

            return full.join(" ");
        },

        _untrackClassesElement: function (event) {
            var that = this;
            $.each(that.classesElementLookup, function (key, value) {
                if ($.inArray(event.target, value) !== -1) {
                    that.classesElementLookup[key] = $(value.not(event.target).get());
                }
            });
        },

        _removeClass: function (element, keys, extra) {
            return this._toggleClass(element, keys, extra, false);
        },

        _addClass: function (element, keys, extra) {
            return this._toggleClass(element, keys, extra, true);
        },

        _toggleClass: function (element, keys, extra, add) {
            add = (typeof add === "boolean") ? add : extra;
            var shift = (typeof element === "string" || element === null),
                options = {
                    extra: shift ? keys : extra,
                    keys: shift ? element : keys,
                    element: shift ? this.element : element,
                    add: add
                };
            options.element.toggleClass(this._classes(options), add);
            return this;
        },

        _on: function (suppressDisabledCheck, element, handlers) {
            var delegateElement;
            var instance = this;

            // No suppressDisabledCheck flag, shuffle arguments
            if (typeof suppressDisabledCheck !== "boolean") {
                handlers = element;
                element = suppressDisabledCheck;
                suppressDisabledCheck = false;
            }

            // No element argument, shuffle and use this.element
            if (!handlers) {
                handlers = element;
                element = this.element;
                delegateElement = this.widget();
            } else {
                element = delegateElement = $(element);
                this.bindings = this.bindings.add(element);
            }

            $.each(handlers, function (event, handler) {
                function handlerProxy() {

                    // Allow widgets to customize the disabled handling
                    // - disabled as an array instead of boolean
                    // - disabled class as method for disabling individual parts
                    if (!suppressDisabledCheck &&
                        (instance.options.disabled === true ||
                            $(this).hasClass("ui-state-disabled"))) {
                        return;
                    }
                    return (typeof handler === "string" ? instance[handler] : handler)
                        .apply(instance, arguments);
                }

                // Copy the guid so direct unbinding works
                if (typeof handler !== "string") {
                    handlerProxy.guid = handler.guid =
                        handler.guid || handlerProxy.guid || $.guid++;
                }

                var match = event.match(/^([\w:-]*)\s*(.*)$/);
                var eventName = match[1] + instance.eventNamespace;
                var selector = match[2];

                if (selector) {
                    delegateElement.on(eventName, selector, handlerProxy);
                } else {
                    element.on(eventName, handlerProxy);
                }
            });
        },

        _off: function (element, eventName) {
            eventName = (eventName || "").split(" ").join(this.eventNamespace + " ") +
                this.eventNamespace;
            element.off(eventName).off(eventName);

            // Clear the stack to avoid memory leaks (#10056)
            this.bindings = $(this.bindings.not(element).get());
            this.focusable = $(this.focusable.not(element).get());
            this.hoverable = $(this.hoverable.not(element).get());
        },

        _delay: function (handler, delay) {
            function handlerProxy() {
                return (typeof handler === "string" ? instance[handler] : handler)
                    .apply(instance, arguments);
            }

            var instance = this;
            return setTimeout(handlerProxy, delay || 0);
        },

        _hoverable: function (element) {
            this.hoverable = this.hoverable.add(element);
            this._on(element, {
                mouseenter: function (event) {
                    this._addClass($(event.currentTarget), null, "ui-state-hover");
                },
                mouseleave: function (event) {
                    this._removeClass($(event.currentTarget), null, "ui-state-hover");
                }
            });
        },

        _focusable: function (element) {
            this.focusable = this.focusable.add(element);
            this._on(element, {
                focusin: function (event) {
                    this._addClass($(event.currentTarget), null, "ui-state-focus");
                },
                focusout: function (event) {
                    this._removeClass($(event.currentTarget), null, "ui-state-focus");
                }
            });
        },

        _trigger: function (type, event, data) {
            var prop, orig;
            var callback = this.options[type];

            data = data || {};
            event = $.Event(event);
            event.type = (type === this.widgetEventPrefix ?
                type :
                this.widgetEventPrefix + type).toLowerCase();

            // The original event may come from any element
            // so we need to reset the target on the new event
            event.target = this.element[0];

            // Copy original event properties over to the new event
            orig = event.originalEvent;
            if (orig) {
                for (prop in orig) {
                    if (!(prop in event)) {
                        event[prop] = orig[prop];
                    }
                }
            }

            this.element.trigger(event, data);
            return !($.isFunction(callback) &&
                callback.apply(this.element[0], [event].concat(data)) === false ||
                event.isDefaultPrevented());
        }
    };

    $.each({show: "fadeIn", hide: "fadeOut"}, function (method, defaultEffect) {
        $.Widget.prototype["_" + method] = function (element, options, callback) {
            if (typeof options === "string") {
                options = {effect: options};
            }

            var hasOptions;
            var effectName = !options ?
                method :
                options === true || typeof options === "number" ?
                    defaultEffect :
                    options.effect || defaultEffect;

            options = options || {};
            if (typeof options === "number") {
                options = {duration: options};
            }

            hasOptions = !$.isEmptyObject(options);
            options.complete = callback;

            if (options.delay) {
                element.delay(options.delay);
            }

            if (hasOptions && $.effects && $.effects.effect[effectName]) {
                element[method](options);
            } else if (effectName !== method && element[effectName]) {
                element[effectName](options.duration, options.easing, callback);
            } else {
                element.queue(function (next) {
                    $(this)[method]();
                    if (callback) {
                        callback.call(element[0]);
                    }
                    next();
                });
            }
        };
    });


    // Template

    $.expr[":"]["tmplkey"] = function(elem) {
        return !!$(elem).data("tmplkey");
    };

    var Template = function(){
        this.compiles = {};
        this.items = {};
    };

    Template.prototype = {

        constructor: Template,

        uid: 0,

        compile: function(namespace, templates){
            var key;
            this.compiles[namespace] = this.compiles[namespace] || {};
            templates = templates || {};
            for(key in templates){
                this.compiles[namespace][key] = this._compile(templates[key]);
            }
        },

        _compile: function(template){
            var that = this;
            template = this._trimHtml(template);
            return new Function(
                "$item",
                `var $template=this,$widget=$item.widget,$options=$widget.options,$parent=$item.parent,$data=$item.data,$index=$item.index,$=$item.jQuery,__=[];with($data){__.push('${
                    template
                        .replace(/'/g, "\"")
                        .replace(/\{\{html(.+?)\}\}/g, function(all, value){
                            return `');if(${that._notnull(value)}){__.push(${value});}__.push('`;
                        })
                        .replace(/\{\{if(.*?)\}\}/g, function(all, value){
                            return `');if(${that._boolean(value)}){__.push('`;
                        })
                        .replace(/\{\{else(.*?)\}\}/g, function(all, value){
                            return `');}else if(${that._boolean(value)}){__.push('`;
                        })
                        .replace(/\{\{\/if\}\}/g, function(all){
                            return `');}__.push('`;
                        })
                        .replace(/\{\{each(?:\s*\((.+?)\))?(.+?)\}\}/g, function(all, tagArgs, value){
                            return `');if(${that._object(value)}){$.each(${value},function(${tagArgs ? tagArgs : "$index,$value"}){with(arguments[1]){__.push('`;
                        })
                        .replace(/\{\{\/each\}\}/g, function(all){
                            return `');}});}__.push('`;
                        })
                        .replace(/\{\{tmpl(?:\s*\((.+?)\))?(.+?)\}\}/g, function(all, tagArgs, value){
                            return `');if(${that._notnull(value)}){__=__.concat($template.tmpl($item.namespace,${value},${tagArgs ? tagArgs : "$data"},$item,$widget));}__.push('`;
                        })
                        .replace(/\$\{(.+?)\}/g, "{{$1}}")
                        .replace(/\{\{=(.+?)\}\}/g, "{{$1}}")
                        .replace(/\{\{(.+?)\}\}/g, function (all, value) {
                            return `');if(${that._notnull(value)}){__.push($template.encode(${value}));}__.push('`;
                        })
                }');}return __;`
            );
        },

        tmpl: function(namespace, name, data, parent, widget){
            var compile = this.compiles[namespace][name];
            var result = [];
            var i;

            if(!compile && !(compile = this._searchUpCompile(namespace, name))){
                return parent ? "" : $();
            }

            data = data || parent.data;

            if($.isArray(data)){
                for(i = 0; i < data.length; i++){
                    if(data[i]){
                        result.push(this._tmpl(namespace, name, compile, data[i], i, parent, widget));
                    }
                }
            }else{
                result.push(this._tmpl(namespace, name, compile, data, 0, parent, widget));
            }

            result = result.join("");
            return parent ? result : this.parseHTML(result);
        },

        _searchUpCompile: function(namespace, name){
            var prototype, compile;
            var ns = namespace.split("-");
            var constor = $[ns[0]][ns[1]];
            if(!constor){
                return;
            }
            prototype = constor["_parentConstructor"]["prototype"];
            if(!(namespace = prototype["widgetFullName"])){
                return;
            }
            if(!this.compiles[namespace]){
                this.compile(namespace, prototype.templates);
            }
            if(!(compile = this.compiles[namespace][name])){
                compile = this._searchUpCompile(namespace, name);
            }
            return compile;
        },

        parseHTML: function(html){
            var $elem = $($.parseHTML(html));
            setTimeout(function(){
                del($elem);
            });
            return $elem;

            function del($elem){
                $elem.each(function(i, item){
                    item = $(item);
                    item.data("tmplkey");
                    item.removeAttr("data-tmplkey");
                    del(item.find("[data-tmplkey]"));
                });
            }
        },

        each: function(target, callback){
            var i, leng;
            target = typeof target !== "object" ? [target] : target;
            leng = target.length;
            if(leng){
                for(i = 0; i < leng; i++){
                    callback(i, target[i]);
                }
            }else{
                for(i in target){
                    callback(i, target[i]);
                }
            }
        },

        encode: function(value){
            return String(value).split("<").join("&#60;").split(">").join("&#62;").split("\"").join("&#34;").split("'").join("&#39;");
        },

        _notnull: function(value){
            return `$data&&(${value})!=null`;
        },

        _boolean: function(value){
            if(value){
                return  `$data&&(${value})`;
            }else{
                return "true";
            }
        },

        _object: function(value){
            return `${this._notnull(value)}&&typeof(${value})==="object"`;
        },

        _tmpl: function(namespace, name, compile, data, index, parent, widget){
            var item = {
                namespace: namespace,
                name: name,
                compile: compile,
                data: data,
                index: index,
                key: this.uid++,
                children: {},
                parent: parent,
                widget: widget,
                jQuery: $
            };

            item.update = $.proxy(this.update, this, item);
            item.html = item.compile.call(this, item).join("");
            item.html = this._parseHtml(item.html, item);

            this.items[namespace] = this.items[namespace] || {};
            this.items[namespace][item.key] = item;

            if(parent){
                parent.children[item.key] = item;
            }

            return parent ? `#tmpl${item.key}` : item.html;
        },

        _trimHtml: function (html){
            return html
                .replace(/\n/g, "")
                .replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "")
                .replace(/>[\s\uFEFF\xA0]+/g, ">")
                .replace(/[\s\uFEFF\xA0]+</g, "<");
        },

        _parseHtml: function(html, item){
            var level = 0;
            var tmplkey;
            return html
                .replace(/<(\/)?(\w+)(.*?)(\/)>/g, function(all, prevSlash, tag, props, nextSlash){
                    if(prevSlash){
                        level--;
                        return `</${tag}>`;
                    }else if(tag){
                        if(level === 0){
                            tmplkey = `data-tmplkey="${item.key}"`;
                            props = props ? `${tmplkey}${props}` : `${tmplkey}`;
                        }
                        level++;
                        if(nextSlash || /^(input|img|br|hr|link|meta|param)$/.test(tag)){
                            level--;
                        }
                        return `<${tag} ${props}>`;
                    }
                })
                .replace(/#tmpl(\d+)/g, function(all, key){
                    return item.children[key].html;
                });
        },

        update: function(item){
            var that = this;
            var inserted = false;

            item.html = item.compile.call(this, item).join("");
            item.html = this._parseHtml(item.html, item);

            $(`:${item.namespace.toLowerCase()}`)
                .find(":tmplkey")
                .each(function(i, elem){
                    elem = $(elem);
                    if(elem.data("tmplkey") === item.key){
                        if(!inserted){
                            that.parseHTML(item.html).insertBefore(elem);
                            inserted = true;
                        }
                        elem.remove();
                    }
                });
        },

        tmplItem: function(namespace, elem){
            var key = $(elem).closest(":tmplkey").data("tmplkey");
            return this.items[namespace][key];
        }
    };

    $.template = new Template();

    $.extend($.Widget.prototype, {

        templates: {},

        _beforeCreate: function(){
            $.template.compile(this.widgetFullName, this.templates);
        },

        _tmpl: function(name, data){
            return $.template.tmpl(this.widgetFullName, name, data, null, this);
        },

        _tmplItem: function(elem){
            return $.template.tmplItem(this.widgetFullName, elem);
        }
    });

}));