/* widgetsync.js -- one small patch to litegraph itself, loaded immediately after it: keeps every widget's
 * DISPLAYED value in sync with the node's real .properties after configure() restores them.
 *
 * THE BUG: LGraphNode.prototype.configure (lib/litegraph.js) copies restored data into `this.properties`
 * correctly -- that part was never wrong, which is why every compiled-output check done while building
 * this tool always passed. But a widget has its OWN separate `.value` field (what's actually drawn on the
 * node), and configure()'s own widget-sync step only updates that for a widget built with an
 * `options.property` binding (`addWidget(type, name, value, callback, "propertyName")` or an equivalent
 * `options: {property: ...}`) -- nothing across this codebase's ~375 node types uses that form; every
 * widget here is wired with a plain manual callback (`function (v) { this.properties.x = v; }`) instead,
 * the established convention in every nodes-*.js file. So after configure() runs, .properties is correct
 * but every widget keeps showing whatever value it had at construction time -- the node LOOKS unconfigured
 * even though it compiles correctly.
 *
 * This isn't specific to Load Graph -- EVERY path that recreates a node via configure() has the same gap:
 * Load Graph and undo/redo restore (both graphio.js, via graph.configure()), autosave-restore (same), and
 * litegraph's own copy/paste (LGraphCanvas.prototype.pasteFromClipboard calls node.configure() per pasted
 * node too). A single global patch to the shared LGraphNode.prototype.configure fixes all of them at once,
 * rather than teaching each call site (or each of those ~375 node types) to do this itself.
 *
 * Matching a widget to a property by NAME is a heuristic, not a guarantee -- a handful of nodes elsewhere
 * give a widget a friendlier label than its raw property key (e.g. Impulse's "uGuid (nil = auto)" widget
 * for the `uGuid` property) and won't be caught by this. Good enough for the overwhelming majority of
 * widgets in this project, which use the property name as-is; a mismatch here means a widget shows a stale
 * value after a restore, exactly like before this patch -- not a new failure mode, just an unfixed corner
 * of the same one.
 */
(function () {
  "use strict";

  var originalConfigure = LGraphNode.prototype.configure;

  LGraphNode.prototype.configure = function (info) {
    originalConfigure.call(this, info);
    if (this.widgets && this.properties) {
      for (var i = 0; i < this.widgets.length; i++) {
        var w = this.widgets[i];
        if (w && this.properties.hasOwnProperty(w.name)) {
          w.value = this.properties[w.name];
        }
      }
    }
  };
})();
