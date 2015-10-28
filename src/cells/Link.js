import Cell from './Cell';

export default Cell.extend({

    isLink: true,
    transients: ['id', 'value', 'parent', 'source', 'target'],

    constructor: function Link(id, value, geometry, style) {

        var that = this;

        Link.superclass.constructor.call(that, id, value, geometry, style);

        // lazy
        // that.source = null;
        // that.target = null;
    },

    getNode: function (isSource) {
        return isSource ? this.source : this.target;
    },

    setNode: function (node, isSource) {
        if (isSource) {
            this.source = node;
        }
        else {
            this.target = node;
        }

        return node;
    },

    removeFromNode: function (isSource) {

        var that = this;

        var node = that.getNode(isSource);

        node && node.removeLink(that, isSource);

        return that;
    }
});


