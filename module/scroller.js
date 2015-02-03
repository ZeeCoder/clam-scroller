var clam_module = require('clam/core/module');
var inherits = require('util').inherits;
var $ = require('jquery');
var q = require('q');

var settings = {
    type: 'singleton',
    hasGlobalHooks: true,
    conf: {
        scrollSpeed: 300
    }
};

/**
 * A Singleton module. Lets you scroll to a DOM element (by ID) by using
 * local/global hooks.
 * @param {jQuery} $jQObj The module's jQuery Object. (length must be 1)
 * @param {Object} [conf] The configuration.
 */
function Scroller($jQObj, conf) {
    clam_module.apply(this, [$jQObj, settings, conf]);
    var self = this;
    // this.expose();

    this.getHooks('scroll').on('click', function(e){
        self.onScrollClick($(this), e);
    });
}

inherits(Scroller, clam_module);

/**
 * Method called when the scroll hook is clicked.
 * Events: "beforeScroll"
 * @param  {jQuery} $hook The jQuery hook.
 * @param  {Event} e The click event.
 */
Scroller.prototype.onScrollClick = function($hook, e) {
    var self = this;
    e.preventDefault();
    var hookConf = this.getHookConfiguration($hook);

    this.triggerEvent('beforeScroll')
    .then(function(stop){
        if (stop) {return}

        if (typeof hookConf.offset === 'undefined') {
            hookConf.offset = 0;
        }

        var $scrollToElement = $('#' + hookConf.targetID);
        if ($scrollToElement.length == 0) {
            return;
        }

        $('html, body').animate({
            scrollTop: $scrollToElement.offset().top + hookConf.offset
        }, self.module.conf.scrollSpeed);
    })
    .catch(function(){
        console.error(arguments);
    });
};

module.exports = Scroller;
