import Node from '../../cells/Node';

class Rect extends Node {}

Rect.setDefaults({
    markup: '<g class="pane-rotatable"><g class="pane-scalable"><rect/></g></g>',
    attrs: {
        '.': {fill: '#ffffff', stroke: 'none'},
        'rect': {
            'fill': '#ffffff',
            'stroke': '#000000',
            'stroke-width': '1',
            'width': 15,
            'height': 15
        }
    }
});

export default Rect;
