import * as utils from '../common/utils';
import VectorView from '../views/VectorView';


class NodeView extends VectorView {

  static get specialAttributes() {

    return [
      'text',
      'html',
      'style',
      'ref',
      'ref-x',
      'ref-y',
      'ref-dx',
      'ref-dy',
      'ref-width',
      'ref-height',
      'x-alignment',
      'y-alignment',
      // 'port'
    ];
  }

  render() {

    this.vel.empty();
    this.renderMarkup();

    this.scalableNode  = this.findOne('.pane-scalable');
    this.rotatableNode = this.findOne('.pane-rotatable');

    return this
      .update()
      .resize()
      .rotate()
      .translate();
  }

  update(specifiedAttrs) {

    // process the `attrs` object and set attributes
    // on sub elements based on the selectors.

    let allAttrs  = this.cell.attrs;
    let rotatable = this.rotatableNode;
    let rotation;

    if (rotatable) {
      rotation = rotatable.attr('transform');
      rotatable.attr('transform', '');
    }

    let nodesMap  = {};
    let relatives = [];

    utils.forIn(specifiedAttrs || allAttrs, (attrs, selector) => {

      let vels = this.find(selector);
      if (!vels.length) {
        return;
      }

      nodesMap[selector] = vels;

      let specials = NodeView.specialAttributes.slice();

      // filter
      if (utils.isObject(attrs.filter)) {
        specials.push('filter');
        this.applyFilter(vels, attrs.filter);
      }

      // gradient
      if (utils.isObject(attrs.fill)) {
        specials.push('fill');
        this.applyGradient(vels, 'fill', attrs.fill);
      }

      // gradient
      if (utils.isObject(attrs.stroke)) {
        specials.push('stroke');
        this.applyGradient(vels, 'stroke', attrs.stroke);
      }

      // text
      if (!utils.isNil(attrs.text)) {
        specials.push('lineHeight', 'textPath', 'annotations');
        utils.forEach(vels, (vel) => {
          vel.text(attrs.text, {
            textPath: attrs.textPath,
            lineHeight: attrs.lineHeight,
            annotations: attrs.annotations
          });
        });
      }


      let normal = {};

      utils.forIn(attrs, (value, key) => {
        if (!utils.contains(specials, key)) {
          normal[key] = value;
        }
      });

      if (!utils.isEmptyObject(normal)) {
        // set regular attributes
        utils.forEach(vels, (vel) => {
          vel.attr(normal);
        });
      }

      // `port` attribute contains the `id` of the port
      // that the underlying magnet represents.
      // if (attrs.port) {
      //    forEach(vels, function (vel) {
      //        vel.attr('port', isUndefined(attrs.port.id) ? attrs.port : attrs.port.id);
      //    });
      // }

      // TODO: vel.css()

      // if (attrs.style) {
      //    forEach(vels, function (vel) {
      //        vel.css(attrs.style);
      //    });
      // }

      // html
      if (!utils.isNil(attrs.html)) {
        utils.forEach(vels, (vel) => {
          vel.node.innerHTML = attrs.html;
        });
      }


      // Special `ref-x` and `ref-y` attributes make it possible to
      // set both absolute or relative positioning of sub elements.
      let isRelative = utils.some([
        'ref-x',
        'ref-y',
        'ref-dx',
        'ref-dy',
        'x-alignment',
        'y-alignment',
        'ref-width',
        'ref-height'
      ], key => !utils.isNil(attrs[key]));

      if (isRelative) {
        relatives.push(selector);
      }
    });


    // Note that we're using the bounding box without transformation
    // because we are already inside a transformed coordinate system.
    let size = this.cell.size;
    let bbox = {
      x: 0,
      y: 0,
      width: size.width,
      height: size.height
    };

    utils.forEach(relatives, (selector) => {

      let attrs     = allAttrs[selector];
      let specified = specifiedAttrs && specifiedAttrs[selector];
      if (specified) {
        attrs = utils.merge({}, attrs, specified);
      }

      utils.forEach(nodesMap[selector], (vel) => {
        this.positionRelative(vel, bbox, attrs, nodesMap);
      });

    });

    if (rotatable) {
      rotatable.attr('transform', rotation || '');
    }

    return this;
  }

