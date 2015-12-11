import Generic from './Generic';

class Rect extends Generic {}

Rect.configure({
    markup: '<g class="pane-rotatable"><g class="pane-scalable"><rect/></g><text/></g>',
    defaults: {
        attrs: {
            'rect': {
                fill: '#ffffff',
                stroke: '#000000',
                width: 100,
                height: 60
            },
            'text': {
                fill: '#000000',
                text: '',
                'font-size': 14,
                'ref-x': .5,
                'ref-y': .5,
                'text-anchor': 'middle',
                'y-alignment': 'middle',
                'font-family': 'Arial, helvetica, sans-serif'
            }
        }
    }
});

export default Rect;