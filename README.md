# Clam Scroller

[![Greenkeeper badge](https://badges.greenkeeper.io/ZeeCoder/clam-scroller.svg)](https://greenkeeper.io/)
[![Project Status](http://stillmaintained.com/ZeeCoder/clam-scroller.png)](http://stillmaintained.com/ZeeCoder/clam-scroller)

To test: clone, and visit the `web/` folder.

Installation: `bower install clam-scroller --save-dev`

Requiring: `var clam_scroller = require('clam-scroller/module/scroller');`

Example HTML:
```html
<a
    href="javascript: void(0)"
    class="jsm-scroller jsm-scroller__scroll"
    data-jsm-scroller='{
        "targetID": "target",
        "yOffset": -30
    }'
>
    Scroll the body to the DOM element with the "target" ID.
</a>
```
