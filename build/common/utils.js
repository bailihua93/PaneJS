define(function(require, exports, module) {/* jshint node: true, loopfunc: true, undef: true, unused: true */
/* global window, document */

var detector = require('./detector');

var utils = {};

var arrProto = Array.prototype;
var objProto = Object.prototype;
var slice = arrProto.slice;
var toString = objProto.toString;
var hasOwn = objProto.hasOwnProperty;

//var Point = require('../Point');
//var Rectangle = require('../Rectangle');
//var constants = require('../constants');


// Lang
// ----

function isType(obj, type) {
    return toString.call(obj) === '[object ' + type + ']';
}

function isObject(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
}

function isFunction(obj) {
    return isType(obj, 'Function');
}

function isNull(obj) {
    return obj === null;
}

function isUndefined(obj) {
    return typeof obj === 'undefined';
}

function isNullOrUndefined(obj) {
    return isUndefined(obj) || isNull(obj);
}

function isWindow(obj) {
    return obj !== null && obj === obj.window;
}

var isArray = Array.isArray || function (obj) {
        return isType(obj, 'Array');
    };

function isArrayLike(obj) {
    if (isArray(obj)) {
        return true;
    }

    if (isFunction(obj) || isWindow(obj)) {
        return false;
    }

    var length = !!obj && 'length' in obj && obj.length;

    return length === 0 ||
        typeof length === 'number' && length > 0 && (length - 1) in obj;
}

function isNumeric(obj) {
    return !isArray(obj) && (obj - parseFloat(obj) + 1) >= 0;
}

utils.isType = isType;
utils.isNull = isNull;
utils.isArray = isArray;
utils.isObject = isObject;
utils.isWindow = isWindow;
utils.isNumeric = isNumeric;
utils.isFunction = isFunction;
utils.isUndefined = isUndefined;
utils.isArrayLike = isArrayLike;
utils.isNullOrUndefined = isNullOrUndefined;

// String
// ------

utils.toString = function (str) {
    return '' + str;
};

utils.lcFirst = function (str) {
    str = str + '';
    return str.charAt(0).toLowerCase() + str.substr(1);
};

utils.ucFirst = function (str) {
    str = str + '';
    return str.charAt(0).toUpperCase() + str.substr(1);
};

utils.ltrim = function (str, chars) {
    chars = chars || "\\s";

    return str.replace(new RegExp("^[" + chars + "]+", "g"), "");
};

utils.rtrim = function (str, chars) {
    chars = chars || "\\s";

    return str.replace(new RegExp("[" + chars + "]+$", "g"), "");
};

utils.trim = function (str, chars) {
    return utils.ltrim(utils.rtrim(str, chars), chars);
};

// Number
// ------
utils.toFixed = function (value, precision) {
    var power = Math.pow(10, precision);
    return (Math.round(value * power) / power).toFixed(precision);
};

utils.mod = function (n, m) {
    return ((n % m) + m) % m;
};


// Object
// ------

function hasKey(obj, key) {
    return obj !== null && hasOwn.call(obj, key);
}

function clone(obj, transients, shallow) {

    shallow = (shallow !== null) ? shallow : false;
    var cloned = null;

    if (obj && isFunction(obj.constructor)) {
        cloned = new obj.constructor();

        for (var i in obj) {
            //if (i !== mxObjectIdentity.FIELD_NAME && (!transients || indexOf(transients, i) < 0)) {
            if (i !== 'objectId' && (!transients || utils.indexOf(transients, i) < 0)) {
                if (!shallow && typeof(obj[i]) === 'object') {
                    cloned[i] = clone(obj[i]);
                } else {
                    cloned[i] = obj[i];
                }
            }
        }
    }

    return cloned;
}

utils.keys = Object.keys || function (obj) {

        if (!isObject(obj)) {
            return [];
        }

        var keys = [];
        for (var key in obj) {
            if (hasKey(obj, key)) {
                keys.push(key);
            }
        }

        // ie < 9 不考虑
    };

utils.hasKey = hasKey;
utils.clone = clone;

utils.getValue = function (obj, key, defaultValue) {
    var value = obj ? obj[key] : null;

    if (isNullOrUndefined(value)) {
        value = defaultValue;
    }

    return value;
};

utils.getNumber = function (obj, key, defaultValue) {
    var value = obj ? obj[key] : null;

    if (isNullOrUndefined(value)) {
        value = defaultValue || 0;
    }

    return Number(value);
};

utils.extend = function (dist) {
    each(slice.call(arguments, 1), function (source) {
        if (source) {
            for (var prop in source) {
                dist[prop] = source[prop];
            }
        }
    });
    return dist;
};

utils.equalEntries = function (a, b) {
    if ((a === null && b !== null) || (a !== null && b === null) ||
        (a !== null && b !== null && a.length !== b.length)) {
        return false;
    }
    else if (a && b) {
        for (var key in a) {
            if ((!isNaN(a[key]) || !isNaN(b[key])) && a[key] !== b[key]) {
                return false;
            }
        }
    }

    return true;
};

// Array
// -----

utils.indexOf = arrProto.indexOf ?
    function (arr, item) {
        return arr.indexOf(item);
    } :
    function (arr, item) {
        for (var i = 0, len = arr.length; i < len; i++) {
            if (arr[i] === item) {
                return i;
            }
        }
        return -1;
    };

// TODO: 改为 forIn 和 each 两个方法
var each = utils.each = function (list, iteratee, context) {
    var i;

    if (isArrayLike(list)) {
        var length = list.length;
        for (i = 0; i < length; i++) {
            iteratee.call(context, list[i], i, list);
        }
    } else {
        for (i in list) {
            if (hasKey(list, i)) {
                iteratee.call(context, list[i], i, list);
            }
        }
    }

    return list;
};

utils.toArray = function (obj) {
    return isArrayLike(obj) ? slice.call(obj) : [];
};


// Function
// --------

utils.invoke = function (method, args, context) {
    if (!method || !isFunction(method)) {
        return;
    }

    args = isArray(args) ? args : args ? [args] : [];

    var ret;
    var a1 = args[0];
    var a2 = args[1];
    var a3 = args[2];

    // call is faster than apply, optimize less than 3 argu
    // http://blog.csdn.net/zhengyinhui100/article/details/7837127
    switch (args.length) {
        case 0:
            ret = method.call(context);
            break;
        case 1:
            ret = method.call(context, a1);
            break;
        case 2:
            ret = method.call(context, a1, a2);
            break;
        case 3:
            ret = method.call(context, a1, a2, a3);
            break;
        default:
            ret = method.apply(context, args);
            break;
    }

    return ret;
};

utils.getFunctionName = function (fn) {
    var str = '';

    if (!isNullOrUndefined(fn)) {
        if (!isNullOrUndefined(fn.name)) {
            str = fn.name;
        } else {

            var tmp = fn.toString();
            var idx1 = 9;

            while (tmp.charAt(idx1) === ' ') {
                idx1++;
            }

            var idx2 = tmp.indexOf('(', idx1);
            str = tmp.substring(idx1, idx2);
        }
    }

    return str;
};

/**
 * Function: bind
 *
 * Returns a wrapper function that locks the execution scope of the given
 * function to the specified scope. Inside funct, the "this" keyword
 * becomes a reference to that scope.
 */
utils.bind = function(scope, funct) {
    return function () {
        return funct.apply(scope, arguments);
    };
};

// BOM
// ---
utils.isNode = function (node, nodeName, attributeName, attributeValue) {

    var ret = node && !isNaN(node.nodeType);

    if (ret) {
        ret = isNullOrUndefined(nodeName) || node.nodeName.toLowerCase() === nodeName.toLowerCase();
    }

    if (ret) {
        ret = isNullOrUndefined(attributeName) || node.getAttribute(attributeName) === attributeValue;
    }

    return ret;
};

utils.isAncestorNode = function (ancestor, child) {
    var parent = child;

    while (parent != null) {
        if (parent == ancestor) {
            return true;
        }

        parent = parent.parentNode;
    }

    return false;
};


utils.getOffset = function (container, scrollOffset) {
    var offsetLeft = 0;
    var offsetTop = 0;

    if (scrollOffset !== null && scrollOffset) {
        var offset = utils.getDocumentScrollOrigin(container.ownerDocument);
        offsetLeft += offset.left;
        offsetTop += offset.top;
    }

    while (container.offsetParent) {
        offsetLeft += container.offsetLeft;
        offsetTop += container.offsetTop;

        container = container.offsetParent;
    }

    return {
        left: offsetLeft,
        top: offsetTop
    };
};

utils.getDocumentScrollOrigin = function (doc) {
    var wnd = doc.defaultView || doc.parentWindow;

    var x = (wnd && window.pageXOffset !== undefined) ?
        window.pageXOffset :
        (document.documentElement || document.body.parentNode || document.body).scrollLeft;

    var y = (wnd && window.pageYOffset !== undefined) ?
        window.pageYOffset :
        (document.documentElement || document.body.parentNode || document.body).scrollTop;

    return {
        left: x,
        top: y
    };
};

utils.getScrollOrigin = function (node) {
    var b = document.body;
    var d = document.documentElement;
    var result = utils.getDocumentScrollOrigin(node ? node.ownerDocument : document);

    while (node && node !== b && node !== d) {
        if (!isNaN(node.scrollLeft) && !isNaN(node.scrollTop)) {
            result.left += node.scrollLeft;
            result.top += node.scrollTop;
        }

        node = node.parentNode;
    }

    return result;
};

utils.createSvgGroup = function () {};

utils.write = function (parent, text) {

    var node = null;

    if (parent) {
        var doc = parent.ownerDocument;

        node = doc.createTextNode(text);
        parent.appendChild(node);
    }

    return node;
};

//
utils.getBaseUrl = function () {
    var href = window.location.href;
    var hash = href.lastIndexOf('#');

    if (hash > 0) {
        href = href.substring(0, hash);
    }

    return href;
};

utils.toRadians = function (deg) {
    return Math.PI * deg / 180;
};

utils.setCellStyles = function (model, cells, key, value) {
    if (cells && cells.length) {
        model.beginUpdate();
        try {
            for (var i = 0; i < cells.length; i++) {
                if (cells[i] !== null) {
                    var style = utils.setStyle(model.getStyle(cells[i]), key, value);
                    model.setStyle(cells[i], style);
                }
            }
        }
        finally {
            model.endUpdate();
        }
    }
};

utils.setStyle = function (style, key, value) {
    var isValue = value != null && (typeof(value.length) == 'undefined' || value.length > 0);

    if (style == null || style.length == 0) {
        if (isValue) {
            style = key + '=' + value;
        }
    }
    else {
        var index = style.indexOf(key + '=');

        if (index < 0) {
            if (isValue) {
                var sep = (style.charAt(style.length - 1) === ';') ? '' : ';';
                style = style + sep + key + '=' + value;
            }
        }
        else {
            var tmp = (isValue) ? (key + '=' + value) : '';
            var cont = style.indexOf(';', index);

            if (!isValue) {
                cont++;
            }

            style = style.substring(0, index) + tmp +
                ((cont > index) ? style.substring(cont) : '');
        }
    }

    return style;
};

utils.setPrefixedStyle = function () {
    var prefix = null;

    if (detector.IS_OP && detector.IS_OT) {
        prefix = 'O';
    }
    else if (detector.IS_SF || detector.IS_GC) {
        prefix = 'Webkit';
    }
    else if (detector.IS_MT) {
        prefix = 'Moz';
    }
    else if (detector.IS_IE && document.documentMode >= 9 && document.documentMode < 10) {
        prefix = 'ms';
    }

    return function (style, name, value) {
        style[name] = value;

        if (prefix !== null && name.length > 0) {
            name = prefix + name.substring(0, 1).toUpperCase() + name.substring(1);
            style[name] = value;
        }
    };
}();

utils.clearSelection = function () {
    if (document.selection) {
        return function () {
            document.selection.empty();
        };
    }
    else if (window.getSelection) {
        return function () {
            window.getSelection().removeAllRanges();
        };
    }
    else {
        return function () { };
    }
}();

utils.setOpacity = function (node, value) {
    node.style.opacity = (value / 100);
};

module.exports = utils;

});