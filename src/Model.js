/* jshint node: true, loopfunc: true, undef: true, unused: true */

var Class = require('./class');
var utils = require('./utils');
var Events = require('./events');
var Cell = require('./Cell');
var RootChange = require('./changes/RootChange');
var ChildChange = require('./changes/ChildChange');

var isNumeric = utils.isNumeric;
var isNullOrUndefined = utils.isNullOrUndefined;

module.exports = Class.create({
    Implements: Events,
    constructor: function Model(root) {

        var model = this;

        //this.currentEdit = this.createUndoableEdit();

        root ? model.setRoot(root) : model.clear();
    },

    root: null,
    cells: null,
    maintainEdgeParent: true,
    createIds: true,
    prefix: '',
    postfix: '',
    nextId: 0,
    currentEdit: null,
    updateLevel: 0,
    endingUpdate: false,

    clear: function () {

        var model = this;
        var root = model.createRoot();

        model.setRoot(root);

        return model;
    },

    createRoot: function () {

        var cell = new Cell();

        cell.insert(new Cell());

        return cell;
    },

    setRoot: function (root) {

        var model = this;

        model.execute(new RootChange(model, root));

        return model;
    },

    getRoot: function (cell) {

        var model = this;
        var root = cell || model.root;

        while (cell) {
            root = cell;
            cell = model.getParent(cell);
        }

        return root;
    },


    getCell: function (id) {
        var cells = this.cells;
        return cells ? cells[id] : null;
    },

    filterCells: function (cells, filter) {
        var result = [];

        if (cells != null) {
            for (var i = 0; i < cells.length; i++) {
                if (filter(cells[i])) {
                    result.push(cells[i]);
                }
            }
        }

        return result;
    },

    getDescendants: function (parent) {
        return this.filterDescendants(null, parent);
    },

    filterDescendants: function (filter, parent) {

        var model = this;
        var result = [];

        parent = parent || model.getRoot();

        if (isNullOrUndefined(filter) || filter(parent)) {
            result.push(parent);
        }

        // Visits the children of the cell
        var childCount = this.getChildCount(parent);

        for (var i = 0; i < childCount; i++) {
            var child = this.getChildAt(parent, i);
            result = result.concat(this.filterDescendants(filter, child));
        }

        return result;
    },

    rootChanged: function (root) {

        var model = this;
        var oldRoot = model.root;

        model.root = root;
        model.nextId = 0;
        model.cells = null;
        model.cellAdded(root);

        return oldRoot;
    },

    isRoot: function (cell) {
        return cell && this.root === cell;
    },

    isLayer: function (cell) {
        var model = this;
        var parent = model.getParent(cell);

        return model.isRoot(parent);
    },

    isAncestor: function (parent, child) {
        while (child && child !== parent) {
            child = this.getParent(child);
        }

        return child === parent;
    },

    isCreateIds: function () {
        return this.createIds;
    },

    setCreateIds: function (value) {
        this.createIds = value;
    },

    contains: function (cell) {
        return this.isAncestor(this.root, cell);
    },

    getParent: function (cell) {
        return cell ? cell.getParent() : null;
    },

    add: function (parent, child, index) {
        if (parent && child && child !== parent) {
            if (isNullOrUndefined(index)) {
                index = this.getChildCount(parent);
            }

            var parentChanged = parent !== this.getParent(child);
            this.execute(new ChildChange(this, parent, child, index));

            // Maintains the edges parents by moving the edges
            // into the nearest common ancestor of its
            // terminals
            if (this.maintainEdgeParent && parentChanged) {
                this.updateEdgeParents(child);
            }
        }

        return child;
    },

    cellAdded: function (cell) {
        if (!cell) {
            return;
        }

        // Creates an Id for the cell if not Id exists
        if (!cell.getId() && this.createIds) {
            cell.setId(this.createId());
        }

        if (cell.getId()) {
            var collision = this.getCell(cell.getId());

            if (collision != cell) {
                // Creates new Id for the cell
                // as long as there is a collision
                while (collision != null) {
                    cell.setId(this.createId(cell));
                    collision = this.getCell(cell.getId());
                }

                // Lazily creates the cells dictionary
                if (this.cells == null) {
                    this.cells = {};
                }

                this.cells[cell.getId()] = cell;
            }
        }

        // Makes sure IDs of deleted cells are not reused
        if (isNumeric(cell.getId())) {
            this.nextId = Math.max(this.nextId, cell.getId());
        }

        // Recursively processes child cells
        var childCount = this.getChildCount(cell);

        for (var i = 0; i < childCount; i++) {
            this.cellAdded(this.getChildAt(cell, i));
        }
    },

    createId: function () {
        var id = this.nextId;
        this.nextId++;

        return this.prefix + id + this.postfix;
    },
    updateEdgeParents: function (cell, root) {},
    updateEdgeParent: function (cell, root) {},
    getOrigin: function (cell) {
        var result = null;

        if (cell) {
            result = this.getOrigin(this.getParent(cell));

            if (!this.isEdge(cell)) {
                var geo = this.getGeometry(cell);

                if (geo) {
                    result.x += geo.x;
                    result.y += geo.y;
                }
            }
        } else {
            result = new Point();
        }

        return result;
    },

    // 获取最近的共同父节点
    getNearestCommonAncestor: function (cell1, cell2) {},

    remove: function (cell) {
        if (cell === this.root) {
            this.setRoot(null);
        } else if (this.getParent(cell)) {
            this.execute(new ChildChange(this, null, cell));
        }

        return cell;
    },
    cellRemoved: function (cell) {
        if (cell && this.cells) {
            // Recursively processes child cells
            var childCount = this.getChildCount(cell);

            for (var i = childCount - 1; i >= 0; i--) {
                this.cellRemoved(this.getChildAt(cell, i));
            }

            // Removes the dictionary entry for the cell
            if (this.cells && cell.getId()) {
                delete this.cells[cell.getId()];
            }
        }
    },

    parentForCellChanged: function (cell, parent, index) {},

    getChildCount: function (cell) {
        return cell ? cell.getChildCount() : 0;
    },
    getChildAt: function (cell, index) {
        return cell ? cell.getChildAt(index) : null;
    },
    getChildren: function (cell) {
        return cell ? cell.children : null;
    },
    getChildVertices: function (parent) {
        return this.getChildCells(parent, true, false);
    },
    getChildEdges: function (parent) {
        return this.getChildCells(parent, false, true);
    },
    getChildCells: function (parent, isVertice, isEdge) {
        isVertice = !isNullOrUndefined(isVertice) ? isVertice : false;
        isEdge = !isNullOrUndefined(isEdge) ? isEdge : false;

        var childCount = this.getChildCount(parent);
        var result = [];

        for (var i = 0; i < childCount; i++) {
            var child = this.getChildAt(parent, i);

            if ((!isEdge && !isVertice) || (isEdge && this.isEdge(child)) ||
                (isVertice && this.isVertex(child))) {
                result.push(child);
            }
        }

        return result;
    },

    getTerminal: function (edge, isSource) {
        return edge ? edge.getTerminal(isSource) : null;
    },
    setTerminal: function (edge, terminal, isSource) {
        var terminalChanged = terminal != this.getTerminal(edge, isSource);
        this.execute(new TerminalChange(this, edge, terminal, isSource));

        if (this.maintainEdgeParent && terminalChanged) {
            this.updateEdgeParent(edge, this.getRoot());
        }

        return terminal;
    },
    setTerminals: function (edge, source, target) {
        // 设置连线的源和目标
        this.beginUpdate();
        try {
            this.setTerminal(edge, source, true);
            this.setTerminal(edge, target, false);
        }
        finally {
            this.endUpdate();
        }
    },
    terminalForCellChanged: function (edge, cell, isSource) {
        var previous = this.getTerminal(edge, isSource);

        if (cell != null) {
            cell.insertEdge(edge, isSource);
        }
        else if (previous != null) {
            previous.removeEdge(edge, isSource);
        }

        return previous;
    },

    getEdgeCount: function (cell) {
        return cell ? cell.getEdgeCount() : 0;
    },
    getEdgeAt: function (cell, index) {
        return cell ? cell.getEdgeAt(index) : null;
    },
    getDirectedEdgeCount: function (cell, outgoing, ignoredEdge) {

    },
    getConnections: function (cell) {},
    getIncomingEdges: function (cell) {},
    getOutgoingEdges: function (cell) {},
    getEdges: function (cell, incoming, outgoing, includeLoops) {},
    getEdgesBetween: function (source, target, directed) {},
    getOpposites: function (edges, terminal, sources, targets) {},
    getTopmostCells: function (cells) {},

    isVertex: function (cell) {
        return cell ? cell.isVertex() : false;
    },
    isEdge: function (cell) {
        return cell ? cell.isEdge() : false;
    },
    isConnectable: function (cell) {
        return cell ? cell.isConnectable() : false;
    },
    getValue: function (cell) {
        return cell ? cell.getValue() : null;
    },
    setValue: function (cell, value) {
        this.execute(new ValueChange(this, cell, value));
        return value;
    },
    valueForCellChanged: function (cell, value) {},

    getGeometry: function (cell) {},
    setGeometry: function (cell, geometry) {},
    geometryForCellChanged: function (cell, geometry) {},

    getStyle: function (cell) {},
    setStyle: function (cell, style) {},
    styleForCellChanged: function (cell, style) {},

    isCollapsed: function (cell) {},
    setCollapsed: function (cell, collapsed) {},
    collapsedStateForCellChanged: function (cell, collapsed) {},

    isVisible: function (cell) {},
    setVisible: function (cell, visible) {},
    visibleStateForCellChanged: function (cell, visible) {},

    execute: function (change) {

        change.digest();

        this.beginUpdate();

        //this.currentEdit.add(change);
        this.fireEvent(new mxEventObject(mxEvent.EXECUTE, 'change', change));
        // New global executed event
        this.fireEvent(new mxEventObject(mxEvent.EXECUTED, 'change', change));

        this.endUpdate();

    },

    beginUpdate: function () {
        this.updateLevel++;
        this.fireEvent(new mxEventObject(mxEvent.BEGIN_UPDATE));

        if (this.updateLevel == 1) {
            this.fireEvent(new mxEventObject(mxEvent.START_EDIT));
        }
    },

    endUpdate: function () {
        this.updateLevel--;

        if (this.updateLevel == 0) {
            this.fireEvent(new mxEventObject(mxEvent.END_EDIT));
        }

        if (!this.endingUpdate) {
            this.endingUpdate = this.updateLevel == 0;
            this.fireEvent(new mxEventObject(mxEvent.END_UPDATE, 'edit', this.currentEdit));

            try {
                if (this.endingUpdate && !this.currentEdit.isEmpty()) {
                    this.fireEvent(new mxEventObject(mxEvent.BEFORE_UNDO, 'edit', this.currentEdit));
                    var tmp = this.currentEdit;
                    this.currentEdit = this.createUndoableEdit();
                    tmp.notify();
                    this.fireEvent(new mxEventObject(mxEvent.UNDO, 'edit', tmp));
                }
            }
            finally {
                this.endingUpdate = false;
            }
        }
    },

    createUndoableEdit: function () {},
    mergeChildren: function (from, to, cloneAllEdges) {},
    mergeChildrenImpl: function (from, to, cloneAllEdges, mapping) {},

    getParents: function (cell) {},
    cloneCell: function (cell) {},
    cloneCells: function (cell, includeChildren) {},
    cloneCellImpl: function (cell, mapping, includeChildren) {},
    cellCloned: function (cell) {},

    restoreClone: function (clone, cell, mapping) {},

    destroy: function () {}
});
