import { isUndefined, isNullOrUndefined, isWindow } from './lang';


function getNodeName(elem) {

    return elem.nodeName ? elem.nodeName.toLowerCase() : '';
}

function getClassName(elem) {

    return elem.getAttribute && elem.getAttribute('class') || '';
}

function fillSpaces(str) {
    return ' ' + str + ' ';
}

function containsClassName(elem, classStr) {
    if (elem.classList) {
        return elem.classList.contains(classStr);
    }
    return fillSpaces(getClassName(elem)).indexOf(fillSpaces(classStr)) > -1;
}

function isNode(elem, nodeName, attrName, attrValue) {

    let ret = elem && !isNaN(elem.nodeType);

    if (ret) {
        ret = isNullOrUndefined(nodeName) || getNodeName(elem) === nodeName.toLowerCase();
    }

    if (ret) {
        ret = isNullOrUndefined(attrName) || elem.getAttribute(attrName) === attrValue;
    }

    return ret;
}

let docElem = document.documentElement;
let contains = docElem.compareDocumentPosition || docElem.contains ?
    function (context, elem) {

        let aDown = context.nodeType === 9 ? context.documentElement : context;
        let bUp = elem && elem.parentNode;

        return context === bUp || !!(bUp && bUp.nodeType === 1 && (
                aDown.contains
                    ? aDown.contains(bUp)
                    : context.compareDocumentPosition && context.compareDocumentPosition(bUp) & 16
            ));
    } :
    function (context, elem) {

        if (elem) {

            /* eslint no-cond-assign: 0 */
            while ((elem = elem.parentNode)) {
                if (elem === context) {
                    return true;
                }
            }
        }

        return false;
    };

function getWindow(elem) {

    return isWindow(elem)
        ? elem : elem.nodeType === 9
        ? elem.defaultView || elem.parentWindow
        : false;
}

function getOffset(elem) {

    let box = {
        top: 0,
        left: 0
    };

    let doc = elem && elem.ownerDocument;

    if (!doc) {
        return box;
    }

    let docElement = doc.documentElement;

    // Make sure it's not a disconnected DOM node
    if (!contains(docElement, elem)) {
        return box;
    }

    // If we don't have gBCR, just use 0,0 rather than error
    // BlackBerry 5, iOS 3 (original iPhone)
    if (!isUndefined(elem.getBoundingClientRect)) {
        box = elem.getBoundingClientRect();
    }

    let win = getWindow(doc);

    return {
        top: box.top + (win.pageYOffset || docElement.scrollTop) - (docElement.clientTop || 0),
        left: box.left + (win.pageXOffset || docElement.scrollLeft) - (docElement.clientLeft || 0)
    };
}


// xml namespaces.
let ns = {
    xmlns: 'http://www.w3.org/2000/svg',
    xlink: 'http://www.w3.org/1999/xlink'
};
// svg version.
let svgVersion = '1.1';

function parseXML(str, async) {

    let xml;

    try {

        let parser = new DOMParser();

        if (!isUndefined(async)) {
            parser.async = async;
        }

        xml = parser.parseFromString(str, 'text/xml');

    } catch (error) {
        xml = null;
    }

    if (!xml || xml.getElementsByTagName('parsererror').length) {
        throw new Error('Invalid XML: ' + str);
    }

    return xml;
}

function createSvgDocument(content) {

    // Create an SVG document element.
    // If `content` is passed, it will be used as the SVG content of
    // the `<svg>` root element.

    let svg = '<svg xmlns="' + ns.xmlns + '" xmlns:xlink="' + ns.xmlns + '" version="' + svgVersion + '">' + (content || '') + '</svg>';
    let xml = parseXML(svg, false);
    return xml.documentElement;
}

function createSvgElement(tagName, doc) {

    return (doc || document).createElementNS(ns.xmlns, tagName);
}

function setAttribute(elem, name, value) {

    if (name === 'id') {
        elem.id = value;
    } else {

        let combined = name.split(':');

        combined.length > 1
            // Attribute names can be namespaced. E.g. `image` elements
            // have a `xlink:href` attribute to set the source of the image.
            ? elem.setAttributeNS(ns[combined[0]], combined[1], value)
            : elem.setAttribute(name, value);
    }
}

function getComputedStyle(elem, name) {

    // IE9+

    let computed = elem.ownerDocument.defaultView.opener
        ? elem.ownerDocument.defaultView.getComputedStyle(elem, null)
        : window.getComputedStyle(elem, null);

    if (computed && name) {
        return computed.getPropertyValue(name) || computed[name];
    }

    return computed;
}


// exports
// -------

export {
    isNode,
    getWindow,
    getOffset,
    getNodeName,
    getClassName,
    setAttribute,
    createSvgElement,
    createSvgDocument,
    contains as containsElem,
    containsClassName,
    getComputedStyle
};
