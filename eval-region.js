import { Prec } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { syntaxTree } from "@codemirror/language"
import { props } from "@nextjournal/lezer-clojure"
import { evalString } from "./sci"
import { NodeProp } from "@lezer/common"
//import { nodeAtCursor } from "./nodes"

// Node props are marked in the grammar and distinguish categories of nodes

// primitive collection
const collProp = props.coll
// prefix collection - a prefix token that wraps the next element
const prefixCollProp = props.prefixColl
// the prefix edge itself
const prefixEdgeProp = props.prefixEdge
// prefix form - pair of [metadata, target]
const prefixContainerProp = props.prefixContainer
// edges at the beginning/end of collections, + "same" edges (string quotes)
const startEdgeProp = NodeProp.closedBy
const endEdgeProp = NodeProp.openedBy
const sameEdgeProp = props.sameEdge

function up(node) {
    return node.parent;
}

function isTopType(nodeType) {
    return nodeType.isTop;
}

function isTop(node) {
    return isTopType(node.type);
}

function evalCell(view) {
    console.log("evalCell>", evalString(view.state.doc.text.join(" ")))
    return true
}

function mainSelection(state) {
    return state.selection.asSingle().ranges[0]
}

function tree(state, pos, dir) {
    switch (arguments["length"]) {
        case 1:
            return syntaxTree(state);
        case 2:
            return syntaxTree(state).resolveInner(pos);
        case 3:
            return syntaxTree(state).resolveInner(pos, dir);
    }
}

function nearestTouching(state, pos) {
    const L = tree(state, pos, -1)
    const R = tree(state, pos, 1)
    const mid = tree(state, pos)
    return L
}

function isTerminalType(nodeType) {
    if (isTopType(nodeType || nodeType.prefixCollProp.prop() ||
    nodeType.collProp.prop() || nodeType.name == "Meta" ||
    nodeType.name == "TaggedLiteral" || nodeType.name == "ConstructorCall")) {
        return false
    } else {
        return true
    }
}

function childDir(parent, from, dir) {
    switch (dir) {
        case 1:
            return parent.childAfter(from)
        case -1:
            return parent.childBefore(from)
    }
}

function childSide(child, dir) {
    switch (dir) {
        case 1:
            return child.to
        case -1:
            return child.from
    }
}

function children(parent, from, dir) {
    let child = childDir(parent, from, dir)
    return parent
}

function parents(node, p) {
    if (isTop(node)) return p;
    return parents(up(node), p.concat(node));
}

function rangeStr(state, selection) {
    return state.doc.slice(selection.from, selection.to).toString()
}

// Return node or its highest ancestor that starts or ends at the cursor position
function uppermostEdge(pos, node) {
    let parents = []
    let n = node
    while (!isTop(n) && (pos === n.to && pos === node.to) ||
                        (pos === n.from && pos === node.from)) {              
        parents.concat(n)
        n = up(n)
    }
    console.log("parents:", parents)
    if ((parents.slice(-1)) !== null) {
        return node
    }
    return parents.slice(-1)
}

function isTerminal(node, pos) {
    return isTerminalType(node.type) ||
           pos === node.from || pos === node.to
}

function nodeAtCursor(state) {
    const pos =  mainSelection(state).from
    const n = nearestTouching(state, pos)
    const u = uppermostEdge(pos, n)
    console.log("touching:", state.doc.slice(n.from, n.to).toString())
    console.log("upper:", state.doc.slice(u.from, u.to).toString())
    return uppermostEdge(pos, n)
}

function cursorNodeString(state) {
    return rangeStr(state, nodeAtCursor(state))
}

function evalAtCursor(view) {
    console.log(cursorNodeString(view.state))
    console.log("evalAtCursor>", evalString(cursorNodeString(view.state)))
    return true
}

export function evalExtension() {
    return Prec.highest(keymap.of(
        [{
            key: "Shift-Enter",
            run: evalCell
        },
        {
            key: "Ctrl-Enter",
            run: evalAtCursor
        }]))
}