/* graphio.js -- graph-level persistence and history: Save/Load as a .json file, autosave to this browser,
 * and an undo/redo stack. All three boil down to the same primitive, `restoreGraph`, built on litegraph's
 * own graph.serialize()/configure() (already a complete, well-formed snapshot -- see LGraph.prototype.
 * serialize in lib/litegraph.js -- nothing custom to invent here).
 *
 * THE TWO-PASS RESTORE, and why it exists: this graph's node TYPES aren't all static. Every ess/native/flow
 * node is registered once at page load, but a "flow/call/<name>" type (see nodes-function-calls.js) only
 * exists once FunctionCalls.rescan(graph) has seen that function's Function Start node -- which itself only
 * exists once the graph has been restored. A single configure() pass on a saved graph containing a Call
 * node would hit that ordering gap: LiteGraph.createNode("flow/call/Foo") fails before the rescan has ever
 * run, and litegraph silently swaps in a generic broken placeholder node (LGraphNode with has_errors=true)
 * rather than losing the save outright -- but you'd still end up with a dead node instead of a working
 * Call. restoreGraph() sidesteps this by configuring TWICE: once so any Function Start nodes land for real
 * and rescanFn() can see them, then again (from a FRESH JSON.parse each time -- reusing the same parsed
 * object across two configure() calls risks the first pass's in-place link-decoding corrupting the second,
 * see LGraph.prototype.configure's data.links handling) now that every Call type the graph needs is
 * registered. Cheap for the common case of a graph with no functions at all, and correct for one that has
 * them -- simpler than trying to detect which case applies and branch.
 *
 * UNDO/REDO'S CHANGE HOOK: wired (in app.js) to graph.on_change, not graph.onAfterChange -- litegraph does
 * have a beforeChange/afterChange pair explicitly commented "used for undo" (LGraph.prototype.afterChange),
 * but it only fires from a handful of litegraph's OWN interactive paths (drag-end, its own paste flow) --
 * LGraph.prototype.add itself, which is what Palette.js's click-to-add and every programmatic node
 * creation in this tool goes through, calls `this.change()` (-> `this.on_change`) instead, and does so far
 * more broadly (add/remove/connect and more). on_change is the one that actually catches everything.
 */
window.GraphIO = (function () {
  "use strict";

  var AUTOSAVE_KEY = "essvisual_autosave_v1";
  var UNDO_LIMIT = 50;

  function restoreGraph(graph, jsonString, rescanFn) {
    graph.configure(JSON.parse(jsonString));
    if (rescanFn) rescanFn();
    graph.configure(JSON.parse(jsonString));
  }

  // ---- autosave: debounced so a fast burst of edits (dragging a node, typing in a widget) writes once,
  // not once per intermediate change. A convenience net, not critical data -- localStorage being full or
  // disabled (private browsing in some browsers) fails silently rather than interrupting the user's work.
  var autosaveTimer = null;
  function scheduleAutosave(graph) {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(graph.serialize())); } catch (e) { /* storage full or unavailable -- fine, this is a convenience */ }
    }, 800);
  }
  function readAutosave() {
    try { return localStorage.getItem(AUTOSAVE_KEY); } catch (e) { return null; }
  }
  function clearAutosave() {
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) { /* nothing to do if storage is unavailable */ }
  }

  // ---- undo/redo: a plain stack of serialized snapshots, not a diff/patch system -- simple, and a modest
  // hand-built graph serializes to a few KB, so keeping up to UNDO_LIMIT full copies around costs nothing
  // that matters here. Records off graph.onAfterChange (litegraph's own hook for exactly this, see
  // LGraph.prototype.afterChange's "used for undo" comment -- just never wired to anything by default).
  function createUndoStack(graph, opts) {
    opts = opts || {};
    var undoStack = [];
    var redoStack = [];
    var suppress = false; // true while restore() below is mid-configure, so its own graph mutations don't record themselves as a new undo step

    function snapshot() { return JSON.stringify(graph.serialize()); }

    function notify() { if (opts.onChange) opts.onChange(); }

    function pushInitial() {
      undoStack = [snapshot()];
      redoStack = [];
      notify();
    }

    // Debounced: intended to be wired to graph.on_change (see graphio.js's header and app.js -- litegraph
    // fires this from LGraph.prototype.add/remove/connect and several LGraphCanvas interaction paths, far
    // more broadly than the sparser beforeChange/afterChange pair, but that breadth means it can fire many
    // times for what's really ONE user action (e.g. every intermediate step of a drag). Coalescing to the
    // state 400ms after the last firing both avoids snapshotting on every frame of a drag AND produces a
    // more sensible undo step (back to before the whole drag, not some mid-drag position).
    var recordTimer = null;
    function record() {
      if (suppress) return;
      if (recordTimer) clearTimeout(recordTimer);
      recordTimer = setTimeout(function () {
        recordTimer = null;
        var snap = snapshot();
        if (undoStack.length && undoStack[undoStack.length - 1] === snap) return; // no real change (e.g. a click that selected but didn't move anything)
        undoStack.push(snap);
        if (undoStack.length > UNDO_LIMIT) undoStack.shift();
        redoStack = [];
        notify();
      }, 400);
    }

    function restore(json) {
      suppress = true;
      restoreGraph(graph, json, opts.rescanFn);
      suppress = false;
      if (opts.onRestore) opts.onRestore();
    }

    function undo() {
      if (undoStack.length < 2) return false; // nothing before the current state
      redoStack.push(undoStack.pop());
      restore(undoStack[undoStack.length - 1]);
      notify();
      return true;
    }

    function redo() {
      if (!redoStack.length) return false;
      var snap = redoStack.pop();
      undoStack.push(snap);
      restore(snap);
      notify();
      return true;
    }

    return {
      pushInitial: pushInitial,
      record: record,
      undo: undo,
      redo: redo,
      canUndo: function () { return undoStack.length > 1; },
      canRedo: function () { return redoStack.length > 0; }
    };
  }

  return {
    AUTOSAVE_KEY: AUTOSAVE_KEY,
    restoreGraph: restoreGraph,
    scheduleAutosave: scheduleAutosave,
    readAutosave: readAutosave,
    clearAutosave: clearAutosave,
    createUndoStack: createUndoStack
  };
})();
