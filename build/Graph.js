define(function(require, exports, module) {/* jshint node: true, loopfunc: true, undef: true, unused: true */

var Cell = require('./Cell');
var CellRenderer = require('./CellRenderer');
var ChildChange = require('./changes/ChildChange');
var Class = require('./common/class');
var detector = require('./common/detector');
var ConnectionConstraint = require('./ConnectionConstraint');
var ConnectionHandler = require('./handler/ConnectionHandler');
var EventSource = require('./events/EventSource');
var Event = require('./events/Event');
var domEvent = require('./events/domEvent');
var EventObject = require('./events/EventObject');
var Geometry = require('./Geometry');
var GeometryChange = require('./changes/GeometryChange');
var Model = require('./Model');
var Point = require('./Point');
var Rectangle = require('./Rectangle');
var RootChange = require('./changes/RootChange');
var Stylesheet = require('./Stylesheet');
var TerminalChange = require('./changes/TerminalChange');
var View = require('./View');
var constants = require('./constants');
var edgeStyle = require('./edgeStyle');
var eventNames = require('./events/eventNames');
var utils = require('./common/utils');

var isNullOrUndefined = utils.isNullOrUndefined;
var getValue = utils.getValue;

var Graph = EventSource.extend({
    Implements: Event,

    EMPTY_ARRAY: [],
    mouseListeners: null,
    isMouseDown: false,
    model: null,
    view: null,
    stylesheet: null,
    selectionModel: null,
    cellEditor: null,
    cellRenderer: null,
    multiplicities: null,

    gridSize: 10,
    gridEnabled: true,
    portsEnabled: true,
    nativeDblClickEnabled: true,
    doubleTapEnabled: true,
    doubleTapTimeout: 500,
    doubleTapTolerance: 25,
    lastTouchX: 0,
    lastTouchY: 0,
    lastTouchTime: 0,
    tapAndHoldEnabled: true,
    tapAndHoldDelay: 500,
    tapAndHoldInProgress: false,
    tapAndHoldValid: false,
    initialTouchX: 0,
    initialTouchY: 0,
    tolerance: 0,
    defaultOverlap: 0.5,
    defaultParent: null,
    alternateEdgeStyle: null,
    backgroundImage: null,
    pageVisible: false,
    pageBreaksVisible: false,
    pageBreakColor: 'gray',
    pageBreakDashed: true,
    minPageBreakDist: 20,
    preferPageSize: false,
    pageFormat: null,// constants.PAGE_FORMAT_A4_PORTRAIT;
    pageScale: 1.5,
    enabled: true,

    escapeEnabled: true,
    invokesStopCellEditing: true,
    enterStopsCellEditing: false,
    useScrollbarsForPanning: true,
    exportEnabled: true,
    importEnabled: true,
    cellsLocked: false,
    cellsCloneable: true,
    foldingEnabled: true,
    cellsEditable: true,
    cellsDeletable: true,
    cellsMovable: true,
    edgeLabelsMovable: true,
    vertexLabelsMovable: false,
    dropEnabled: false,
    splitEnabled: true,
    cellsResizable: true,
    cellsBendable: true,
    cellsSelectable: true,
    cellsDisconnectable: true,
    autoSizeCells: false,
    autoSizeCellsOnAdd: false,
    autoScroll: true,
    timerAutoScroll: false,
    allowAutoPanning: false,
    ignoreScrollbars: false,
    autoExtend: true,
    maximumGraphBounds: null,
    minimumGraphSize: null,
    minimumContainerSize: null,
    maximumContainerSize: null,
    resizeContainer: false,
    border: 0,
    keepEdgesInForeground: false,
    keepEdgesInBackground: false,
    allowNegativeCoordinates: true,
    constrainChildren: true,
    constrainChildrenOnResize: false,
    extendParents: true,
    extendParentsOnAdd: true,
    extendParentsOnMove: false,
    recursiveResize: false,
    collapseToPreferredSize: true,
    zoomFactor: 1.2,
    keepSelectionVisibleOnZoom: false,
    centerZoom: true,
    resetViewOnRootChange: true,
    resetEdgesOnResize: false,
    resetEdgesOnMove: false,
    resetEdgesOnConnect: true,
    allowLoops: false,
    //defaultLoopStyle: mxEdgeStyle.Loop, // TODO
    multigraph: true,
    connectableEdges: false,
    allowDanglingEdges: true,
    cloneInvalidEdges: false,
    disconnectOnMove: true,
    labelsVisible: true,
    htmlLabels: false,
    swimlaneSelectionEnabled: true,
    swimlaneNesting: true,
    swimlaneIndicatorColorAttribute: constants.STYLE_FILLCOLOR,
    imageBundles: null,
    minFitScale: 0.1,
    maxFitScale: 8,
    panDx: 0,
    panDy: 0,

    collapsedImage: null,
    expandedImage: null,
    warningImage: null,
    alreadyConnectedResource: null,
    containsValidationErrorsResource: null,
    collapseExpandResource: null,

    constructor: function Graph(container, model, stylesheet) {

        var that = this;

        that.mouseListeners = null;
        that.model = model ? model : new Model();
        that.multiplicities = [];
        that.imageBundles = [];
        that.cellRenderer = that.createCellRenderer();
        that.setSelectionModel(that.createSelectionModel());
        that.setStylesheet(stylesheet ? stylesheet : that.createStylesheet());
        that.view = that.createView();

        that.model.on('change', function (evt) {
            that.graphModelChanged(evt.getData('edit').changes);
        });

        that.createHandlers(); // create handlers

        if (container) {
            that.init(container);
        }

        that.view.revalidate();
    },

    init: function (container) {

        var that = this;

        that.container = container;

        // Initializes the in-place editor
        this.cellEditor = this.createCellEditor();

        // Initializes the container using the view
        that.view.init();

        // Updates the size of the container for the current graph
        that.sizeDidChange();

        // Hides tooltips and resets tooltip timer if mouse leaves container
        //domEvent.addListener(container, 'mouseleave', utils.bind(this, function () {
        //    if (this.tooltipHandler != null) {
        //        this.tooltipHandler.hide();
        //    }
        //}));
    },


    createHandlers: function () {
        var that = this;
        that.connectionHandler = that.createConnectionHandler();
        that.connectionHandler.setEnabled(false);
    },

    createConnectionHandler: function () {
        return new ConnectionHandler(this);
    },

    createSelectionModel: function () {},
    createStylesheet: function () {
        return new Stylesheet();
    },
    createView: function () {
        return new View(this);
    },
    createCellRenderer: function () {
        return new CellRenderer();
    },
    createCellEditor: function () {},
    getModel: function () {
        return this.model;
    },
    getView: function () {
        return this.view;
    },

    getStylesheet: function () {
        return this.stylesheet;
    },
    setStylesheet: function (stylesheet) {
        this.stylesheet = stylesheet;
    },
    getSelectionModel: function () {
        return this.selectionModel;
    },
    setSelectionModel: function (selectionModel) {
        this.selectionModel = selectionModel;
    },
    getSelectionCellsForChanges: function () {},
    graphModelChanged: function (changes) {
        console.log(changes);
        for (var i = 0; i < changes.length; i++) {
            this.processChange(changes[i]);
        }

        this.removeSelectionCells(this.getRemovedCellsForChanges(changes));

        this.view.validate();
        this.sizeDidChange();
    },
    processChange: function (change) {
        if (change instanceof RootChange) {

        } else if (change instanceof ChildChange) {
            var newParent = this.model.getParent(change.child);
            this.view.invalidate(change.child, true, true);

            if (!newParent || this.isCellCollapsed(newParent)) {
                this.view.invalidate(change.child, true, true);
                this.removeStateForCell(change.child);

                // Handles special case of current root of view being removed
                if (this.view.currentRoot === change.child) {
                    this.home();
                }
            }

            if (newParent !== change.previous) {
                // Refreshes the collapse/expand icons on the parents
                if (newParent) {
                    this.view.invalidate(newParent, false, false);
                }

                if (change.previous != null) {
                    this.view.invalidate(change.previous, false, false);
                }
            }
        } else if (change instanceof TerminalChange || change instanceof GeometryChange) {
            if (change instanceof TerminalChange || ((change.previous == null && change.geometry != null) ||
                (change.previous != null && !change.previous.equals(change.geometry)))) {
                this.view.invalidate(change.cell);
            }
        }

    },
    getRemovedCellsForChanges: function () {},
    removeStateForCell: function (cell) {
        var childCount = this.model.getChildCount(cell);

        for (var i = 0; i < childCount; i++) {
            this.removeStateForCell(this.model.getChildAt(cell, i));
        }

        this.view.invalidate(cell, false, true);
        this.view.removeState(cell);
    },


    // Overlays
    // ---------
    addCellOverlay: function (cell, overlay) {},
    getCellOverlays: function (cell) {
        return cell.overlays;
    },
    removeCellOverlay: function (cell, overlay) {},
    removeCellOverlays: function (cell) {},
    clearCellOverlays: function (cell) {},
    setCellWarning: function () {},


    // In-place editing
    // ----------------
    startEditing: function (evt) {},
    startEditingAtCell: function (cell, evt) {},
    getEditingValue: function (cell, evt) {},
    stopEditing: function (cancel) {},
    labelChanged: function (cell, value, evt) {},
    cellLabelChanged: function (cell, value, autoSize) {},


    // Event processing
    // ----------------
    escape: function (evt) {},
    click: function (me) {},
    dblClick: function (evt, cell) {},
    tapAndHold: function (me) {},

    scrollPointToVisible: function (x, y, extend, border) {},
    createPanningManager: function () {},
    getBorderSizes: function () {},
    getPreferredPageSize: function (bounds, width, height) {},
    sizeDidChange: function () {
        var bounds = this.getGraphBounds();

        if (this.container) {
            var border = this.getBorder();

            var width = Math.max(0, bounds.x + bounds.width + 1 + border);
            var height = Math.max(0, bounds.y + bounds.height + 1 + border);

            if (this.minimumContainerSize) {
                width = Math.max(width, this.minimumContainerSize.width);
                height = Math.max(height, this.minimumContainerSize.height);
            }

            if (this.resizeContainer) {
                this.doResizeContainer(width, height);
            }

            //if (this.preferPageSize || (!detector.IS_IE && this.pageVisible)) {
            if (this.preferPageSize || this.pageVisible) {
                var size = this.getPreferredPageSize(bounds, width, height);

                if (size != null) {
                    width = size.width;
                    height = size.height;
                }
            }

            if (this.minimumGraphSize != null) {
                width = Math.max(width, this.minimumGraphSize.width * this.view.scale);
                height = Math.max(height, this.minimumGraphSize.height * this.view.scale);
            }

            width = Math.ceil(width - 1);
            height = Math.ceil(height - 1);

            //if (this.dialect == mxConstants.DIALECT_SVG) {
            var root = this.view.getDrawPane().ownerSVGElement;

            root.style.minWidth = Math.max(1, width) + 'px';
            root.style.minHeight = Math.max(1, height) + 'px';
            root.style.width = '100%';
            root.style.height = '100%';
            //}
            //else {
            //    if (detector.IS_QUIRKS) {
            // Quirks mode has no minWidth/minHeight support
            //this.view.updateHtmlCanvasSize(Math.max(1, width), Math.max(1, height));
            //}
            //else {
            //    this.view.canvas.style.minWidth = Math.max(1, width) + 'px';
            //    this.view.canvas.style.minHeight = Math.max(1, height) + 'px';
            //}
            //}

            return;

            this.updatePageBreaks(this.pageBreaksVisible, width - 1, height - 1);
        }

        //this.fireEvent(new mxEventObject(domEvent.SIZE, 'bounds', bounds));
    },
    doResizeContainer: function (width, height) {
        // Fixes container size for different box models
        //if (detector.IS_IE) {
        //    if (detector.IS_QUIRKS) {
        //        var borders = this.getBorderSizes();
        //
        //        // max(2, ...) required for native IE8 in quirks mode
        //        width += Math.max(2, borders.x + borders.width + 1);
        //        height += Math.max(2, borders.y + borders.height + 1);
        //    }
        //    else if (document.documentMode >= 9) {
        //        width += 3;
        //        height += 5;
        //    }
        //    else {
        //        width += 1;
        //        height += 1;
        //    }
        //}
        //else {
        height += 1;
        //}

        if (this.maximumContainerSize != null) {
            width = Math.min(this.maximumContainerSize.width, width);
            height = Math.min(this.maximumContainerSize.height, height);
        }

        this.container.style.width = Math.ceil(width) + 'px';
        this.container.style.height = Math.ceil(height) + 'px';
    },
    updatePageBreaks: function (visible, width, height) {
        var scale = this.view.scale;
        var tr = this.view.translate;
        var fmt = this.pageFormat;
        var ps = scale * this.pageScale;
        var bounds = new Rectangle(scale * tr.x, scale * tr.y, fmt.width * ps, fmt.height * ps);

        // Does not show page breaks if the scale is too small
        visible = visible && Math.min(bounds.width, bounds.height) > this.minPageBreakDist;

        // Draws page breaks independent of translate. To ignore
        // the translate set bounds.x/y = 0. Note that modulo
        // in JavaScript has a bug, so use utils instead.
        bounds.x = utils.mod(bounds.x, bounds.width);
        bounds.y = utils.mod(bounds.y, bounds.height);

        var horizontalCount = (visible) ? Math.ceil((width - bounds.x) / bounds.width) : 0;
        var verticalCount = (visible) ? Math.ceil((height - bounds.y) / bounds.height) : 0;
        var right = width;
        var bottom = height;

        if (this.horizontalPageBreaks == null && horizontalCount > 0) {
            this.horizontalPageBreaks = [];
        }

        if (this.horizontalPageBreaks != null) {
            for (var i = 0; i <= horizontalCount; i++) {
                var pts = [new mxPoint(bounds.x + i * bounds.width, 1),
                    new mxPoint(bounds.x + i * bounds.width, bottom)];

                if (this.horizontalPageBreaks[i] != null) {
                    this.horizontalPageBreaks[i].points = pts;
                    this.horizontalPageBreaks[i].redraw();
                }
                else {
                    var pageBreak = new mxPolyline(pts, this.pageBreakColor);
                    pageBreak.dialect = this.dialect;
                    pageBreak.pointerEvents = false;
                    pageBreak.isDashed = this.pageBreakDashed;
                    pageBreak.init(this.view.backgroundPane);
                    pageBreak.redraw();

                    this.horizontalPageBreaks[i] = pageBreak;
                }
            }

            for (var i = horizontalCount; i < this.horizontalPageBreaks.length; i++) {
                this.horizontalPageBreaks[i].destroy();
            }

            this.horizontalPageBreaks.splice(horizontalCount, this.horizontalPageBreaks.length - horizontalCount);
        }

        if (this.verticalPageBreaks == null && verticalCount > 0) {
            this.verticalPageBreaks = [];
        }

        if (this.verticalPageBreaks != null) {
            for (var i = 0; i <= verticalCount; i++) {
                var pts = [new Point(1, bounds.y + i * bounds.height),
                    new Point(right, bounds.y + i * bounds.height)];

                if (this.verticalPageBreaks[i] != null) {
                    this.verticalPageBreaks[i].points = pts;
                    this.verticalPageBreaks[i].redraw();
                }
                else {
                    var pageBreak = new mxPolyline(pts, this.pageBreakColor);
                    pageBreak.dialect = this.dialect;
                    pageBreak.pointerEvents = false;
                    pageBreak.isDashed = this.pageBreakDashed;
                    pageBreak.init(this.view.backgroundPane);
                    pageBreak.redraw();

                    this.verticalPageBreaks[i] = pageBreak;
                }
            }

            for (var i = verticalCount; i < this.verticalPageBreaks.length; i++) {
                this.verticalPageBreaks[i].destroy();
            }

            this.verticalPageBreaks.splice(verticalCount, this.verticalPageBreaks.length - verticalCount);
        }
    },


    // Cell styles
    // -----------
    getCellStyle: function (cell) {
        var stylename = this.model.getStyle(cell);
        var style = null;

        // Gets the default style for the cell
        if (this.model.isEdge(cell)) {
            style = this.stylesheet.getDefaultEdgeStyle();
        }
        else {
            style = this.stylesheet.getDefaultVertexStyle();
        }

        // Resolves the stylename using the above as the default
        if (stylename != null) {
            style = this.postProcessCellStyle(this.stylesheet.getCellStyle(stylename, style));
        }

        // Returns a non-null value if no style can be found
        if (style == null) {
            style = [];//mxGraph.prototype.EMPTY_ARRAY;
        }

        return style;
    },
    postProcessCellStyle: function (style) {
        if (style != null) {
            var key = style[constants.STYLE_IMAGE];
            var image = this.getImageFromBundles(key);

            if (image != null) {
                style[constants.STYLE_IMAGE] = image;
            }
            else {
                image = key;
            }

            // Converts short data uris to normal data uris
            if (image != null && image.substring(0, 11) == 'data:image/') {
                if (image.substring(0, 20) == 'data:image/svg+xml,<') {
                    // Required for FF and IE11
                    image = image.substring(0, 19) + encodeURIComponent(image.substring(19));
                }
                else if (image.substring(0, 22) != 'data:image/svg+xml,%3C') {
                    var comma = image.indexOf(',');

                    if (comma > 0) {
                        image = image.substring(0, comma) + ';base64,'
                            + image.substring(comma + 1);
                    }
                }

                style[constants.STYLE_IMAGE] = image;
            }
        }
        return style;
    },
    setCellStyle: function (style, cells) {
        cells = cells || this.getSelectionCells();

        if (cells) {
            this.model.beginUpdate();
            try {
                for (var i = 0; i < cells.length; i++) {
                    this.model.setStyle(cells[i], style);
                }
            }
            finally {
                this.model.endUpdate();
            }
        }
    },
    setCellStyles: function (key, value, cells) {
        cells = cells || this.getSelectionCells();
        utils.setCellStyles(this.model, cells, key, value);
    },
    toggleCellStyle: function (key, defaultValue, cell) {},
    toggleCellStyles: function (key, defaultValue, cells) {},
    toggleCellStyleFlags: function (key, flag, cells) {},
    setCellStyleFlags: function (key, flag, value, cells) {},


    // Cell alignment and orientation
    // ------------------------------
    alignCells: function (align, cells, param) {},
    flipEdge: function (edge) {},
    addImageBundle: function (bundle) {},
    removeImageBundle: function (bundle) {},
    getImageFromBundles: function (key) {},


    // Order
    // -----
    orderCells: function (back, cells) {},
    cellsOrdered: function (cells, back) {},


    // Grouping
    // --------
    groupCells: function (group, border, cells) {},
    getCellsForGroup: function (cells) {},
    getBoundsForGroup: function (group, children, border) {},
    createGroupCell: function (cells) {},
    ungroupCells: function (cells) {},
    removeCellsFromParent: function (cells) {},
    updateGroupBounds: function (cells, border, moveGroup, topBorder, rightBorder, bottomBorder, leftBorder) {},


    // Cell cloning, insertion and removal
    // -----------------------------------
    cloneCells: function (cells, allowInvalidEdges) {},
    insertVertex: function (parent, id, value, x, y, width, height, style, relative) {
        var graph = this;
        var vertex = graph.createVertex(parent, id, value, x, y, width, height, style, relative);
        return graph.addCell(vertex, parent);
    },
    createVertex: function (parent, id, value, x, y, width, height, style, relative) {
        var geometry = new Geometry(x, y, width, height);
        geometry.relative = !isNullOrUndefined(relative) ? relative : false;

        // Creates the vertex
        var vertex = new Cell(value, geometry, style);
        vertex.setId(id);
        vertex.setVertex(true);
        vertex.setConnectable(true);

        return vertex;
    },
    insertEdge: function (parent, id, value, source, target, style) {
        var edge = this.createEdge(parent, id, value, source, target, style);

        return this.addEdge(edge, parent, source, target);
    },
    createEdge: function (parent, id, value, source, target, style) {
        var geometry = new Geometry();
        geometry.relative = true;

        var edge = new Cell(value, geometry, style);
        edge.setId(id);
        edge.setEdge(true);

        return edge;
    },
    addEdge: function (edge, parent, source, target, index) {
        return this.addCell(edge, parent, index, source, target);
    },
    addCell: function (cell, parent, index, source, target) {
        return this.addCells([cell], parent, index, source, target)[0];
    },
    addCells: function (cells, parent, index, source, target) {
        parent = parent || this.getDefaultParent();
        index = !isNullOrUndefined(index) ? index : this.model.getChildCount(parent);

        this.model.beginUpdate();
        try {
            this.cellsAdded(cells, parent, index, source, target, false, true);

            //this.fireEvent(new mxEventObject(domEvent.ADD_CELLS, 'cells', cells,
            //    'parent', parent, 'index', index, 'source', source, 'target', target));

            this.emit(new EventObject('addCells', {
                cells: cells,
                parent: parent,
                index: index,
                source: source,
                target: target
            }));
        }
        finally {
            this.model.endUpdate();
        }

        return cells;
    },
    cellsAdded: function (cells, parent, index, source, target, absolute, constrain) {
        if (cells && parent && !isNullOrUndefined(index)) {
            this.model.beginUpdate();
            try {
                var parentState = absolute ? this.view.getState(parent) : null;
                var o1 = parentState ? parentState.origin : null;
                var zero = new Point(0, 0);

                for (var i = 0; i < cells.length; i++) {
                    if (!cells[i]) {
                        index--;
                    } else {
                        var previous = this.model.getParent(cells[i]);

                        // Keeps the cell at its absolute location
                        if (o1 && cells[i] !== parent && parent !== previous) {
                            var oldState = this.view.getState(previous);
                            var o2 = oldState ? oldState.origin : zero;
                            var geo = this.model.getGeometry(cells[i]);

                            if (geo) {
                                var dx = o2.x - o1.x;
                                var dy = o2.y - o1.y;

                                // FIXME: Cells should always be inserted first before any other edit
                                // to avoid forward references in sessions.
                                geo = geo.clone();
                                geo.translate(dx, dy);

                                if (!geo.relative && this.model.isVertex(cells[i]) && !this.isAllowNegativeCoordinates()) {
                                    geo.x = Math.max(0, geo.x);
                                    geo.y = Math.max(0, geo.y);
                                }

                                this.model.setGeometry(cells[i], geo);
                            }
                        }

                        // Decrements all following indices
                        // if cell is already in parent
                        if (parent === previous && index + i > this.model.getChildCount(parent)) {
                            index--;
                        }

                        this.model.add(parent, cells[i], index + i);

                        if (this.autoSizeCellsOnAdd) {
                            this.autoSizeCell(cells[i], true);
                        }

                        // Extends the parent or constrains the child
                        if (this.isExtendParentsOnAdd() && this.isExtendParent(cells[i])) {
                            this.extendParent(cells[i]);
                        }

                        // Additionally constrains the child after extending the parent
                        if (constrain == null || constrain) {
                            this.constrainChild(cells[i]);
                        }

                        // Sets the source terminal
                        if (source != null) {
                            this.cellConnected(cells[i], source, true);
                        }

                        // Sets the target terminal
                        if (target != null) {
                            this.cellConnected(cells[i], target, false);
                        }
                    }
                }

                //this.fireEvent(new mxEventObject(domEvent.CELLS_ADDED, 'cells', cells,
                //    'parent', parent, 'index', index, 'source', source, 'target', target,
                //    'absolute', absolute));

                this.emit(new EventObject('cellsAdded', {
                    cells: cells,
                    parent: parent,
                    index: index,
                    source: source,
                    target: target,
                    absolute: absolute
                }));
            }
            finally {
                this.model.endUpdate();
            }
        }
    },
    autoSizeCell: function (cell, recurse) {},
    removeCells: function (cells, includeEdges) {},
    cellsRemoved: function (cells) {},
    splitEdge: function (edge, cells, newEdge, dx, dy) {},


    // Cell visibility
    // ---------------
    toggleCells: function (show, cells, includeEdges) {},
    cellsToggled: function (cells, show) {},


    // Folding
    // -------
    foldCells: function () {},
    cellsFolded: function () {},
    swapBounds: function () {},
    updateAlternateBounds: function () {},
    addAllEdges: function () {},
    getAllEdges: function () {},


    // Cell sizing
    // -----------
    updateCellSize: function () {},
    cellSizeUpdated: function () {},
    getPreferredSizeForCell: function () {},
    resizeCell: function () {},
    resizeCells: function () {},
    cellsResized: function () {},
    cellResized: function () {},
    resizeChildCells: function () {},
    constrainChildCells: function () {},
    scaleCell: function () {},
    extendParent: function () {},


    // Cell moving
    // -----------
    importCells: function () {},
    moveCells: function () {},
    cellsMoved: function () {},
    translateCell: function () {},
    getCellContainmentArea: function () {},
    getMaximumGraphBounds: function () {},
    constrainChild: function () {},
    resetEdges: function () {},
    resetEdge: function (edge) {
        var geo = this.model.getGeometry(edge);

        // Resets the control points
        if (geo != null && geo.points != null && geo.points.length > 0) {
            geo = geo.clone();
            geo.points = [];
            this.model.setGeometry(edge, geo);
        }

        return edge;
    },


    // Cell connecting and connection constraints
    // ------------------------------------------
    getOutlineConstraint: function () {},
    getAllConnectionConstraints: function () {},

    getConnectionConstraint: function (linkState, terminalState, isSource) {
        var point = null;
        var x = linkState.style[(isSource) ? constants.STYLE_EXIT_X : constants.STYLE_ENTRY_X];

        if (x != null) {
            var y = linkState.style[(isSource) ? constants.STYLE_EXIT_Y : constants.STYLE_ENTRY_Y];

            if (y != null) {
                point = new Point(parseFloat(x), parseFloat(y));
            }
        }

        var perimeter = false;

        if (point != null) {
            perimeter = getValue(linkState.style, (isSource)
                ? constants.STYLE_EXIT_PERIMETER
                : constants.STYLE_ENTRY_PERIMETER, true);
        }

        return new ConnectionConstraint(point, perimeter);
    },
    setConnectionConstraint: function (edge, terminal, source, constraint) {
        if (constraint) {
            this.model.beginUpdate();

            try {
                if (constraint == null || constraint.point == null) {
                    this.setCellStyles((source) ? constants.STYLE_EXIT_X :
                        constants.STYLE_ENTRY_X, null, [edge]);
                    this.setCellStyles((source) ? constants.STYLE_EXIT_Y :
                        constants.STYLE_ENTRY_Y, null, [edge]);
                    this.setCellStyles((source) ? constants.STYLE_EXIT_PERIMETER :
                        constants.STYLE_ENTRY_PERIMETER, null, [edge]);
                }
                else if (constraint.point != null) {
                    this.setCellStyles((source) ? constants.STYLE_EXIT_X :
                        constants.STYLE_ENTRY_X, constraint.point.x, [edge]);
                    this.setCellStyles((source) ? constants.STYLE_EXIT_Y :
                        constants.STYLE_ENTRY_Y, constraint.point.y, [edge]);

                    // Only writes 0 since 1 is default
                    if (!constraint.perimeter) {
                        this.setCellStyles((source) ? constants.STYLE_EXIT_PERIMETER :
                            constants.STYLE_ENTRY_PERIMETER, '0', [edge]);
                    }
                    else {
                        this.setCellStyles((source) ? constants.STYLE_EXIT_PERIMETER :
                            constants.STYLE_ENTRY_PERIMETER, null, [edge]);
                    }
                }
            }
            finally {
                this.model.endUpdate();
            }
        }
    },
    getConnectionPoint: function (vertex, constraint) {
        var point = null;

        if (vertex != null && constraint.point != null) {
            var bounds = this.view.getPerimeterBounds(vertex);
            var cx = new Point(bounds.getCenterX(), bounds.getCenterY());
            var direction = vertex.style[constants.STYLE_DIRECTION];
            var r1 = 0;

            // Bounds need to be rotated by 90 degrees for further computation
            if (direction != null) {
                if (direction == mxConstants.DIRECTION_NORTH) {
                    r1 += 270;
                }
                else if (direction == mxConstants.DIRECTION_WEST) {
                    r1 += 180;
                }
                else if (direction == mxConstants.DIRECTION_SOUTH) {
                    r1 += 90;
                }

                // Bounds need to be rotated by 90 degrees for further computation
                if (direction == mxConstants.DIRECTION_NORTH || direction == mxConstants.DIRECTION_SOUTH) {
                    bounds.rotate90();
                }
            }

            if (constraint.point != null) {
                var sx = 1;
                var sy = 1;
                var dx = 0;
                var dy = 0;

                // LATER: Add flipping support for image shapes
                if (this.getModel().isVertex(vertex.cell)) {
                    var flipH = vertex.style[mxConstants.STYLE_FLIPH];
                    var flipV = vertex.style[mxConstants.STYLE_FLIPV];

                    // Legacy support for stencilFlipH/V
                    if (vertex.shape != null && vertex.shape.stencil != null) {
                        flipH = utils.getValue(vertex.style, 'stencilFlipH', 0) == 1 || flipH;
                        flipV = utils.getValue(vertex.style, 'stencilFlipV', 0) == 1 || flipV;
                    }

                    if (direction == mxConstants.DIRECTION_NORTH || direction == mxConstants.DIRECTION_SOUTH) {
                        var tmp = flipH;
                        flipH = flipV;
                        flipV = tmp;
                    }

                    if (flipH) {
                        sx = -1;
                        dx = -bounds.width;
                    }

                    if (flipV) {
                        sy = -1;
                        dy = -bounds.height;
                    }
                }

                point = new mxPoint(bounds.x + constraint.point.x * bounds.width * sx - dx,
                    bounds.y + constraint.point.y * bounds.height * sy - dy);
            }

            // Rotation for direction before projection on perimeter
            var r2 = vertex.style[mxConstants.STYLE_ROTATION] || 0;

            if (constraint.perimeter) {
                if (r1 != 0 && point != null) {
                    // Only 90 degrees steps possible here so no trig needed
                    var cos = 0;
                    var sin = 0;

                    if (r1 == 90) {
                        sin = 1;
                    }
                    else if (r1 == 180) {
                        cos = -1;
                    }
                    else if (r1 == 270) {
                        sin = -1;
                    }

                    point = Point.getRotatedPoint(point, cos, sin, cx);
                }

                if (point != null && constraint.perimeter) {
                    point = this.view.getPerimeterPoint(vertex, point, false);
                }
            }
            else {
                r2 += r1;
            }

            // Generic rotation after projection on perimeter
            if (r2 != 0 && point != null) {
                var rad = utils.toRadians(r2);
                var cos = Math.cos(rad);
                var sin = Math.sin(rad);

                point = Point.getRotatedPoint(point, cos, sin, cx);
            }
        }

        if (point != null) {
            point.x = Math.round(point.x);
            point.y = Math.round(point.y);
        }

        return point;
    },
    connectCell: function () {},
    cellConnected: function (edge, terminal, source, constraint) {
        if (edge) {
            this.model.beginUpdate();
            try {
                var previous = this.model.getTerminal(edge, source);

                // Updates the constraint
                this.setConnectionConstraint(edge, terminal, source, constraint);

                // Checks if the new terminal is a port, uses the ID of the port in the
                // style and the parent of the port as the actual terminal of the edge.
                if (this.isPortsEnabled()) {
                    var id = null;

                    if (this.isPort(terminal)) {
                        id = terminal.getId();
                        terminal = this.getTerminalForPort(terminal, source);
                    }

                    // Sets or resets all previous information for connecting to a child port
                    var key = source ? constants.STYLE_SOURCE_PORT : constants.STYLE_TARGET_PORT;
                    this.setCellStyles(key, id, [edge]);
                }

                this.model.setTerminal(edge, terminal, source);

                if (this.resetEdgesOnConnect) {
                    this.resetEdge(edge);
                }

                //this.fireEvent(new mxEventObject(domEvent.CELL_CONNECTED,
                //    'edge', edge, 'terminal', terminal, 'source', source,
                //    'previous', previous));
            }
            finally {
                this.model.endUpdate();
            }
        }
    },
    disconnectGraph: function () {},


    // Drilldown
    // ---------
    getCurrentRoot: function () {
        return this.view.currentRoot;
    },
    getTranslateForRoot: function () {},
    isPort: function (cell) {
        return false;
    },
    getTerminalForPort: function (cell, source) {
        return this.model.getParent(cell);
    },
    getChildOffsetForCell: function (cell) {
        return null;
    },
    enterGroup: function () {},
    exitGroup: function () {},
    home: function () {},
    isValidRoot: function () {},


    // Graph display
    // -------------
    getGraphBounds: function () {
        return this.view.getGraphBounds();
    },
    getCellBounds: function () {},
    getBoundingBoxFromGeometry: function () {},
    refresh: function () {},
    snap: function () {},
    panGraph: function () {},
    zoomIn: function () {},
    zoomOut: function () {},
    zoomActual: function () {},
    zoomTo: function () {},
    center: function () {},
    zoom: function () {},
    zoomToRect: function () {},
    fit: function () {},
    scrollCellToVisible: function () {},
    scrollRectToVisible: function () {},
    getCellGeometry: function (cell) {
        return this.model.getGeometry(cell);
    },
    isCellVisible: function (cell) {
        return this.model.isVisible(cell);
    },
    isCellCollapsed: function (cell) {
        return this.model.isCollapsed(cell);
    },
    isCellConnectable: function () {},

    isOrthogonal: function (edge) {
        var orthogonal = edge.style[constants.STYLE_ORTHOGONAL];

        if (orthogonal != null) {
            return orthogonal;
        }

        var tmp = this.view.getEdgeStyle(edge);

        return tmp == edgeStyle.SegmentConnector ||
            tmp == edgeStyle.ElbowConnector ||
            tmp == edgeStyle.SideToSide ||
            tmp == edgeStyle.TopToBottom ||
            tmp == edgeStyle.EntityRelation ||
            tmp == edgeStyle.OrthConnector;
    },
    isLoop: function () {},
    isCloneEvent: function () {},
    isToggleEvent: function () {},
    isGridEnabledEvent: function () {},
    isConstrainedEvent: function () {},


    // Validation
    // ----------

    validationAlert: function () {},
    isEdgeValid: function () {},
    getEdgeValidationError: function () {},
    validateEdge: function () {},
    validateGraph: function () {},
    getCellValidationError: function () {},
    validateCell: function () {},


    // Graph appearance
    // ----------------
    getBackgroundImage: function () {},
    setBackgroundImage: function () {},
    getFoldingImage: function () {},
    convertValueToString: function (cell) {
        var value = this.model.getValue(cell);

        if (value) {
            if (utils.isNode(value)) {
                return value.nodeName;
            } else if (utils.isFunction(value.toString)) {
                return value.toString();
            }
        }

        return '';
    },
    getLabel: function (cell) {
        var result = '';

        if (this.labelsVisible && cell) {
            var state = this.view.getState(cell);
            var style = (state) ? state.style : this.getCellStyle(cell);

            if (!utils.getValue(style, constants.STYLE_NOLABEL, false)) {
                result = this.convertValueToString(cell);
            }
        }

        return result;
    },
    isHtmlLabel: function () {
        return this.isHtmlLabels();
    },
    isHtmlLabels: function () {
        return this.htmlLabels;
    },
    setHtmlLabels: function () {},
    isWrapping: function (cell) {
        var state = this.view.getState(cell);
        var style = (state) ? state.style : this.getCellStyle(cell);

        return (style) ? style[constants.STYLE_WHITE_SPACE] == 'wrap' : false;
    },
    isLabelClipped: function (cell) {
        var state = this.view.getState(cell);
        var style = (state) ? state.style : this.getCellStyle(cell);

        return (style) ? style[constants.STYLE_OVERFLOW] == 'hidden' : false;
    },
    getTooltip: function () {},
    getTooltipForCell: function () {},
    getCursorForMouseEvent: function () {},
    getCursorForCell: function () {},
    getStartSize: function () {},
    getImage: function (state) {
        return (state && state.style) ? state.style[constants.STYLE_IMAGE] : null;
    },
    getVerticalAlign: function (state) {
        return state && state.style
            ? (state.style[constants.STYLE_VERTICAL_ALIGN] || constants.ALIGN_MIDDLE ) :
            null;
    },
    getIndicatorColor: function (state) {
        return (state && state.style) ? state.style[constants.STYLE_INDICATOR_COLOR] : null;
    },
    getIndicatorGradientColor: function (state) {
        return (state && state.style) ? state.style[constants.STYLE_INDICATOR_GRADIENTCOLOR] : null;
    },
    getIndicatorShape: function (state) {
        return (state && state.style) ? state.style[constants.STYLE_INDICATOR_SHAPE] : null;

    },
    getIndicatorImage: function (state) {
        return (state && state.style) ? state.style[constants.STYLE_INDICATOR_IMAGE] : null;
    },
    getBorder: function () {
        return this.border;
    },
    setBorder: function () {},
    isSwimlane: function () {},


    // Graph behaviour
    // ---------------
    isResizeContainer: function () {},
    setResizeContainer: function () {},

    isEnabled: function () {
        return this.enabled;
    },

    setEnabled: function (value) {
        this.enabled = value;
    },

    isEscapeEnabled: function () {},
    setEscapeEnabled: function () {},
    isInvokesStopCellEditing: function () {},
    setInvokesStopCellEditing: function () {},
    isEnterStopsCellEditing: function () {},
    setEnterStopsCellEditing: function () {},
    isCellLocked: function () {},
    isCellsLocked: function () {},
    setCellsLocked: function () {},
    getCloneableCells: function () {},
    isCellCloneable: function () {},
    isCellsCloneable: function () {},
    setCellsCloneable: function () {},
    getExportableCells: function () {},
    canExportCell: function () {},
    getImportableCells: function () {},
    canImportCell: function () {},
    isCellSelectable: function () {},
    isCellsSelectable: function () {},
    setCellsSelectable: function () {},
    getDeletableCells: function () {},
    isCellDeletable: function () {},
    isCellsDeletable: function () {},
    setCellsDeletable: function () {},
    isLabelMovable: function () {},
    isCellRotatable: function () {},
    getMovableCells: function () {},
    isCellMovable: function () {},
    isCellsMovable: function () {},
    setCellsMovable: function () {},
    isGridEnabled: function () {},
    setGridEnabled: function () {},
    isPortsEnabled: function () {
        return this.portsEnabled;
    },
    setPortsEnabled: function (value) {
        this.portsEnabled = value;
    },
    getGridSize: function () {},
    setGridSize: function () {},
    getTolerance: function () {},
    setTolerance: function () {},
    isVertexLabelsMovable: function () {},
    setVertexLabelsMovable: function () {},
    isEdgeLabelsMovable: function () {},
    setEdgeLabelsMovable: function () {},
    isSwimlaneNesting: function () {},
    setSwimlaneNesting: function () {},
    isSwimlaneSelectionEnabled: function () {},
    setSwimlaneSelectionEnabled: function () {},
    isMultigraph: function () {},
    setMultigraph: function () {},
    isAllowLoops: function () {},
    setAllowDanglingEdges: function () {},
    isAllowDanglingEdges: function () {},
    setConnectableEdges: function () {},
    isConnectableEdges: function () {},
    setCloneInvalidEdges: function () {},
    isCloneInvalidEdges: function () {},
    setAllowLoops: function () {},
    isDisconnectOnMove: function () {},
    setDisconnectOnMove: function () {},
    isDropEnabled: function () {},
    setDropEnabled: function () {},
    isSplitEnabled: function () {},
    setSplitEnabled: function () {},
    isCellResizable: function () {},
    isCellsResizable: function () {},
    setCellsResizable: function () {},
    isTerminalPointMovable: function () {},
    isCellBendable: function () {},
    isCellsBendable: function () {},
    setCellsBendable: function () {},
    isCellEditable: function () {},
    isCellsEditable: function () {},
    setCellsEditable: function () {},
    isCellDisconnectable: function () {},
    isCellsDisconnectable: function () {},
    setCellsDisconnectable: function () {},
    isValidSource: function () {},
    isValidTarget: function () {},
    isValidConnection: function () {},
    setConnectable: function (connectable) {
        this.connectionHandler.setEnabled(connectable);
    },
    isConnectable: function () {
        return this.connectionHandler.isEnabled();
    },
    setTooltips: function () {},
    setPanning: function () {},

    isEditing: function (cell) {
        if (this.cellEditor != null) {
            var editingCell = this.cellEditor.getEditingCell();

            return (cell == null) ? editingCell != null : cell == editingCell;
        }

        return false;
    },

    isAutoSizeCell: function () {},
    isAutoSizeCells: function () {},
    setAutoSizeCells: function () {},
    isExtendParent: function () {},
    isExtendParents: function () {},
    setExtendParents: function () {},
    isExtendParentsOnAdd: function () {},
    setExtendParentsOnAdd: function () {},
    isExtendParentsOnMove: function () {},
    setExtendParentsOnMove: function () {},
    isRecursiveResize: function () {},
    setRecursiveResize: function () {},
    isConstrainChild: function () {},
    isConstrainChildren: function () {},
    setConstrainChildren: function () {},
    setConstrainChildrenOnResize: function () {},
    isConstrainChildrenOnResize: function () {},
    isAllowNegativeCoordinates: function () {},
    setAllowNegativeCoordinates: function () {},
    getOverlap: function () {},
    isAllowOverlapParent: function () {},
    getFoldableCells: function () {},
    isCellFoldable: function () {},
    isValidDropTarget: function () {},
    isSplitTarget: function () {},
    getDropTarget: function () {},


    // Cell retrieval
    // ---------------
    getDefaultParent: function () {
        var parent = this.getCurrentRoot() || this.defaultParent;

        if (!parent) {
            var root = this.model.getRoot();
            parent = this.model.getChildAt(root, 0);
        }

        return parent;
    },
    setDefaultParent: function () {},
    getSwimlane: function () {},
    getSwimlaneAt: function () {},
    getCellAt: function (x, y, parent, vertices, edges) {
        vertices = (vertices != null) ? vertices : true;
        edges = (edges != null) ? edges : true;

        if (parent == null) {
            parent = this.getCurrentRoot();

            if (parent == null) {
                parent = this.getModel().getRoot();
            }
        }

        if (parent != null) {
            var childCount = this.model.getChildCount(parent);

            for (var i = childCount - 1; i >= 0; i--) {
                var cell = this.model.getChildAt(parent, i);
                var result = this.getCellAt(x, y, cell, vertices, edges);

                if (result != null) {
                    return result;
                }
                else if (this.isCellVisible(cell) && (edges && this.model.isEdge(cell) ||
                    vertices && this.model.isVertex(cell))) {
                    var state = this.view.getState(cell);

                    if (this.intersects(state, x, y)) {
                        return cell;
                    }
                }
            }
        }

        return null;
    },
    intersects: function () {},
    hitsSwimlaneContent: function () {},
    getChildVertices: function () {},
    getChildEdges: function () {},
    getChildCells: function () {},
    getConnections: function () {},
    getIncomingEdges: function () {},
    getOutgoingEdges: function () {},
    getEdges: function () {},
    isValidAncestor: function () {},
    getOpposites: function () {},
    getEdgesBetween: function () {},
    getPointForEvent: function () {},
    getCells: function () {},
    getCellsBeyond: function () {},
    findTreeRoots: function () {},
    traverse: function () {},


    // Selection
    // ---------
    isCellSelected: function () {},
    isSelectionEmpty: function () {},
    clearSelection: function () {},
    getSelectionCount: function () {},
    getSelectionCell: function () {},
    getSelectionCells: function () {},
    setSelectionCell: function () {},
    setSelectionCells: function () {},
    addSelectionCell: function () {},
    addSelectionCells: function () {},
    removeSelectionCell: function () {},
    removeSelectionCells: function () {},
    selectRegion: function () {},
    selectNextCell: function () {},
    selectPreviousCell: function () {},
    selectParentCell: function () {},
    selectChildCell: function () {},
    selectCell: function () {},
    selectAll: function () {},
    selectVertices: function () {},
    selectEdges: function () {},
    selectCells: function () {},
    selectCellForEvent: function () {},
    selectCellsForEvent: function () {},

    // Selection state
    // ---------------
    createHandler: function () {},
    createVertexHandler: function () {},
    createEdgeHandler: function () {},
    createEdgeSegmentHandler: function () {},
    createElbowEdgeHandler: function () {},


    // Graph events
    // ------------
    addMouseListener: function (listener) {
        if (this.mouseListeners == null) {
            this.mouseListeners = [];
        }
        this.mouseListeners.push(listener);
    },

    removeMouseListener: function (listener) {
        if (this.mouseListeners != null) {
            for (var i = 0; i < this.mouseListeners.length; i++) {
                if (this.mouseListeners[i] == listener) {
                    this.mouseListeners.splice(i, 1);
                    break;
                }
            }
        }
    },

    updateMouseEvent: function (me) {
        if (me.graphX == null || me.graphY == null) {
            var pt = Point.convertPoint(this.container, me.getX(), me.getY());

            me.graphX = pt.left - this.panDx;
            me.graphY = pt.top - this.panDy;
        }

        return me;
    },

    getStateForTouchEvent: function (evt) {
        var x = domEvent.getClientX(evt);
        var y = domEvent.getClientY(evt);

        // Dispatches the drop event to the graph which
        // consumes and executes the source function
        var pt = Point.convertPoint(this.container, x, y);

        return this.view.getState(this.getCellAt(pt.x, pt.y));
    },

    isEventIgnored: function (evtName, me, sender) {
        var mouseEvent = domEvent.isMouseEvent(me.getEvent());
        var result = this.isEditing();

        if (me.getEvent() == this.lastEvent) {
            result = true;
        }
        else {
            this.lastEvent = me.getEvent();
        }

        if (this.eventSource != null && evtName != domEvent.MOUSE_MOVE) {
            domEvent.offGesture(this.eventSource, null, this.mouseMoveRedirect, this.mouseUpRedirect);
            this.mouseMoveRedirect = null;
            this.mouseUpRedirect = null;
            this.eventSource = null;
        }
        else if (this.eventSource != null && me.getSource() != this.eventSource) {
            result = true;
        }
        else if (detector.IS_TOUCH && evtName == domEvent.MOUSE_DOWN && !mouseEvent) {
            this.eventSource = me.getSource();

            this.mouseMoveRedirect = utils.bind(this, function (evt) {
                this.fireMouseEvent(mxEvent.MOUSE_MOVE, new MouseEvent(evt, this.getStateForTouchEvent(evt)));
            });
            this.mouseUpRedirect = mxUtils.bind(this, function (evt) {
                this.fireMouseEvent(mxEvent.MOUSE_UP, new mxMouseEvent(evt, this.getStateForTouchEvent(evt)));
            });

            mxEvent.onGesture(this.eventSource, null, this.mouseMoveRedirect, this.mouseUpRedirect);
        }

        // Factored out the workarounds for FF to make it easier to override/remove
        // Note this method has side-effects!
        if (this.isSyntheticEventIgnored(evtName, me, sender)) {
            result = true;
        }

        // Never fires mouseUp/-Down for double clicks
        if (!domEvent.isPopupTrigger(this.lastEvent) && evtName != domEvent.MOUSE_MOVE && this.lastEvent.detail == 2) {
            return true;
        }

        // Filters out of sequence events or mixed event types during a gesture
        if (evtName == domEvent.MOUSE_UP && this.isMouseDown) {
            this.isMouseDown = false;
        }
        else if (evtName == domEvent.MOUSE_DOWN && !this.isMouseDown) {
            this.isMouseDown = true;
            this.isMouseTrigger = mouseEvent;
        }
        // Drops mouse events that are fired during touch gestures as a workaround for Webkit
        // and mouse events that are not in sync with the current internal button state
        else if (!result && (((!detector.IS_FF || evtName != domEvent.MOUSE_MOVE) &&
            this.isMouseDown && this.isMouseTrigger != mouseEvent) ||
            (evtName == domEvent.MOUSE_DOWN && this.isMouseDown) ||
            (evtName == domEvent.MOUSE_UP && !this.isMouseDown))) {
            result = true;
        }

        if (!result && evtName == domEvent.MOUSE_DOWN) {
            this.lastMouseX = me.getX();
            this.lastMouseY = me.getY();
        }

        return result;
    },

    isSyntheticEventIgnored: function (evtName, me, sender) {
        var result = false;
        var mouseEvent = domEvent.isMouseEvent(me.getEvent());

        if (this.ignoreMouseEvents && mouseEvent && evtName != domEvent.MOUSE_MOVE) {
            this.ignoreMouseEvents = evtName != domEvent.MOUSE_UP;
            result = true;
        }
        else if (detector.IS_FF && !mouseEvent && evtName == domEvent.MOUSE_UP) {
            this.ignoreMouseEvents = true;
        }

        return result;
    },
    isEventSourceIgnored: function (evtName, me) {
        var source = me.getSource();
        var name = (source.nodeName != null) ? source.nodeName.toLowerCase() : '';
        var candidate = !domEvent.isMouseEvent(me.getEvent()) || domEvent.isLeftMouseButton(me.getEvent());

        return evtName == domEvent.MOUSE_DOWN && candidate && (name == 'select' || name == 'option' ||
            (name == 'input' && source.type != 'checkbox' && source.type != 'radio' &&
            source.type != 'button' && source.type != 'submit' && source.type != 'file'));
    },

    fireMouseEvent: function (evtName, me, sender) {
        if (this.isEventSourceIgnored(evtName, me)) {
            if (this.tooltipHandler != null) {
                this.tooltipHandler.hide();
            }
            return;
        }

        if (sender == null) {
            sender = this;
        }

        me = this.updateMouseEvent(me);

        if (evtName == domEvent.MOUSE_DOWN && this.isEditing() && !this.cellEditor.isEventSource(me.getEvent())) {
            this.stopEditing(!this.isInvokesStopCellEditing());
        }

        if ((!this.nativeDblClickEnabled && !domEvent.isPopupTrigger(me.getEvent())) || (this.doubleTapEnabled &&
            detector.IS_TOUCH && domEvent.isTouchEvent(me.getEvent()))) {
            var currentTime = new Date().getTime();

            if ((!detector.IS_QUIRKS && evtName == domEvent.MOUSE_DOWN) || (detector.IS_QUIRKS && evtName == domEvent.MOUSE_UP && !this.fireDoubleClick)) {
                if (this.lastTouchEvent != null && this.lastTouchEvent != me.getEvent() &&
                    currentTime - this.lastTouchTime < this.doubleTapTimeout &&
                    Math.abs(this.lastTouchX - me.getX()) < this.doubleTapTolerance &&
                    Math.abs(this.lastTouchY - me.getY()) < this.doubleTapTolerance &&
                    this.doubleClickCounter < 2) {
                    this.doubleClickCounter++;
                    var doubleClickFired = false;

                    if (evtName == domEvent.MOUSE_UP) {
                        if (me.getCell() == this.lastTouchCell && this.lastTouchCell != null) {
                            this.lastTouchTime = 0;
                            var cell = this.lastTouchCell;
                            this.lastTouchCell = null;

                            if (detector.IS_QUIRKS) {
                                me.getSource().fireEvent('ondblclick');
                            }

                            this.dblClick(me.getEvent(), cell);
                            doubleClickFired = true;
                        }
                    }
                    else {
                        this.fireDoubleClick = true;
                        this.lastTouchTime = 0;
                    }

                    if (!detector.IS_QUIRKS || doubleClickFired) {
                        domEvent.consume(me.getEvent());
                        return;
                    }
                }
                else if (this.lastTouchEvent == null || this.lastTouchEvent != me.getEvent()) {
                    this.lastTouchCell = me.getCell();
                    this.lastTouchX = me.getX();
                    this.lastTouchY = me.getY();
                    this.lastTouchTime = currentTime;
                    this.lastTouchEvent = me.getEvent();
                    this.doubleClickCounter = 0;
                }
            }
            else if ((this.isMouseDown || evtName == domEvent.MOUSE_UP) && this.fireDoubleClick) {
                this.fireDoubleClick = false;
                var cell = this.lastTouchCell;
                this.lastTouchCell = null;
                this.isMouseDown = false;

                var valid = (cell != null) || (domEvent.isTouchEvent(me.getEvent()) && (detector.IS_GC || detector.IS_SF));

                if (valid && Math.abs(this.lastTouchX - me.getX()) < this.doubleTapTolerance &&
                    Math.abs(this.lastTouchY - me.getY()) < this.doubleTapTolerance) {
                    this.dblClick(me.getEvent(), cell);
                }
                else {
                    domEvent.consume(me.getEvent());
                }

                return;
            }
        }

        if (!this.isEventIgnored(evtName, me, sender)) {
            this.fireEvent(new EventObject(domEvent.FIRE_MOUSE_EVENT, 'eventName', evtName, 'event', me));

            if ((detector.IS_OP || detector.IS_SF || detector.IS_GC ||
                (detector.IS_IE && detector.IS_SVG) || me.getEvent().target != this.container)) {
                if (evtName == domEvent.MOUSE_MOVE && this.isMouseDown && this.autoScroll && !domEvent.isMultiTouchEvent(me.getEvent)) {
                    this.scrollPointToVisible(me.getGraphX(), me.getGraphY(), this.autoExtend);
                }

                if (this.mouseListeners != null) {
                    var args = [sender, me];

                    if (!me.getEvent().preventDefault) {
                        me.getEvent().returnValue = true;
                    }

                    for (var i = 0; i < this.mouseListeners.length; i++) {
                        var l = this.mouseListeners[i];

                        if (evtName == domEvent.MOUSE_DOWN) {
                            l.mouseDown.apply(l, args);
                        }
                        else if (evtName == domEvent.MOUSE_MOVE) {
                            l.mouseMove.apply(l, args);
                        }
                        else if (evtName == domEvent.MOUSE_UP) {
                            l.mouseUp.apply(l, args);
                        }
                    }
                }

                if (evtName == domEvent.MOUSE_UP) {
                    this.click(me);
                }
            }

            if (domEvent.isTouchEvent(me.getEvent()) && evtName == domEvent.MOUSE_DOWN &&
                this.tapAndHoldEnabled && !this.tapAndHoldInProgress) {
                this.tapAndHoldInProgress = true;
                this.initialTouchX = me.getGraphX();
                this.initialTouchY = me.getGraphY();

                var handler = function () {
                    if (this.tapAndHoldValid) {
                        this.tapAndHold(me);
                    }

                    this.tapAndHoldInProgress = false;
                    this.tapAndHoldValid = false;
                };

                if (this.tapAndHoldThread) {
                    window.clearTimeout(this.tapAndHoldThread);
                }

                this.tapAndHoldThread = window.setTimeout(utils.bind(this, handler), this.tapAndHoldDelay);
                this.tapAndHoldValid = true;
            }
            else if (evtName == domEvent.MOUSE_UP) {
                this.tapAndHoldInProgress = false;
                this.tapAndHoldValid = false;
            }
            else if (this.tapAndHoldValid) {
                this.tapAndHoldValid =
                    Math.abs(this.initialTouchX - me.getGraphX()) < this.tolerance &&
                    Math.abs(this.initialTouchY - me.getGraphY()) < this.tolerance;
            }

            this.consumeMouseEvent(evtName, me, sender);
        }
    },

    consumeMouseEvent: function (evtName, me, sender) {
        if (evtName == domEvent.MOUSE_DOWN && domEvent.isTouchEvent(me.getEvent())) {
            me.consume(false);
        }
    },

    fireGestureEvent: function (evt, cell) {
        // Resets double tap event handling when gestures take place
        this.lastTouchTime = 0;
        this.emit(new EventObject(eventNames.GESTURE, {
            event: evt,
            cell: cell
        }));
    },

    destroy: function () {}
});

module.exports = Graph;
});