  positionRelative(vel, bbox, attrs, nodeMapping) {

    let ref = attrs.ref;

    // `ref` is the selector of the reference element.
    // If no `ref` specified, reference element is the root element.
    if (ref) {

      let refVel = nodeMapping && nodeMapping[ref];
      if (refVel) {
        refVel = refVel[0];
      } else {
        refVel = ref === '.' ? this.vel : this.vel.findOne(ref);
      }

      if (!refVel) {
        throw new Error('NodeView: reference does not exists.');
      }

      // Get the bounding box of the reference element
      // relative to the root `<g>` element.
      bbox = refVel.getBBox(false, this.elem);
    }

    let refDx = utils.toFloat(attrs['ref-dx']);
    let refDy = utils.toFloat(attrs['ref-dy']);

    let yAlign = attrs['y-alignment'];
    let xAlign = attrs['x-alignment'];

    // 'ref-y', 'ref-x', 'ref-width', 'ref-height' can be
    // defined by value or by percentage e.g 4, 0.5, '200%'.

    let refX        = attrs['ref-x'];
    let xPercentage = utils.isPercentage(refX);
    refX            = utils.toFloat(refX, xPercentage);

    let refY        = attrs['ref-y'];
    let yPercentage = utils.isPercentage(refY);
    refY            = utils.toFloat(refY, yPercentage);

    let refWidth    = attrs['ref-width'];
    let wPercentage = utils.isPercentage(refWidth);
    refWidth        = utils.toFloat(refWidth, wPercentage);

    let refHeight   = attrs['ref-height'];
    let hPercentage = utils.isPercentage(refHeight);
    refHeight       = utils.toFloat(refHeight, hPercentage);

    // `ref-width` and `ref-height` defines the width and height
    // of the sub element relatively to the reference element size.
    if (utils.isFinite(refWidth)) {
      if (wPercentage || refWidth >= 0 && refWidth <= 1) {
        vel.attr('width', utils.toFixed(refWidth * bbox.width, 2));
      } else {
        vel.attr('width', Math.max(utils.toFixed(refWidth + bbox.width, 2), 0));
      }
    }

    if (utils.isFinite(refHeight)) {
      if (hPercentage || refHeight >= 0 && refHeight <= 1) {
        vel.attr('height', utils.toFixed(refHeight * bbox.height, 2));
      } else {
        vel.attr('height', Math.max(utils.toFixed(refHeight + bbox.height, 2), 0));
      }
    }


    // Check if the node is a descendant of the scalable group.
    let scalableNode = vel.findParent('pane-scalable', this.elem);

    // Remove the previous translate() from the transform attribute
    // and translate the element relative to the bounding box following
    // the `ref-x` and `ref-y` attributes.
    let transformAttr = vel.attr('transform');
    if (transformAttr) {
      vel.attr('transform', utils.clearTranslate(transformAttr));
    }

    // The final translation of the sub element.
    let tx = 0;
    let ty = 0;
    let scale;

    // `ref-dx` and `ref-dy` define the offset of the sub element relative
    // to the right and/or bottom coordinate of the reference element.
    if (utils.isFinite(refDx)) {
      if (scalableNode) {
        scale = scalableNode.scale();
        tx    = bbox.x + bbox.width + refDx / scale.sx;
      } else {
        tx = bbox.x + bbox.width + refDx;
      }
    }

    if (utils.isFinite(refDy)) {
      if (scalableNode) {
        scale = scale || scalableNode.scale();
        ty    = bbox.y + bbox.height + refDy / scale.sy;
      } else {
        ty = bbox.y + bbox.height + refDy;
      }
    }

    if (utils.isFinite(refX)) {
      if (xPercentage || refX > 0 && refX < 1) {
        tx = bbox.x + bbox.width * refX;
      } else if (scalableNode) {
        scale = scale || scalableNode.scale();
        tx    = bbox.x + refX / scale.sx;
      } else {
        tx = bbox.x + refX;
      }
    }

    if (utils.isFinite(refY)) {
      if (xPercentage || refY > 0 && refY < 1) {
        ty = bbox.y + bbox.height * refY;
      } else if (scalableNode) {
        scale = scale || scalableNode.scale();
        ty    = bbox.y + refY / scale.sy;
      } else {
        ty = bbox.y + refY;
      }
    }

    if (!utils.isNil(yAlign) || !utils.isNil(xAlign)) {

      let velBBox = vel.getBBox(false, this.getPane());

      if (yAlign === 'middle') {
        ty -= velBBox.height / 2;
      } else if (utils.isFinite(yAlign)) {
        ty += (yAlign > -1 && yAlign < 1) ? velBBox.height * yAlign : yAlign;
      }

      if (xAlign === 'middle') {
        tx -= velBBox.width / 2;
      } else if (utils.isFinite(xAlign)) {
        tx += (xAlign > -1 && xAlign < 1) ? velBBox.width * xAlign : xAlign;
      }
    }

    vel.translate(utils.toFixed(tx, 2), utils.toFixed(ty, 2));

    return this;
  }

