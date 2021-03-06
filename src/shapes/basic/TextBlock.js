import Node from '../../cells/Node';

class TextBlock extends Node {}

TextBlock.setDefaults({
  markup: '' +
  '<g class="pane-rotatable">' +
  '  <g class="pane-scalable">' +
  '    <rect/>' +
  '  </g>' +
  '  <switch>' +
  // if foreignObject supported
  '    <foreignObject requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility" class="fobj">' +
  '      <div/>' +
  '    </foreignObject>' +
  // else foreignObject is not supported (fallback for IE)
  '    <text class="content"/>' +
  '  </switch>' +
  '</g>',

  attrs: {
    '.': {
      fill: '#fff',
      stroke: 'none'
    },
    'rect': {
      fill: '#fff',
      stroke: '#000',
      width: 80,
      height: 100
    },
    'text': {
      'fill': '#000',
      'font-size': 14,
      'font-family': 'Arial, helvetica, sans-serif'
    },
    '.content': {
      'text': '',
      'ref': 'rect',
      'ref-x': .5,
      'ref-y': .5,
      'y-alignment': 'middle',
      'x-alignment': 'middle'
    }
  },

  content: ''
});

export default TextBlock;
