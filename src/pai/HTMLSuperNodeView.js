import * as utils from '../common/utils';
import Rect       from '../geometry/Rect';
import CellView   from '../views/CellView';


class HTMLNodeView extends CellView {

    static get specialAttributes() {

        return [
            'text',
            'html',
            'style'
        ];
    }

    render() {

        this.renderMarkup();

        this.scalableNode  = this.findOne('.pane-scalable');
        this.rotatableNode = this.findOne('.pane-rotatable');

        this.update()
            .resize()
            .rotate()
            .translate();

        return this;
    }

    ensureElement() {

        this.elem = utils.createElement(this.cell.getTagName());
        // attach cell's id to elem
        this.elem.cellId = this.cell.id;

        let className = this.cell.getClassName();
        if (className) {
            utils.addClass(this.elem, className);
        }

        let pane = this.getPane();
        if (pane) {
            pane.appendChild(this.elem);
        }

        return this;
    }

    renderMarkup() {

        let markup = this.compileMarkup(this.cell.getMarkup(), this.cell.data);

        this.elem.innerHTML = markup;

        return this;
    }

    find(selector) {

        return selector === '.' ? [this.elem] : this.elem.querySelectorAll(selector);
    }

    findOne(selector) {

        return selector === '.' ? this.elem : this.elem.querySelector(selector);
    }

    update(specifiedAttrs) {

        utils.forIn(specifiedAttrs || this.cell.attrs, function (attrs, selector) {

            let nodes = this.find(selector);
            if (!nodes.length) {
                return;
            }

            let specials = HTMLNodeView.specialAttributes.slice();
            let normal   = {};

            utils.forIn(attrs, function (value, key) {
                if (!utils.contains(specials, key)) {
                    normal[key] = value;
                }
            });

            // set regular attributes
            if (!utils.isEmptyObject(normal)) {
                utils.forEach(nodes, function (node) {
                    utils.forIn(normal, function (attrVal, attrName) {
                        utils.setAttribute(node, attrName, attrVal);
                    });
                });
            }

            if (!utils.isUndefined(attrs.style)) {

                if (utils.isString(attrs.style)) {
                    utils.forEach(nodes, function (node) {
                        utils.setAttribute(node, 'style', attrs.style);
                    });
                } else if (utils.isObject(attrs.style)) {
                    utils.forEach(nodes, function (node) {
                        utils.forIn(attrs.style, function (val, name) {
                            node.style[name] = val;
                        });
                    });
                }
            }

            if (!utils.isUndefined(attrs.html)) {
                utils.forEach(nodes, function (node) {
                    node.innerHTML = attrs.html || '';
                });
            }

            if (!utils.isUndefined(attrs.text)) {
                utils.forEach(nodes, function (node) {
                    utils.emptyElement(node);
                    node.appendChild(document.createTextNode(attrs.text || ''));
                });
            }

        }, this);

        return this;
    }

    resize() {

        let scalable = this.scalableNode;
        if (!scalable) {
            return this;
        }

        let width  = scalable.clientWidth || scalable.offsetWidth || 1;
        let height = scalable.clientHeight || scalable.offsetHeight || 1;

        let size = this.cell.getSize();

        let sx = size.width / width;
        let sy = size.height / height;

        sx = utils.toFixed(sx, 2);
        sy = utils.toFixed(sy, 2);

        utils.setScale(scalable, sx, sy);

        return this;
    }

    rotate() {

        if (this.rotatableNode) {

            let size = this.cell.getSize();
            let ox   = size.width / 2;
            let oy   = size.height / 2;

            utils.setRotation(this.rotatableNode, this.cell.getRotation(), ox, oy);
        }

        return this;
    }

    translate() {

        let position = this.cell.getPosition();

        utils.setTranslate(this.elem, position.x, position.y);

        return this;
    }

    setNodeName(name) {

        let node = this.getCell();

        if (node.data) {
            node.data.name = name;
        }

        let elem = this.findOne('.name');
        if (elem) {
            utils.emptyElement(elem);
            elem.appendChild(document.createTextNode(name));
        }

        return this;
    }

    setPortConnected(port, isSourcePort, isConnected) {

        let elem = this.getPortElem(port, isSourcePort);
        if (elem) {
            utils.toggleClass(elem, 'is-connected', isConnected);
        }
    }

    setPortConnecting(port, isSourcePort, isConnecting) {

        let elem = this.getPortElem(port, isSourcePort);
        if (elem) {
            utils.toggleClass(elem, 'is-connecting', isConnecting);
        }
    }

    setPortHighlight(port, isSourcePort, isHighlighted) {

        let elem = this.getPortElem(port, isSourcePort);
        if (elem) {
            utils.toggleClass(elem, 'is-connectable', isHighlighted);
        }

        let container = this.findOne('.pane-node-content');
        if (container) {
            utils.toggleClass(container, 'is-connectable', isHighlighted);
        }
    }

    setPortAdsorbed(port, isSourcePort, isAdsorbed) {

        let elem = this.getPortElem(port, isSourcePort);

        elem = elem && elem.querySelector('.port-magnet');
        elem && utils.toggleClass(elem, 'is-adsorbed', isAdsorbed);
    }

    getBBox() {

        let bounds = utils.getBounds(this.elem);
        if (bounds) {
            return new Rect(bounds.left, bounds.top, bounds.width, bounds.height);
        }
    }

    getStrokedBBox() {

        let bbox        = this.cell.getBBox();
        let borderWidth = 0;
        let contentElem = this.findOne('.pane-node-content');

        if (contentElem) {
            borderWidth = utils.getComputedStyle(contentElem, 'border-width') - 1;
        }

        return borderWidth ? bbox.grow(borderWidth / 2) : bbox;
    }

    getPortBodyBBox(port, isSourcePort) {

        let elem = this.getPortElem(port, isSourcePort);
        if (elem) {
            let bounds = utils.getBounds(elem);
            return this.getPaper().toLocalRect({
                x: bounds.left,
                y: bounds.top,
                width: bounds.width,
                height: bounds.height
            });
        }
    }

    getPortElem(port, isSourcePort) {

        let node = this.getCell();

        if (!utils.isObject(port)) {
            port = node.getPortById(port);
        }

        let selector = node.getPortSelector(port, !isSourcePort);
        if (selector) {
            return this.findOne(selector);
        }
    }

    findPortElem(elem) {

        while (elem && elem !== this.elem) {
            if (utils.hasClass(elem, 'pane-port')) {
                return elem;
            }
            elem = elem.parentNode;
        }

        return null;
    }

    isPortElem(elem) {

        return this.findPortElem(elem) ? true : false;
    }

    isOutPortElem(elem) {

        elem = this.findPortElem(elem);

        while (elem && elem !== this.elem) {
            if (utils.hasClass(elem, 'pane-ports out')) {
                return true;
            }
            elem = elem.parentNode;
        }

        return false;
    }

    isInPortElem(elem) {

        elem = this.findPortElem(elem);

        while (elem && elem !== this.elem) {
            if (utils.hasClass(elem, 'pane-ports in')) {
                return true;
            }
            elem = elem.parentNode;
        }

        return false;

    }

    findPortByElem(elem) {

        let result   = null;
        let portElem = elem && this.findPortElem(elem);

        if (portElem) {
            let collection = this.isOutPortElem(portElem)
                ? this.cell.getOutPorts()
                : this.cell.getInPorts();

            let portId = utils.toInt(portElem.getAttribute('data-id'));

            utils.some(collection, function (port) {
                if (port.id === portId) {
                    result = port;
                    return true;
                }
            });
        }

        return result;
    }
}


// exports
// -------

export default HTMLNodeView;