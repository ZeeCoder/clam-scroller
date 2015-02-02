var clam_module = require('clam/core/module');
var inherits = require('util').inherits;
var $ = require('jquery');

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
