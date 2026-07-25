/* nodesize.js -- the second small patch to litegraph (see widgetsync.js for the first, and the same
 * "monkey-patch here, never edit lib/litegraph.js" rule: the vendored copy stays byte-identical to
 * upstream, which is what makes it safe to re-vendor).
 *
 * THE PROBLEM: litegraph draws every widget as a LABEL left-aligned at x=margin*2 and its VALUE
 * right-aligned at the far edge, inside the same rounded box, and never checks whether the two actually
 * fit (LGraphCanvas.prototype.drawNodeWidgets). A text widget's value is clamped to 30 CHARACTERS
 * (`String(w.value).substr(0,30)`) -- a character count, with no idea how wide the node is. Node widths,
 * meanwhile, come from LGraphNode.computeSize, which sizes for slot NAMES and widget COUNT and ignores
 * widget values entirely.
 *
 * So any node whose default value is longer than its width can hold renders as its label and value
 * overprinted on each other -- "targeEss.Player.character(0)" instead of "target / Ess.Player.character(0)".
 * That is not a rare corner here: `Ess.Player.character(0)` is the standing default for every guid input
 * across the Object/Human/Vehicle/Camera/Marker node files, so a large fraction of the library looked
 * broken the moment it was dropped on the canvas, before the user had done anything at all.
 *
 * THE FIX: measure the real rendered text (an offscreen 2D context using litegraph's own widget font)
 * when a node is created, and widen the node just enough that its widest label+value pair can't collide.
 * Measured, not a per-character guess, because the values here are full of narrow glyphs ("(", ".", "1")
 * that a fixed 6px-per-char estimate overshoots badly.
 *
 * WIDENING ONLY, AND ONLY AT CREATION:
 *   - Never shrinks a node. A node that's already wide enough is left exactly as computeSize made it.
 *   - Runs from LiteGraph.createNode, which is upstream of every path that makes a node -- the palette's
 *     click-to-add, the right-click menu, samples.js's builders, litegraph's own paste, and
 *     LGraph.configure's restore. configure() then applies the SAVED size right after, so a node you
 *     resized by hand keeps the size you gave it and this never fights you for it.
 *   - Capped at MAX_WIDTH. A `fn`/`code` property holding a whole Lua function literal would otherwise
 *     demand a node several hundred pixels wide for text that's clipped at 30 characters anyway; past a
 *     point the honest answer is "this value is too long to preview", not a node the width of the canvas.
 */
(function () {
  "use strict";

  var measurer = document.createElement("canvas").getContext("2d");

  var MARGIN = 15;        // litegraph's own `margin` local in drawNodeWidgets
  var GAP = 12;           // minimum visible space between a label and its value
  var ARROW_ROOM = 20;    // number/combo reserve this on the right for their < > arrows
  var MAX_WIDTH = 300;    // see header -- beyond this, widening stops paying for itself
  var TEXT_VALUE_CHARS = 30;  // litegraph's own hard cap on a text widget's drawn value

  // Must match LGraphCanvas's own `inner_text_font`, which it builds as
  // "normal " + LiteGraph.NODE_SUBTEXT_SIZE + "px Arial" (lib/litegraph.js) and sets before drawing
  // widgets. The family is hardcoded to Arial upstream -- there is no LiteGraph.NODE_FONT constant, and
  // naming one here produced the invalid font string "12px undefined", which a 2D context silently
  // IGNORES: the assignment is dropped and measureText keeps using the canvas default (10px sans-serif).
  // Every measurement then came out ~15% narrow with no error anywhere -- so this reads the canvas's own
  // value when there is one, and only falls back to reconstructing the string.
  function widgetFont() {
    var canvas = LGraphCanvas.active_canvas;
    return (canvas && canvas.inner_text_font) || ("normal " + LiteGraph.NODE_SUBTEXT_SIZE + "px Arial");
  }

  function measure(text) { return measurer.measureText(String(text)).width; }

  // The value litegraph will actually DRAW for this widget -- not the value the widget holds. A combo with
  // an options.values map draws the mapped entry, a number draws a fixed-precision rendering, and a text
  // widget draws at most its first 30 characters. Measuring the stored value instead would size nodes for
  // text that never appears on screen.
  function drawnValue(w) {
    if (w.type === "number") {
      var precision = (w.options && w.options.precision !== undefined) ? w.options.precision : 3;
      return Number(w.value).toFixed(precision);
    }
    var v = w.value;
    if (w.options && w.options.values && w.options.values.constructor !== Function &&
        w.options.values.constructor !== Array) {
      v = w.options.values[w.value];
    }
    v = String(v == null ? "" : v);
    return (w.type === "text" || w.type === "string") ? v.substr(0, TEXT_VALUE_CHARS) : v;
  }

  function fit(node) {
    if (!node || !node.widgets || !node.widgets.length || !node.size) return node;
    measurer.font = widgetFont();

    var needed = 0;
    for (var i = 0; i < node.widgets.length; i++) {
      var w = node.widgets[i];
      if (!w || w.type === "button" || w.type === "toggle") continue;  // both draw one centred string, no pair to collide
      var extra = (w.type === "number" || w.type === "combo") ? ARROW_ROOM : 0;
      needed = Math.max(needed, MARGIN * 4 + GAP + extra + measure(w.label || w.name || "") + measure(drawnValue(w)));
    }

    if (needed > node.size[0]) node.size[0] = Math.ceil(Math.min(needed, MAX_WIDTH));
    return node;
  }

  var originalCreateNode = LiteGraph.createNode;
  LiteGraph.createNode = function () {
    return fit(originalCreateNode.apply(this, arguments));
  };

  // Exposed for the one case createNode can't cover: a builder that sets properties AFTER construction
  // (samples.js's setProp), where the value that needs measuring doesn't exist yet at creation time.
  window.NodeSize = { fit: fit };
})();