  scale(sx, sy) {
    // Scale the whole `<g>` group.

    this.vel.scale(sx, sy);

    return this;
  }

  resize() {

    if (!this.scalableNode) {
      return this;
    }

    // get bbox without transform
    let nativeBBox = this.scalableNode.getBBox(true);

    // Make sure `scalableBBox.width` and `scalableBBox.height` are not
    // zero which can happen if the element does not have any content.
    // By making the width(height) 1, we prevent HTML errors of the type
    // `scale(Infinity, Infinity)`.
    let size = this.cell.getSize();

    let sx = size.width / (nativeBBox.width || 1);
    let sy = size.height / (nativeBBox.height || 1);

    sx = utils.toFixed(sx, 2);
    sy = utils.toFixed(sy, 2);

    this.scalableNode.attr('transform', 'scale(' + sx + ',' + sy + ')');

    // Update must always be called on non-rotated element. Otherwise,
    // relative positioning would work with wrong (rotated) bounding boxes.
    this.update();

    return this;
  }

  rotate() {

    if (this.rotatableNode) {

      let size = this.cell.getSize();
      let ox   = size.width / 2;
      let oy   = size.height / 2;

      this.rotatableNode.attr('transform', 'rotate(' + this.cell.getRotation() + ',' + ox + ',' + oy + ')');
    }

    return this;
  }

  translate() {

    let position = this.cell.getPosition();
    this.vel.attr('transform', 'translate(' + position.x + ',' + position.y + ')');

    return this;
  }

  getBBox() {

    return this.vel.getBBox();
  }

  getStrokeWidth() {

    let vTarget = this.findOne('rect')
      || this.findOne('path')
      || this.findOne('circle')
      || this.findOne('ellipse')
      || this.findOne('polyline')
      || this.findOne('polygon');

    if (vTarget && vTarget.node) {

      let strokeWidth = utils.getComputedStyle(vTarget.node, 'stroke-width');

      return strokeWidth && utils.toFloat(strokeWidth) || 0;
    }

    return 0;
  }

  getStrokedBBox() {

    let sw   = this.getStrokeWidth() - 1;
    let bbox = this.getCell().getBBox();

    return sw ? bbox.grow(sw / 2) : bbox;
  }

  getConnectionPointOnBorder() {

    return null;
  }
}


// exports
// -------

export default NodeView;
