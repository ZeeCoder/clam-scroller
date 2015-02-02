(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var cutil = require('clam/core/util');
var clam_container = require('clam/core/container');
var $ = (typeof window !== "undefined" ? window.$ : typeof global !== "undefined" ? global.$ : null);
var scroller = require('scroller');

clam_container.expose();

cutil.createPrototypes(scroller);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"clam/core/container":2,"clam/core/util":4,"scroller":5}],2:[function(require,module,exports){
(function (global){
'use strict';
var $ = (typeof window !== "undefined" ? window.$ : typeof global !== "undefined" ? global.$ : null);

module.exports = {
    modules: {},

    add: function(clam_module) {
        var moduleName;
        if ($.isArray(clam_module)) {
            moduleName = clam_module[0].module.name;
        } else {
            moduleName = clam_module.module.name;
        }

        if (typeof this.modules[moduleName] !== 'undefined') {
            if ($.isArray(this.modules[moduleName]) && $.isArray(clam_module)) {
                $.merge(this.modules[moduleName], clam_module);
            } else {
                throw 'The "' + moduleName + '" key is already set in the container. Adding the module to the container failed.';
            }
        } else {
            this.modules[moduleName] = clam_module;
        }
    },

    get: function(moduleName) {
        if (typeof this.modules[moduleName] === 'undefined') {
            throw 'Nothing is set under the "' + moduleName + '" key in the container.';
        }

        return this.modules[moduleName];
    },

    expose: function() {
        window.container = this;
        console.warn('The clam container is now exposed as "container".');
    }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
(function (global){
'use strict';
var cutil = require('./util');
var $ = (typeof window !== "undefined" ? window.$ : typeof global !== "undefined" ? global.$ : null);

// Constructor
// ===========
function Module($object, settings, conf) {
    var moduleName = cutil.getModuleName(this);
    var className = cutil.getModuleClass(moduleName);

    var depth = 1;
    if (typeof settings.hasGlobalHooks === 'undefined') {
        settings.hasGlobalHooks = false;
    }
    // Converting possible thruthy values to true
    settings.hasGlobalHooks = !!settings.hasGlobalHooks;

    if (settings.type !== 'singleton') {
        settings.type = 'basic';

        depth = $object.parents('.' + className).length + 1;
    } else {
        // Check whether the module can be a singleton or not
        var classElementCount = $('.' + className).length;
        if (classElementCount > 1) {
            throw 'The module' + ' [' + moduleName + '] ' + 'could not be instantiated as a singleton. ' + classElementCount + ' DOM elements were found with the "' + className + '" class instead of just one.';
        }
    }

    this.module = {
        $object: $object,
        name: moduleName,
        class: className,
        conf: {},
        events: {},
        hooks: {},
        type: settings.type,
        depth: depth,
        hasGlobalHooks: settings.hasGlobalHooks
    };

    try {
        cutil.validateJQueryObject($object, 1);
    } catch (e) {
        console.error(e);
    }

    // Checking if the jQuery object has the needed jsm class
    if (!$object.hasClass(this.module.class)) {
        console.error('The given jQuery Object does not have this module\'s class.');
    }

    // Setting up default configuration
    if (settings.conf !== null) {
        $.extend(true, this.module.conf, settings.conf);
    }

    // Merging in data- configuration
    $.extend(true, this.module.conf, this.getDataConfiguration());

    // Merging in passed configuration
    if (typeof conf === 'object') {
        $.extend(true, this.module.conf, conf);
    }
};

// API
//====
Module.prototype.addHookEvent = function(hookName, eventType, addPrePostEvents) {
    var self = this;
    var $hook = this.getHooks(hookName);
    if ($hook.length === 0) {
        return false;
    }

    var eventName = hookName.split('-');
    eventName.push(eventType);
    var eventNameLength = eventName.length;
    for (var i = eventNameLength - 1; i >= 0; i--) {
        eventName[i] = cutil.ucfirst(eventName[i]);
    };
    var eventName = eventName.join('');

    $hook.each(function() {
        $(this).on(eventType, function(e) {
            if (addPrePostEvents) {
                self.triggerEvent('pre' + eventName, [e, $(this)]);
            }
            self['on' + eventName].apply(self, [e, $(this)]);
            if (addPrePostEvents) {
                self.triggerEvent('post' + eventName, [e, $(this)]);
            }
        });
    });
};

Module.prototype.addEventListener = function(eventName, callback) {
    this.module.events[eventName] = callback;
};

Module.prototype.getModuleName = function() {
    return cutil.getModuleName(this);
};

Module.prototype.triggerEvent = function(eventName, args) {
    if (typeof this.module.events[eventName] !== 'function') {
        return false;
    }

    this.module.events[eventName].apply(this, args);
};

Module.prototype.prettify = function(message, subject) {
    return '[' + this.module.name + (subject ? ': ' + subject: '') + '] ' + message;
};

/**
 * Gets a single - or no - hook jQuery object from the module context.
 * The found hook will be saved, using the hookName as a key. This way, only one
 * search occurs for any given hookName in the DOM tree.  
 * Finding more than one hook will result in an exception. (An empty result is
 * allowed by default.)
 * @param string hookName The searched hook name.
 * @param boolean emptyResultNotAllowed If set to true, then not finding a hook
 * will also throw an exception.
 * @return jQuery Object (Clam Hook)
 */
Module.prototype.getHook = function(hookName, emptyResultNotAllowed) {
    return this.getHooks(hookName, 1, emptyResultNotAllowed);
};

/**
 * Gets any number of jQuery object - including none - from the module context.
 * The found hook will be saved, using the hookName as a key. This way, only one
 * search occurs for any given hookName in the DOM tree.
 * @param string hookName The searched hook name.
 * @param int expectedHookNum (optional) Defines exactly how many hook objects
 * must be returned in the jQuery collection. If given, but the found hooks
 * count does not equal that number, then an exception will be thrown. 
 * @param boolean emptyResultNotAllowed If set to true, then not finding hooks
 * will also throw an exception.
 * @return jQuery Object (Clam Hook)
 */
Module.prototype.getHooks = function(hookName, expectedHookNum, emptyResultNotAllowed) {
    if (typeof this.module.hooks[hookName] === 'undefined') {
        this.module.hooks[hookName] = this.findHooks(hookName, expectedHookNum, emptyResultNotAllowed);
    }

    return this.module.hooks[hookName];
};

/**
 * Gets a single - or no - hook jQuery object from the module context using
 * jQuery selectors. Useful when hooks can be added dinamically to the module.
 * Finding more than one hook will result in an exception. (An empty result is
 * allowed by default.)
 * @param string hookName The searched hook name.
 * @param boolean emptyResultNotAllowed If set to true, then not finding a hook
 * will also throw an exception.
 * @return jQuery Object (Clam Hook)
 */
Module.prototype.findHook = function(hookName, emptyResultNotAllowed) {
    return this.findHooks(hookName, 1, emptyResultNotAllowed);
};


/**
 * Gets any number of jQuery object - including none - from the module context
 * using jQuery selectors. Useful when hooks can be added dinamically to the
 * module.
 * @param string hookName The searched hook name.
 * @param int expectedHookNum (optional) Defines exactly how many hook objects
 * must be returned in the jQuery collection. If given, but the found hooks
 * count does not equal that number, then an exception will be thrown. 
 * @return jQuery Object (Clam Hook)
 */
Module.prototype.findHooks = function(hookName, expectedHookNum, emptyResultNotAllowed) {
    var self = this;
    var hookClassName = this.getHookClassName(hookName);
    var $hooks;
    var $inContextHooks;

    if (this.module.type == 'singleton') {
        if (this.module.hasGlobalHooks) {
            $hooks = $('.' + hookClassName);
        } else {
            $hooks = this.module.$object.find('.' + hookClassName);

            // Adding the main module element if it has the hook class
            if (this.module.$object.hasClass(hookClassName)) {
                $hooks = $hooks.add(this.module.$object);
            }
        }
    } else {
        // Getting all hooks in the module, excluding other instances of the
        // same module inside the current one.

        // Creating a "depthClass" to exclude the same types of modules inside
        // the actual one when searching for a hook.
        var depthClass = [];
        for (var i = this.module.depth; i >= 0; i--) {
            depthClass.push('.' + this.module.class);
        }
        depthClass = depthClass.join(' ');

        $hooks =
            this.module.$object
            .find('.' + hookClassName)
            // Excluding all hooks inside other module instances
            .not(depthClass + ' .' + hookClassName)
            // Excluding all other modules that has the hook class
            .not(depthClass + '.' + hookClassName);

        // Adding every hook outside of the module instances.
        if (this.module.hasGlobalHooks) {
            var $globalHooks =
                $('.' + hookClassName)
                // Excluding hooks from within modules
                .not('.' + this.module.class + ' .' + hookClassName)
                .not('.' + this.module.class + '.' + hookClassName);
                    
            if ($globalHooks.length) {
                $hooks = $hooks.add($globalHooks);
            }
        }

        // Adding the main module element if it has the hook class
        if (this.module.$object.hasClass(hookClassName)) {
            $hooks = $hooks.add(this.module.$object);
        }
    }

    if (
        typeof expectedHookNum === 'number' &&
        expectedHookNum != $hooks.length
    ) {
        if (
            $hooks.length !== 0 ||
            emptyResultNotAllowed
        ) {
            console.error($hooks);
            throw 'An incorrect number of hooks were found. Expected: ' + expectedHookNum + '. Found: ' + $hooks.length + '. Hook name: "' + hookClassName + '"';
        }
    }

    return $hooks;
};

Module.prototype.getHookClassName = function(hookName) {
    return this.module.class + '__' + hookName;
};

Module.prototype.getDataConfiguration = function() {
    var dataConf = this.module.$object.data(cutil.getModuleClass(this.module.name));
    if (typeof dataConf === 'undefined') {
        dataConf = {};
    }

    if (typeof dataConf !== 'object') {
        console.error('The data-* attribute\'s content was not a valid JSON. Fetched value: ' + dataConf);
    }

    return dataConf;
};

Module.prototype.getHookConfiguration = function($hook) {
    return $hook.data(this.module.class);
};

Module.prototype.expose = function(containerName) {
    if (typeof containerName === 'undefined') {
        containerName = 'exposed_modules';
    }
    
    if (typeof window[containerName] === 'undefined') {
        window[containerName] = {};
    }

    var moduleName = this.module.name.replace(/\-/g, '_');

    if (this.module.type == 'singleton') {
        window[containerName][moduleName] = this;

        console.warn('Exposed as: "' + containerName + '.' + moduleName + '".');
    } else {
        if (typeof window[containerName][moduleName] === 'undefined') {
            window[containerName][moduleName] = [];
        }

        var moduleCount = window[containerName][moduleName].length;

        window[containerName][moduleName].push(this);

        console.warn('Exposed as: "' + containerName + '.' + moduleName + '[' + moduleCount + ']".');
    }
};

// Export module
//==============
module.exports = Module;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./util":4}],4:[function(require,module,exports){
(function (global){
'use strict';
var $ = (typeof window !== "undefined" ? window.$ : typeof global !== "undefined" ? global.$ : null);
var container = require('./container');

module.exports = {
    moduleConf: {
        prefix: 'jsm'
    },

    modifierConf: {
        prefix: {
            name: '--',
            value: '_'
        }
    },

    // Creates module instances for every DOM element that has the appropriate
    // module class. If the $containerObj jQuery object is given - containing
    // one element -, then the function will look for the module classes in that
    // container.
    createPrototypes: function(module, config, $containerObj) {
        // Getting the module name, to select the DOM elements.
        var moduleName = this.getModuleName(module);
        var moduleClass = this.getModuleClass(moduleName);

        if (
            typeof config === 'undefined' ||
            !config // falsy values
        ) {
            config = {};
        }

        // Get appropriate module DOM objects
        var $modules = null;
        if (typeof $containerObj !== 'undefined') {
            this.validateJQueryObject($containerObj);
            $modules = $containerObj.find('.' + moduleClass);
            if ($containerObj.hasClass(moduleClass)) {
                $modules = $modules.add($containerObj);
            }
        } else {
            $modules = $('.' + moduleClass);
        }

        // Create module instances
        var instances = [];
        if ($modules.length > 0) {
            $modules.each(function() {
                instances.push(new module($(this), config));
            });
        }

        if (instances.length > 0) {
            if (instances.length == 1 && instances[0].module.type == 'singleton') {
                instances = instances[0];
            }

            container.add(instances);

            return instances;
        }

        return null;
    },

    // Get's a modul's name from it's definition, or from a prototype
    getModuleName: function(module) {
        var funcDef = typeof module === 'function' ? String(module) : String(module.constructor);
        var funcName = funcDef.substr('function '.length);
        funcName = funcName.substr(0, funcName.indexOf('('));

        return funcName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    },

    // Checks whether the given collection is a valid jQuery object or not.
    // If the collectionSize (integer) parameter is specified, then the
    // collection's size will be validated accordingly.
    validateJQueryObject: function($collection, collectionSize) {
        if (
            typeof collectionSize !== 'undefined' &&
            typeof collectionSize !== 'number'
        ) {
            throw 'The given "collectionSize" parameter for the jQuery collection validation was not a number. Passed value: ' + collectionSize + ', type: ' + (typeof collectionSize) + '.';
        }
        
        if ($collection instanceof jQuery === false) {
            throw 'This is not a jQuery Object. Passed type: ' + (typeof $collection);
        }

        if (
            typeof collectionSize !== 'undefined' &&
            $collection.length != collectionSize
        ) {
            throw 'The given jQuery collection contains an unexpected number of elements. Expected: ' + collectionSize + ', given: ' + $collection.length + '.';
        }
    },

    ucfirst: function(string) {
        return string.charAt(0).toUpperCase() + string.substr(1);
    },

    getModuleClass: function(name) {
        return this.moduleConf.prefix + '-' + name;
    },

    getModifierClass: function(baseName, modifierName, value) {
        if (typeof value !== 'string') {
            value = '';
        } else {
            value = this.modifierConf.prefix.value + value;
        }

        return baseName + this.modifierConf.prefix.name + modifierName + value;
    },

    getClassesByPrefix: function(prefix, $jQObj) {
        var classes = $jQObj.attr('class');
        if (!classes) { // if "falsy", for ex: undefined or empty string
            return [];
        }

        classes = classes.split(' ');
        var matches = [];
        for (var i = 0; i < classes.length; i++) {
            var match = new RegExp('^(' + prefix + ')(.*)').exec(classes[i]);
            if (match != null) {
                matches.push(match[0]);
            }
        }

        return matches;
    },

    removeClassesByPrefix: function(prefix, $jQObj) {
        var matches = this.getClassesByPrefix(prefix, $jQObj);
        matches = matches.join(' ');
        $jQObj.removeClass(matches);
    }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./container":2}],5:[function(require,module,exports){
(function (global){
var clam_module = require('clam/core/module');
var inherits = require('util').inherits;
var $ = (typeof window !== "undefined" ? window.$ : typeof global !== "undefined" ? global.$ : null);

var settings = {
    // type: 'singleton',
    conf: {
        scrollSpeed: 300
    }
};

function Scroller($jQObj, conf) {
    clam_module.apply(this, [$jQObj, settings, conf]);
    // var self = this;
    // this.expose();

    $scrollerHook = this.getHook('scroll');
    $scrollerHook.on('click', $.proxy(this.onScrollClick, this, $scrollerHook));
}

inherits(Scroller, clam_module);

Scroller.prototype.onScrollClick = function($hook, e) {
    e.preventDefault();
    var hookConf = this.getHookConfiguration($hook);
    if (typeof hookConf.offset === 'undefined') {
        hookConf.offset = 0;
    }

    var $scrollToElement = $('#' + hookConf.targetID);
    if ($scrollToElement.length == 0) {
        return;
    }

    $('html, body').animate({
        scrollTop: $scrollToElement.offset().top + hookConf.offset
    }, this.module.conf.scrollSpeed);
};

module.exports = Scroller;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"clam/core/module":3,"util":9}],6:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],8:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],9:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":8,"_process":7,"inherits":6}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJmcm9udF9zcmMvc2NyaXB0cy9hcHAuanMiLCJmcm9udF9zcmMvYm93ZXJfY29tcG9uZW50cy9jbGFtL2NvcmUvY29udGFpbmVyLmpzIiwiZnJvbnRfc3JjL2Jvd2VyX2NvbXBvbmVudHMvY2xhbS9jb3JlL21vZHVsZS5qcyIsImZyb250X3NyYy9ib3dlcl9jb21wb25lbnRzL2NsYW0vY29yZS91dGlsLmpzIiwibW9kdWxlL3Njcm9sbGVyLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzVTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGN1dGlsID0gcmVxdWlyZSgnY2xhbS9jb3JlL3V0aWwnKTtcbnZhciBjbGFtX2NvbnRhaW5lciA9IHJlcXVpcmUoJ2NsYW0vY29yZS9jb250YWluZXInKTtcbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuJCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuJCA6IG51bGwpO1xudmFyIHNjcm9sbGVyID0gcmVxdWlyZSgnc2Nyb2xsZXInKTtcblxuY2xhbV9jb250YWluZXIuZXhwb3NlKCk7XG5cbmN1dGlsLmNyZWF0ZVByb3RvdHlwZXMoc2Nyb2xsZXIpO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy4kIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC4kIDogbnVsbCk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIG1vZHVsZXM6IHt9LFxuXG4gICAgYWRkOiBmdW5jdGlvbihjbGFtX21vZHVsZSkge1xuICAgICAgICB2YXIgbW9kdWxlTmFtZTtcbiAgICAgICAgaWYgKCQuaXNBcnJheShjbGFtX21vZHVsZSkpIHtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgPSBjbGFtX21vZHVsZVswXS5tb2R1bGUubmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgPSBjbGFtX21vZHVsZS5tb2R1bGUubmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5tb2R1bGVzW21vZHVsZU5hbWVdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgaWYgKCQuaXNBcnJheSh0aGlzLm1vZHVsZXNbbW9kdWxlTmFtZV0pICYmICQuaXNBcnJheShjbGFtX21vZHVsZSkpIHtcbiAgICAgICAgICAgICAgICAkLm1lcmdlKHRoaXMubW9kdWxlc1ttb2R1bGVOYW1lXSwgY2xhbV9tb2R1bGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyAnVGhlIFwiJyArIG1vZHVsZU5hbWUgKyAnXCIga2V5IGlzIGFscmVhZHkgc2V0IGluIHRoZSBjb250YWluZXIuIEFkZGluZyB0aGUgbW9kdWxlIHRvIHRoZSBjb250YWluZXIgZmFpbGVkLic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm1vZHVsZXNbbW9kdWxlTmFtZV0gPSBjbGFtX21vZHVsZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXQ6IGZ1bmN0aW9uKG1vZHVsZU5hbWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm1vZHVsZXNbbW9kdWxlTmFtZV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyAnTm90aGluZyBpcyBzZXQgdW5kZXIgdGhlIFwiJyArIG1vZHVsZU5hbWUgKyAnXCIga2V5IGluIHRoZSBjb250YWluZXIuJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLm1vZHVsZXNbbW9kdWxlTmFtZV07XG4gICAgfSxcblxuICAgIGV4cG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5jb250YWluZXIgPSB0aGlzO1xuICAgICAgICBjb25zb2xlLndhcm4oJ1RoZSBjbGFtIGNvbnRhaW5lciBpcyBub3cgZXhwb3NlZCBhcyBcImNvbnRhaW5lclwiLicpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgY3V0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuJCA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuJCA6IG51bGwpO1xuXG4vLyBDb25zdHJ1Y3RvclxuLy8gPT09PT09PT09PT1cbmZ1bmN0aW9uIE1vZHVsZSgkb2JqZWN0LCBzZXR0aW5ncywgY29uZikge1xuICAgIHZhciBtb2R1bGVOYW1lID0gY3V0aWwuZ2V0TW9kdWxlTmFtZSh0aGlzKTtcbiAgICB2YXIgY2xhc3NOYW1lID0gY3V0aWwuZ2V0TW9kdWxlQ2xhc3MobW9kdWxlTmFtZSk7XG5cbiAgICB2YXIgZGVwdGggPSAxO1xuICAgIGlmICh0eXBlb2Ygc2V0dGluZ3MuaGFzR2xvYmFsSG9va3MgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHNldHRpbmdzLmhhc0dsb2JhbEhvb2tzID0gZmFsc2U7XG4gICAgfVxuICAgIC8vIENvbnZlcnRpbmcgcG9zc2libGUgdGhydXRoeSB2YWx1ZXMgdG8gdHJ1ZVxuICAgIHNldHRpbmdzLmhhc0dsb2JhbEhvb2tzID0gISFzZXR0aW5ncy5oYXNHbG9iYWxIb29rcztcblxuICAgIGlmIChzZXR0aW5ncy50eXBlICE9PSAnc2luZ2xldG9uJykge1xuICAgICAgICBzZXR0aW5ncy50eXBlID0gJ2Jhc2ljJztcblxuICAgICAgICBkZXB0aCA9ICRvYmplY3QucGFyZW50cygnLicgKyBjbGFzc05hbWUpLmxlbmd0aCArIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgbW9kdWxlIGNhbiBiZSBhIHNpbmdsZXRvbiBvciBub3RcbiAgICAgICAgdmFyIGNsYXNzRWxlbWVudENvdW50ID0gJCgnLicgKyBjbGFzc05hbWUpLmxlbmd0aDtcbiAgICAgICAgaWYgKGNsYXNzRWxlbWVudENvdW50ID4gMSkge1xuICAgICAgICAgICAgdGhyb3cgJ1RoZSBtb2R1bGUnICsgJyBbJyArIG1vZHVsZU5hbWUgKyAnXSAnICsgJ2NvdWxkIG5vdCBiZSBpbnN0YW50aWF0ZWQgYXMgYSBzaW5nbGV0b24uICcgKyBjbGFzc0VsZW1lbnRDb3VudCArICcgRE9NIGVsZW1lbnRzIHdlcmUgZm91bmQgd2l0aCB0aGUgXCInICsgY2xhc3NOYW1lICsgJ1wiIGNsYXNzIGluc3RlYWQgb2YganVzdCBvbmUuJztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMubW9kdWxlID0ge1xuICAgICAgICAkb2JqZWN0OiAkb2JqZWN0LFxuICAgICAgICBuYW1lOiBtb2R1bGVOYW1lLFxuICAgICAgICBjbGFzczogY2xhc3NOYW1lLFxuICAgICAgICBjb25mOiB7fSxcbiAgICAgICAgZXZlbnRzOiB7fSxcbiAgICAgICAgaG9va3M6IHt9LFxuICAgICAgICB0eXBlOiBzZXR0aW5ncy50eXBlLFxuICAgICAgICBkZXB0aDogZGVwdGgsXG4gICAgICAgIGhhc0dsb2JhbEhvb2tzOiBzZXR0aW5ncy5oYXNHbG9iYWxIb29rc1xuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgICBjdXRpbC52YWxpZGF0ZUpRdWVyeU9iamVjdCgkb2JqZWN0LCAxKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2tpbmcgaWYgdGhlIGpRdWVyeSBvYmplY3QgaGFzIHRoZSBuZWVkZWQganNtIGNsYXNzXG4gICAgaWYgKCEkb2JqZWN0Lmhhc0NsYXNzKHRoaXMubW9kdWxlLmNsYXNzKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdUaGUgZ2l2ZW4galF1ZXJ5IE9iamVjdCBkb2VzIG5vdCBoYXZlIHRoaXMgbW9kdWxlXFwncyBjbGFzcy4nKTtcbiAgICB9XG5cbiAgICAvLyBTZXR0aW5nIHVwIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgIGlmIChzZXR0aW5ncy5jb25mICE9PSBudWxsKSB7XG4gICAgICAgICQuZXh0ZW5kKHRydWUsIHRoaXMubW9kdWxlLmNvbmYsIHNldHRpbmdzLmNvbmYpO1xuICAgIH1cblxuICAgIC8vIE1lcmdpbmcgaW4gZGF0YS0gY29uZmlndXJhdGlvblxuICAgICQuZXh0ZW5kKHRydWUsIHRoaXMubW9kdWxlLmNvbmYsIHRoaXMuZ2V0RGF0YUNvbmZpZ3VyYXRpb24oKSk7XG5cbiAgICAvLyBNZXJnaW5nIGluIHBhc3NlZCBjb25maWd1cmF0aW9uXG4gICAgaWYgKHR5cGVvZiBjb25mID09PSAnb2JqZWN0Jykge1xuICAgICAgICAkLmV4dGVuZCh0cnVlLCB0aGlzLm1vZHVsZS5jb25mLCBjb25mKTtcbiAgICB9XG59O1xuXG4vLyBBUElcbi8vPT09PVxuTW9kdWxlLnByb3RvdHlwZS5hZGRIb29rRXZlbnQgPSBmdW5jdGlvbihob29rTmFtZSwgZXZlbnRUeXBlLCBhZGRQcmVQb3N0RXZlbnRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciAkaG9vayA9IHRoaXMuZ2V0SG9va3MoaG9va05hbWUpO1xuICAgIGlmICgkaG9vay5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBldmVudE5hbWUgPSBob29rTmFtZS5zcGxpdCgnLScpO1xuICAgIGV2ZW50TmFtZS5wdXNoKGV2ZW50VHlwZSk7XG4gICAgdmFyIGV2ZW50TmFtZUxlbmd0aCA9IGV2ZW50TmFtZS5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IGV2ZW50TmFtZUxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGV2ZW50TmFtZVtpXSA9IGN1dGlsLnVjZmlyc3QoZXZlbnROYW1lW2ldKTtcbiAgICB9O1xuICAgIHZhciBldmVudE5hbWUgPSBldmVudE5hbWUuam9pbignJyk7XG5cbiAgICAkaG9vay5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAkKHRoaXMpLm9uKGV2ZW50VHlwZSwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKGFkZFByZVBvc3RFdmVudHMpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnRyaWdnZXJFdmVudCgncHJlJyArIGV2ZW50TmFtZSwgW2UsICQodGhpcyldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlbGZbJ29uJyArIGV2ZW50TmFtZV0uYXBwbHkoc2VsZiwgW2UsICQodGhpcyldKTtcbiAgICAgICAgICAgIGlmIChhZGRQcmVQb3N0RXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgc2VsZi50cmlnZ2VyRXZlbnQoJ3Bvc3QnICsgZXZlbnROYW1lLCBbZSwgJCh0aGlzKV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbk1vZHVsZS5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgY2FsbGJhY2spIHtcbiAgICB0aGlzLm1vZHVsZS5ldmVudHNbZXZlbnROYW1lXSA9IGNhbGxiYWNrO1xufTtcblxuTW9kdWxlLnByb3RvdHlwZS5nZXRNb2R1bGVOYW1lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGN1dGlsLmdldE1vZHVsZU5hbWUodGhpcyk7XG59O1xuXG5Nb2R1bGUucHJvdG90eXBlLnRyaWdnZXJFdmVudCA9IGZ1bmN0aW9uKGV2ZW50TmFtZSwgYXJncykge1xuICAgIGlmICh0eXBlb2YgdGhpcy5tb2R1bGUuZXZlbnRzW2V2ZW50TmFtZV0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMubW9kdWxlLmV2ZW50c1tldmVudE5hbWVdLmFwcGx5KHRoaXMsIGFyZ3MpO1xufTtcblxuTW9kdWxlLnByb3RvdHlwZS5wcmV0dGlmeSA9IGZ1bmN0aW9uKG1lc3NhZ2UsIHN1YmplY3QpIHtcbiAgICByZXR1cm4gJ1snICsgdGhpcy5tb2R1bGUubmFtZSArIChzdWJqZWN0ID8gJzogJyArIHN1YmplY3Q6ICcnKSArICddICcgKyBtZXNzYWdlO1xufTtcblxuLyoqXG4gKiBHZXRzIGEgc2luZ2xlIC0gb3Igbm8gLSBob29rIGpRdWVyeSBvYmplY3QgZnJvbSB0aGUgbW9kdWxlIGNvbnRleHQuXG4gKiBUaGUgZm91bmQgaG9vayB3aWxsIGJlIHNhdmVkLCB1c2luZyB0aGUgaG9va05hbWUgYXMgYSBrZXkuIFRoaXMgd2F5LCBvbmx5IG9uZVxuICogc2VhcmNoIG9jY3VycyBmb3IgYW55IGdpdmVuIGhvb2tOYW1lIGluIHRoZSBET00gdHJlZS4gIFxuICogRmluZGluZyBtb3JlIHRoYW4gb25lIGhvb2sgd2lsbCByZXN1bHQgaW4gYW4gZXhjZXB0aW9uLiAoQW4gZW1wdHkgcmVzdWx0IGlzXG4gKiBhbGxvd2VkIGJ5IGRlZmF1bHQuKVxuICogQHBhcmFtIHN0cmluZyBob29rTmFtZSBUaGUgc2VhcmNoZWQgaG9vayBuYW1lLlxuICogQHBhcmFtIGJvb2xlYW4gZW1wdHlSZXN1bHROb3RBbGxvd2VkIElmIHNldCB0byB0cnVlLCB0aGVuIG5vdCBmaW5kaW5nIGEgaG9va1xuICogd2lsbCBhbHNvIHRocm93IGFuIGV4Y2VwdGlvbi5cbiAqIEByZXR1cm4galF1ZXJ5IE9iamVjdCAoQ2xhbSBIb29rKVxuICovXG5Nb2R1bGUucHJvdG90eXBlLmdldEhvb2sgPSBmdW5jdGlvbihob29rTmFtZSwgZW1wdHlSZXN1bHROb3RBbGxvd2VkKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0SG9va3MoaG9va05hbWUsIDEsIGVtcHR5UmVzdWx0Tm90QWxsb3dlZCk7XG59O1xuXG4vKipcbiAqIEdldHMgYW55IG51bWJlciBvZiBqUXVlcnkgb2JqZWN0IC0gaW5jbHVkaW5nIG5vbmUgLSBmcm9tIHRoZSBtb2R1bGUgY29udGV4dC5cbiAqIFRoZSBmb3VuZCBob29rIHdpbGwgYmUgc2F2ZWQsIHVzaW5nIHRoZSBob29rTmFtZSBhcyBhIGtleS4gVGhpcyB3YXksIG9ubHkgb25lXG4gKiBzZWFyY2ggb2NjdXJzIGZvciBhbnkgZ2l2ZW4gaG9va05hbWUgaW4gdGhlIERPTSB0cmVlLlxuICogQHBhcmFtIHN0cmluZyBob29rTmFtZSBUaGUgc2VhcmNoZWQgaG9vayBuYW1lLlxuICogQHBhcmFtIGludCBleHBlY3RlZEhvb2tOdW0gKG9wdGlvbmFsKSBEZWZpbmVzIGV4YWN0bHkgaG93IG1hbnkgaG9vayBvYmplY3RzXG4gKiBtdXN0IGJlIHJldHVybmVkIGluIHRoZSBqUXVlcnkgY29sbGVjdGlvbi4gSWYgZ2l2ZW4sIGJ1dCB0aGUgZm91bmQgaG9va3NcbiAqIGNvdW50IGRvZXMgbm90IGVxdWFsIHRoYXQgbnVtYmVyLCB0aGVuIGFuIGV4Y2VwdGlvbiB3aWxsIGJlIHRocm93bi4gXG4gKiBAcGFyYW0gYm9vbGVhbiBlbXB0eVJlc3VsdE5vdEFsbG93ZWQgSWYgc2V0IHRvIHRydWUsIHRoZW4gbm90IGZpbmRpbmcgaG9va3NcbiAqIHdpbGwgYWxzbyB0aHJvdyBhbiBleGNlcHRpb24uXG4gKiBAcmV0dXJuIGpRdWVyeSBPYmplY3QgKENsYW0gSG9vaylcbiAqL1xuTW9kdWxlLnByb3RvdHlwZS5nZXRIb29rcyA9IGZ1bmN0aW9uKGhvb2tOYW1lLCBleHBlY3RlZEhvb2tOdW0sIGVtcHR5UmVzdWx0Tm90QWxsb3dlZCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5tb2R1bGUuaG9va3NbaG9va05hbWVdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLm1vZHVsZS5ob29rc1tob29rTmFtZV0gPSB0aGlzLmZpbmRIb29rcyhob29rTmFtZSwgZXhwZWN0ZWRIb29rTnVtLCBlbXB0eVJlc3VsdE5vdEFsbG93ZWQpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1vZHVsZS5ob29rc1tob29rTmFtZV07XG59O1xuXG4vKipcbiAqIEdldHMgYSBzaW5nbGUgLSBvciBubyAtIGhvb2sgalF1ZXJ5IG9iamVjdCBmcm9tIHRoZSBtb2R1bGUgY29udGV4dCB1c2luZ1xuICogalF1ZXJ5IHNlbGVjdG9ycy4gVXNlZnVsIHdoZW4gaG9va3MgY2FuIGJlIGFkZGVkIGRpbmFtaWNhbGx5IHRvIHRoZSBtb2R1bGUuXG4gKiBGaW5kaW5nIG1vcmUgdGhhbiBvbmUgaG9vayB3aWxsIHJlc3VsdCBpbiBhbiBleGNlcHRpb24uIChBbiBlbXB0eSByZXN1bHQgaXNcbiAqIGFsbG93ZWQgYnkgZGVmYXVsdC4pXG4gKiBAcGFyYW0gc3RyaW5nIGhvb2tOYW1lIFRoZSBzZWFyY2hlZCBob29rIG5hbWUuXG4gKiBAcGFyYW0gYm9vbGVhbiBlbXB0eVJlc3VsdE5vdEFsbG93ZWQgSWYgc2V0IHRvIHRydWUsIHRoZW4gbm90IGZpbmRpbmcgYSBob29rXG4gKiB3aWxsIGFsc28gdGhyb3cgYW4gZXhjZXB0aW9uLlxuICogQHJldHVybiBqUXVlcnkgT2JqZWN0IChDbGFtIEhvb2spXG4gKi9cbk1vZHVsZS5wcm90b3R5cGUuZmluZEhvb2sgPSBmdW5jdGlvbihob29rTmFtZSwgZW1wdHlSZXN1bHROb3RBbGxvd2VkKSB7XG4gICAgcmV0dXJuIHRoaXMuZmluZEhvb2tzKGhvb2tOYW1lLCAxLCBlbXB0eVJlc3VsdE5vdEFsbG93ZWQpO1xufTtcblxuXG4vKipcbiAqIEdldHMgYW55IG51bWJlciBvZiBqUXVlcnkgb2JqZWN0IC0gaW5jbHVkaW5nIG5vbmUgLSBmcm9tIHRoZSBtb2R1bGUgY29udGV4dFxuICogdXNpbmcgalF1ZXJ5IHNlbGVjdG9ycy4gVXNlZnVsIHdoZW4gaG9va3MgY2FuIGJlIGFkZGVkIGRpbmFtaWNhbGx5IHRvIHRoZVxuICogbW9kdWxlLlxuICogQHBhcmFtIHN0cmluZyBob29rTmFtZSBUaGUgc2VhcmNoZWQgaG9vayBuYW1lLlxuICogQHBhcmFtIGludCBleHBlY3RlZEhvb2tOdW0gKG9wdGlvbmFsKSBEZWZpbmVzIGV4YWN0bHkgaG93IG1hbnkgaG9vayBvYmplY3RzXG4gKiBtdXN0IGJlIHJldHVybmVkIGluIHRoZSBqUXVlcnkgY29sbGVjdGlvbi4gSWYgZ2l2ZW4sIGJ1dCB0aGUgZm91bmQgaG9va3NcbiAqIGNvdW50IGRvZXMgbm90IGVxdWFsIHRoYXQgbnVtYmVyLCB0aGVuIGFuIGV4Y2VwdGlvbiB3aWxsIGJlIHRocm93bi4gXG4gKiBAcmV0dXJuIGpRdWVyeSBPYmplY3QgKENsYW0gSG9vaylcbiAqL1xuTW9kdWxlLnByb3RvdHlwZS5maW5kSG9va3MgPSBmdW5jdGlvbihob29rTmFtZSwgZXhwZWN0ZWRIb29rTnVtLCBlbXB0eVJlc3VsdE5vdEFsbG93ZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGhvb2tDbGFzc05hbWUgPSB0aGlzLmdldEhvb2tDbGFzc05hbWUoaG9va05hbWUpO1xuICAgIHZhciAkaG9va3M7XG4gICAgdmFyICRpbkNvbnRleHRIb29rcztcblxuICAgIGlmICh0aGlzLm1vZHVsZS50eXBlID09ICdzaW5nbGV0b24nKSB7XG4gICAgICAgIGlmICh0aGlzLm1vZHVsZS5oYXNHbG9iYWxIb29rcykge1xuICAgICAgICAgICAgJGhvb2tzID0gJCgnLicgKyBob29rQ2xhc3NOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRob29rcyA9IHRoaXMubW9kdWxlLiRvYmplY3QuZmluZCgnLicgKyBob29rQ2xhc3NOYW1lKTtcblxuICAgICAgICAgICAgLy8gQWRkaW5nIHRoZSBtYWluIG1vZHVsZSBlbGVtZW50IGlmIGl0IGhhcyB0aGUgaG9vayBjbGFzc1xuICAgICAgICAgICAgaWYgKHRoaXMubW9kdWxlLiRvYmplY3QuaGFzQ2xhc3MoaG9va0NsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAkaG9va3MgPSAkaG9va3MuYWRkKHRoaXMubW9kdWxlLiRvYmplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gR2V0dGluZyBhbGwgaG9va3MgaW4gdGhlIG1vZHVsZSwgZXhjbHVkaW5nIG90aGVyIGluc3RhbmNlcyBvZiB0aGVcbiAgICAgICAgLy8gc2FtZSBtb2R1bGUgaW5zaWRlIHRoZSBjdXJyZW50IG9uZS5cblxuICAgICAgICAvLyBDcmVhdGluZyBhIFwiZGVwdGhDbGFzc1wiIHRvIGV4Y2x1ZGUgdGhlIHNhbWUgdHlwZXMgb2YgbW9kdWxlcyBpbnNpZGVcbiAgICAgICAgLy8gdGhlIGFjdHVhbCBvbmUgd2hlbiBzZWFyY2hpbmcgZm9yIGEgaG9vay5cbiAgICAgICAgdmFyIGRlcHRoQ2xhc3MgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IHRoaXMubW9kdWxlLmRlcHRoOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgZGVwdGhDbGFzcy5wdXNoKCcuJyArIHRoaXMubW9kdWxlLmNsYXNzKTtcbiAgICAgICAgfVxuICAgICAgICBkZXB0aENsYXNzID0gZGVwdGhDbGFzcy5qb2luKCcgJyk7XG5cbiAgICAgICAgJGhvb2tzID1cbiAgICAgICAgICAgIHRoaXMubW9kdWxlLiRvYmplY3RcbiAgICAgICAgICAgIC5maW5kKCcuJyArIGhvb2tDbGFzc05hbWUpXG4gICAgICAgICAgICAvLyBFeGNsdWRpbmcgYWxsIGhvb2tzIGluc2lkZSBvdGhlciBtb2R1bGUgaW5zdGFuY2VzXG4gICAgICAgICAgICAubm90KGRlcHRoQ2xhc3MgKyAnIC4nICsgaG9va0NsYXNzTmFtZSlcbiAgICAgICAgICAgIC8vIEV4Y2x1ZGluZyBhbGwgb3RoZXIgbW9kdWxlcyB0aGF0IGhhcyB0aGUgaG9vayBjbGFzc1xuICAgICAgICAgICAgLm5vdChkZXB0aENsYXNzICsgJy4nICsgaG9va0NsYXNzTmFtZSk7XG5cbiAgICAgICAgLy8gQWRkaW5nIGV2ZXJ5IGhvb2sgb3V0c2lkZSBvZiB0aGUgbW9kdWxlIGluc3RhbmNlcy5cbiAgICAgICAgaWYgKHRoaXMubW9kdWxlLmhhc0dsb2JhbEhvb2tzKSB7XG4gICAgICAgICAgICB2YXIgJGdsb2JhbEhvb2tzID1cbiAgICAgICAgICAgICAgICAkKCcuJyArIGhvb2tDbGFzc05hbWUpXG4gICAgICAgICAgICAgICAgLy8gRXhjbHVkaW5nIGhvb2tzIGZyb20gd2l0aGluIG1vZHVsZXNcbiAgICAgICAgICAgICAgICAubm90KCcuJyArIHRoaXMubW9kdWxlLmNsYXNzICsgJyAuJyArIGhvb2tDbGFzc05hbWUpXG4gICAgICAgICAgICAgICAgLm5vdCgnLicgKyB0aGlzLm1vZHVsZS5jbGFzcyArICcuJyArIGhvb2tDbGFzc05hbWUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkZ2xvYmFsSG9va3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGhvb2tzID0gJGhvb2tzLmFkZCgkZ2xvYmFsSG9va3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkaW5nIHRoZSBtYWluIG1vZHVsZSBlbGVtZW50IGlmIGl0IGhhcyB0aGUgaG9vayBjbGFzc1xuICAgICAgICBpZiAodGhpcy5tb2R1bGUuJG9iamVjdC5oYXNDbGFzcyhob29rQ2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgJGhvb2tzID0gJGhvb2tzLmFkZCh0aGlzLm1vZHVsZS4kb2JqZWN0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChcbiAgICAgICAgdHlwZW9mIGV4cGVjdGVkSG9va051bSA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgZXhwZWN0ZWRIb29rTnVtICE9ICRob29rcy5sZW5ndGhcbiAgICApIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgJGhvb2tzLmxlbmd0aCAhPT0gMCB8fFxuICAgICAgICAgICAgZW1wdHlSZXN1bHROb3RBbGxvd2VkXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcigkaG9va3MpO1xuICAgICAgICAgICAgdGhyb3cgJ0FuIGluY29ycmVjdCBudW1iZXIgb2YgaG9va3Mgd2VyZSBmb3VuZC4gRXhwZWN0ZWQ6ICcgKyBleHBlY3RlZEhvb2tOdW0gKyAnLiBGb3VuZDogJyArICRob29rcy5sZW5ndGggKyAnLiBIb29rIG5hbWU6IFwiJyArIGhvb2tDbGFzc05hbWUgKyAnXCInO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICRob29rcztcbn07XG5cbk1vZHVsZS5wcm90b3R5cGUuZ2V0SG9va0NsYXNzTmFtZSA9IGZ1bmN0aW9uKGhvb2tOYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubW9kdWxlLmNsYXNzICsgJ19fJyArIGhvb2tOYW1lO1xufTtcblxuTW9kdWxlLnByb3RvdHlwZS5nZXREYXRhQ29uZmlndXJhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBkYXRhQ29uZiA9IHRoaXMubW9kdWxlLiRvYmplY3QuZGF0YShjdXRpbC5nZXRNb2R1bGVDbGFzcyh0aGlzLm1vZHVsZS5uYW1lKSk7XG4gICAgaWYgKHR5cGVvZiBkYXRhQ29uZiA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZGF0YUNvbmYgPSB7fTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGRhdGFDb25mICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdUaGUgZGF0YS0qIGF0dHJpYnV0ZVxcJ3MgY29udGVudCB3YXMgbm90IGEgdmFsaWQgSlNPTi4gRmV0Y2hlZCB2YWx1ZTogJyArIGRhdGFDb25mKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YUNvbmY7XG59O1xuXG5Nb2R1bGUucHJvdG90eXBlLmdldEhvb2tDb25maWd1cmF0aW9uID0gZnVuY3Rpb24oJGhvb2spIHtcbiAgICByZXR1cm4gJGhvb2suZGF0YSh0aGlzLm1vZHVsZS5jbGFzcyk7XG59O1xuXG5Nb2R1bGUucHJvdG90eXBlLmV4cG9zZSA9IGZ1bmN0aW9uKGNvbnRhaW5lck5hbWUpIHtcbiAgICBpZiAodHlwZW9mIGNvbnRhaW5lck5hbWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGNvbnRhaW5lck5hbWUgPSAnZXhwb3NlZF9tb2R1bGVzJztcbiAgICB9XG4gICAgXG4gICAgaWYgKHR5cGVvZiB3aW5kb3dbY29udGFpbmVyTmFtZV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHdpbmRvd1tjb250YWluZXJOYW1lXSA9IHt9O1xuICAgIH1cblxuICAgIHZhciBtb2R1bGVOYW1lID0gdGhpcy5tb2R1bGUubmFtZS5yZXBsYWNlKC9cXC0vZywgJ18nKTtcblxuICAgIGlmICh0aGlzLm1vZHVsZS50eXBlID09ICdzaW5nbGV0b24nKSB7XG4gICAgICAgIHdpbmRvd1tjb250YWluZXJOYW1lXVttb2R1bGVOYW1lXSA9IHRoaXM7XG5cbiAgICAgICAgY29uc29sZS53YXJuKCdFeHBvc2VkIGFzOiBcIicgKyBjb250YWluZXJOYW1lICsgJy4nICsgbW9kdWxlTmFtZSArICdcIi4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvd1tjb250YWluZXJOYW1lXVttb2R1bGVOYW1lXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHdpbmRvd1tjb250YWluZXJOYW1lXVttb2R1bGVOYW1lXSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG1vZHVsZUNvdW50ID0gd2luZG93W2NvbnRhaW5lck5hbWVdW21vZHVsZU5hbWVdLmxlbmd0aDtcblxuICAgICAgICB3aW5kb3dbY29udGFpbmVyTmFtZV1bbW9kdWxlTmFtZV0ucHVzaCh0aGlzKTtcblxuICAgICAgICBjb25zb2xlLndhcm4oJ0V4cG9zZWQgYXM6IFwiJyArIGNvbnRhaW5lck5hbWUgKyAnLicgKyBtb2R1bGVOYW1lICsgJ1snICsgbW9kdWxlQ291bnQgKyAnXVwiLicpO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBtb2R1bGVcbi8vPT09PT09PT09PT09PT1cbm1vZHVsZS5leHBvcnRzID0gTW9kdWxlO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy4kIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC4kIDogbnVsbCk7XG52YXIgY29udGFpbmVyID0gcmVxdWlyZSgnLi9jb250YWluZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbW9kdWxlQ29uZjoge1xuICAgICAgICBwcmVmaXg6ICdqc20nXG4gICAgfSxcblxuICAgIG1vZGlmaWVyQ29uZjoge1xuICAgICAgICBwcmVmaXg6IHtcbiAgICAgICAgICAgIG5hbWU6ICctLScsXG4gICAgICAgICAgICB2YWx1ZTogJ18nXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gQ3JlYXRlcyBtb2R1bGUgaW5zdGFuY2VzIGZvciBldmVyeSBET00gZWxlbWVudCB0aGF0IGhhcyB0aGUgYXBwcm9wcmlhdGVcbiAgICAvLyBtb2R1bGUgY2xhc3MuIElmIHRoZSAkY29udGFpbmVyT2JqIGpRdWVyeSBvYmplY3QgaXMgZ2l2ZW4gLSBjb250YWluaW5nXG4gICAgLy8gb25lIGVsZW1lbnQgLSwgdGhlbiB0aGUgZnVuY3Rpb24gd2lsbCBsb29rIGZvciB0aGUgbW9kdWxlIGNsYXNzZXMgaW4gdGhhdFxuICAgIC8vIGNvbnRhaW5lci5cbiAgICBjcmVhdGVQcm90b3R5cGVzOiBmdW5jdGlvbihtb2R1bGUsIGNvbmZpZywgJGNvbnRhaW5lck9iaikge1xuICAgICAgICAvLyBHZXR0aW5nIHRoZSBtb2R1bGUgbmFtZSwgdG8gc2VsZWN0IHRoZSBET00gZWxlbWVudHMuXG4gICAgICAgIHZhciBtb2R1bGVOYW1lID0gdGhpcy5nZXRNb2R1bGVOYW1lKG1vZHVsZSk7XG4gICAgICAgIHZhciBtb2R1bGVDbGFzcyA9IHRoaXMuZ2V0TW9kdWxlQ2xhc3MobW9kdWxlTmFtZSk7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgdHlwZW9mIGNvbmZpZyA9PT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgICAgICFjb25maWcgLy8gZmFsc3kgdmFsdWVzXG4gICAgICAgICkge1xuICAgICAgICAgICAgY29uZmlnID0ge307XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgYXBwcm9wcmlhdGUgbW9kdWxlIERPTSBvYmplY3RzXG4gICAgICAgIHZhciAkbW9kdWxlcyA9IG51bGw7XG4gICAgICAgIGlmICh0eXBlb2YgJGNvbnRhaW5lck9iaiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGVKUXVlcnlPYmplY3QoJGNvbnRhaW5lck9iaik7XG4gICAgICAgICAgICAkbW9kdWxlcyA9ICRjb250YWluZXJPYmouZmluZCgnLicgKyBtb2R1bGVDbGFzcyk7XG4gICAgICAgICAgICBpZiAoJGNvbnRhaW5lck9iai5oYXNDbGFzcyhtb2R1bGVDbGFzcykpIHtcbiAgICAgICAgICAgICAgICAkbW9kdWxlcyA9ICRtb2R1bGVzLmFkZCgkY29udGFpbmVyT2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRtb2R1bGVzID0gJCgnLicgKyBtb2R1bGVDbGFzcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgbW9kdWxlIGluc3RhbmNlc1xuICAgICAgICB2YXIgaW5zdGFuY2VzID0gW107XG4gICAgICAgIGlmICgkbW9kdWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkbW9kdWxlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlcy5wdXNoKG5ldyBtb2R1bGUoJCh0aGlzKSwgY29uZmlnKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbnN0YW5jZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGluc3RhbmNlcy5sZW5ndGggPT0gMSAmJiBpbnN0YW5jZXNbMF0ubW9kdWxlLnR5cGUgPT0gJ3NpbmdsZXRvbicpIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZXMgPSBpbnN0YW5jZXNbMF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnRhaW5lci5hZGQoaW5zdGFuY2VzKTtcblxuICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICAvLyBHZXQncyBhIG1vZHVsJ3MgbmFtZSBmcm9tIGl0J3MgZGVmaW5pdGlvbiwgb3IgZnJvbSBhIHByb3RvdHlwZVxuICAgIGdldE1vZHVsZU5hbWU6IGZ1bmN0aW9uKG1vZHVsZSkge1xuICAgICAgICB2YXIgZnVuY0RlZiA9IHR5cGVvZiBtb2R1bGUgPT09ICdmdW5jdGlvbicgPyBTdHJpbmcobW9kdWxlKSA6IFN0cmluZyhtb2R1bGUuY29uc3RydWN0b3IpO1xuICAgICAgICB2YXIgZnVuY05hbWUgPSBmdW5jRGVmLnN1YnN0cignZnVuY3Rpb24gJy5sZW5ndGgpO1xuICAgICAgICBmdW5jTmFtZSA9IGZ1bmNOYW1lLnN1YnN0cigwLCBmdW5jTmFtZS5pbmRleE9mKCcoJykpO1xuXG4gICAgICAgIHJldHVybiBmdW5jTmFtZS5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS9nLCAnJDEtJDInKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG5cbiAgICAvLyBDaGVja3Mgd2hldGhlciB0aGUgZ2l2ZW4gY29sbGVjdGlvbiBpcyBhIHZhbGlkIGpRdWVyeSBvYmplY3Qgb3Igbm90LlxuICAgIC8vIElmIHRoZSBjb2xsZWN0aW9uU2l6ZSAoaW50ZWdlcikgcGFyYW1ldGVyIGlzIHNwZWNpZmllZCwgdGhlbiB0aGVcbiAgICAvLyBjb2xsZWN0aW9uJ3Mgc2l6ZSB3aWxsIGJlIHZhbGlkYXRlZCBhY2NvcmRpbmdseS5cbiAgICB2YWxpZGF0ZUpRdWVyeU9iamVjdDogZnVuY3Rpb24oJGNvbGxlY3Rpb24sIGNvbGxlY3Rpb25TaXplKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHR5cGVvZiBjb2xsZWN0aW9uU2l6ZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICAgIHR5cGVvZiBjb2xsZWN0aW9uU2l6ZSAhPT0gJ251bWJlcidcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyAnVGhlIGdpdmVuIFwiY29sbGVjdGlvblNpemVcIiBwYXJhbWV0ZXIgZm9yIHRoZSBqUXVlcnkgY29sbGVjdGlvbiB2YWxpZGF0aW9uIHdhcyBub3QgYSBudW1iZXIuIFBhc3NlZCB2YWx1ZTogJyArIGNvbGxlY3Rpb25TaXplICsgJywgdHlwZTogJyArICh0eXBlb2YgY29sbGVjdGlvblNpemUpICsgJy4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoJGNvbGxlY3Rpb24gaW5zdGFuY2VvZiBqUXVlcnkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aHJvdyAnVGhpcyBpcyBub3QgYSBqUXVlcnkgT2JqZWN0LiBQYXNzZWQgdHlwZTogJyArICh0eXBlb2YgJGNvbGxlY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgdHlwZW9mIGNvbGxlY3Rpb25TaXplICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgICAgJGNvbGxlY3Rpb24ubGVuZ3RoICE9IGNvbGxlY3Rpb25TaXplXG4gICAgICAgICkge1xuICAgICAgICAgICAgdGhyb3cgJ1RoZSBnaXZlbiBqUXVlcnkgY29sbGVjdGlvbiBjb250YWlucyBhbiB1bmV4cGVjdGVkIG51bWJlciBvZiBlbGVtZW50cy4gRXhwZWN0ZWQ6ICcgKyBjb2xsZWN0aW9uU2l6ZSArICcsIGdpdmVuOiAnICsgJGNvbGxlY3Rpb24ubGVuZ3RoICsgJy4nO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHVjZmlyc3Q6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgICByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnN1YnN0cigxKTtcbiAgICB9LFxuXG4gICAgZ2V0TW9kdWxlQ2xhc3M6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kdWxlQ29uZi5wcmVmaXggKyAnLScgKyBuYW1lO1xuICAgIH0sXG5cbiAgICBnZXRNb2RpZmllckNsYXNzOiBmdW5jdGlvbihiYXNlTmFtZSwgbW9kaWZpZXJOYW1lLCB2YWx1ZSkge1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5tb2RpZmllckNvbmYucHJlZml4LnZhbHVlICsgdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYmFzZU5hbWUgKyB0aGlzLm1vZGlmaWVyQ29uZi5wcmVmaXgubmFtZSArIG1vZGlmaWVyTmFtZSArIHZhbHVlO1xuICAgIH0sXG5cbiAgICBnZXRDbGFzc2VzQnlQcmVmaXg6IGZ1bmN0aW9uKHByZWZpeCwgJGpRT2JqKSB7XG4gICAgICAgIHZhciBjbGFzc2VzID0gJGpRT2JqLmF0dHIoJ2NsYXNzJyk7XG4gICAgICAgIGlmICghY2xhc3NlcykgeyAvLyBpZiBcImZhbHN5XCIsIGZvciBleDogdW5kZWZpbmVkIG9yIGVtcHR5IHN0cmluZ1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY2xhc3NlcyA9IGNsYXNzZXMuc3BsaXQoJyAnKTtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGFzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBuZXcgUmVnRXhwKCdeKCcgKyBwcmVmaXggKyAnKSguKiknKS5leGVjKGNsYXNzZXNbaV0pO1xuICAgICAgICAgICAgaWYgKG1hdGNoICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2gobWF0Y2hbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1hdGNoZXM7XG4gICAgfSxcblxuICAgIHJlbW92ZUNsYXNzZXNCeVByZWZpeDogZnVuY3Rpb24ocHJlZml4LCAkalFPYmopIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSB0aGlzLmdldENsYXNzZXNCeVByZWZpeChwcmVmaXgsICRqUU9iaik7XG4gICAgICAgIG1hdGNoZXMgPSBtYXRjaGVzLmpvaW4oJyAnKTtcbiAgICAgICAgJGpRT2JqLnJlbW92ZUNsYXNzKG1hdGNoZXMpO1xuICAgIH1cbn07XG4iLCJ2YXIgY2xhbV9tb2R1bGUgPSByZXF1aXJlKCdjbGFtL2NvcmUvbW9kdWxlJyk7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCd1dGlsJykuaW5oZXJpdHM7XG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LiQgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLiQgOiBudWxsKTtcblxudmFyIHNldHRpbmdzID0ge1xuICAgIC8vIHR5cGU6ICdzaW5nbGV0b24nLFxuICAgIGNvbmY6IHtcbiAgICAgICAgc2Nyb2xsU3BlZWQ6IDMwMFxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIFNjcm9sbGVyKCRqUU9iaiwgY29uZikge1xuICAgIGNsYW1fbW9kdWxlLmFwcGx5KHRoaXMsIFskalFPYmosIHNldHRpbmdzLCBjb25mXSk7XG4gICAgLy8gdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIHRoaXMuZXhwb3NlKCk7XG5cbiAgICAkc2Nyb2xsZXJIb29rID0gdGhpcy5nZXRIb29rKCdzY3JvbGwnKTtcbiAgICAkc2Nyb2xsZXJIb29rLm9uKCdjbGljaycsICQucHJveHkodGhpcy5vblNjcm9sbENsaWNrLCB0aGlzLCAkc2Nyb2xsZXJIb29rKSk7XG59XG5cbmluaGVyaXRzKFNjcm9sbGVyLCBjbGFtX21vZHVsZSk7XG5cblNjcm9sbGVyLnByb3RvdHlwZS5vblNjcm9sbENsaWNrID0gZnVuY3Rpb24oJGhvb2ssIGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgdmFyIGhvb2tDb25mID0gdGhpcy5nZXRIb29rQ29uZmlndXJhdGlvbigkaG9vayk7XG4gICAgaWYgKHR5cGVvZiBob29rQ29uZi5vZmZzZXQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhvb2tDb25mLm9mZnNldCA9IDA7XG4gICAgfVxuXG4gICAgdmFyICRzY3JvbGxUb0VsZW1lbnQgPSAkKCcjJyArIGhvb2tDb25mLnRhcmdldElEKTtcbiAgICBpZiAoJHNjcm9sbFRvRWxlbWVudC5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuICAgICAgICBzY3JvbGxUb3A6ICRzY3JvbGxUb0VsZW1lbnQub2Zmc2V0KCkudG9wICsgaG9va0NvbmYub2Zmc2V0XG4gICAgfSwgdGhpcy5tb2R1bGUuY29uZi5zY3JvbGxTcGVlZCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjcm9sbGVyO1xuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiJdfQ==
