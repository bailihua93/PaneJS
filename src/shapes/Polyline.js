import {
    getValue,
    isNullOrUndefined
} from '../common/utils';

import Shape from './Shape';

export default Shape.extend({

    constructor: function PolyLine(state, style, points) {

        var that = this;

        that.state = state;
        that.style = style;
        that.points = points;
    },

    getRotation: function () {
        return 0;
    },

    isPaintBoundsInverted: function () {
        return false;
    },

    drawLink: function (canvas, points) {

        var that = this;
        var style = that.style;

        if (style && style.curved) {

        } else {

        }


        return that;
    },
});

