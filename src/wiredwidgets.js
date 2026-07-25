/* wiredwidgets.js -- the third small patch to litegraph (see widgetsync.js and nodesize.js for the other
 * two, and the same rule all three follow: lib/litegraph.js stays byte-identical to upstream, so anything
 * we need to change about its behavior lives here instead).
 *
 * THE PROBLEM: almost every data input on every node here is a PAIR -- an input pin and a widget editing
 * the same value -- and the pin silently wins. That's `CodeGen.resolveInput`'s whole contract: whatever's
 * wired in, else the node's own property. But nothing on the canvas said so. A node with Spawn Ahead's guid
 * wired into it still showed `Ess.Player.character(0)` in an editable-looking field, and typing a different
 * guid there did exactly nothing to the compiled output -- no error, no feedback, the edit just had no
 * effect. Worse in the other direction: with two or three widgets on a node and only one of them actually
 * live, there was no way to tell at a glance which value the script would end up using.
 *
 * THE FIX: a widget whose matching input is connected gets `w.disabled = true`. Both halves of what that
 * means are already implemented upstream, which is why this file is as short as it is:
 *   - LGraphCanvas.prototype.drawNodeWidgets halves globalAlpha for a disabled widget and skips its outline
 *     stroke, so it visibly recedes -- and restores the alpha at the end of each iteration, so the dimming
 *     doesn't leak onto the widgets below it.
 *   - LGraphCanvas.prototype.processNodeWidgets skips disabled widgets outright (`if(!w || w.disabled)
 *     continue;`), so clicks, drags and the click-to-edit prompt all stop reaching them.
 * Nothing else in this repo sets `.disabled` on a widget, so this file can own the flag completely.
 *
 * WHY RECOMPUTED AT DRAW/INPUT TIME rather than tracked on connect: litegraph fires onConnectionsChange,
 * but a node can also gain or lose links from paths that don't (configure() restoring a saved graph, undo/
 * redo, paste, a node being deleted out from under a wire). Deriving the flag from `input.link` right
 * before it's used is stateless -- it cannot drift, needs no bookkeeping, and correctly handles every one
 * of those paths without knowing they exist. It runs over one node's widgets at a time, on a canvas that
 * holds tens of nodes, so the cost doesn't register.
 *
 * NAME MATCHING: a widget maps to the input of the same name. Most are named exactly for their property,
 * but a number carry a parenthetical hint -- "guid (nil = UI one-shot)", "onDone (blank = none)",
 * "boundaryGuid (nil = must wire in)" -- so the part before " (" is what gets matched. That covers 524 of
 * the 526 data inputs across the node library. The two it doesn't are Relations: Make Hostile/Make Allies,
 * whose input is `factions` (a Lua table literal) while the widget is a `faction` combo picking ONE name to
 * wrap -- a genuine difference, not a typo, so those two declare `inputName` in their addWidget options
 * instead of being papered over with a plural-guessing rule here.
 *
 * A widget that matches no input is simply never disabled, which is the safe direction to fail: the field
 * stays editable, exactly as it behaved before this file existed.
 */
(function () {
  "use strict";

  // The input slot this widget edits: an explicit `inputName` option if the node declares one, else the
  // widget's own name with any " (parenthetical hint)" trimmed off.
  function inputNameFor(widget) {
    if (widget.options && widget.options.inputName) return widget.options.inputName;
    var name = String(widget.name || "");
    var paren = name.indexOf(" (");
    return (paren === -1 ? name : name.slice(0, paren)).trim();
  }

  function syncDisabled(node) {
    if (!node || !node.widgets || !node.widgets.length) return;

    var wired = null;
    var inputs = node.inputs || [];
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      // ACTION inputs are the exec chain -- no widget edits those, and they'd never match a name anyway.
      if (!input || input.link == null || input.type === LiteGraph.ACTION) continue;
      if (!wired) wired = {};
      wired[input.name] = true;
    }

    for (var j = 0; j < node.widgets.length; j++) {
      var widget = node.widgets[j];
      if (!widget) continue;
      widget.disabled = !!(wired && wired[inputNameFor(widget)]);
    }
  }

  var originalDrawNodeWidgets = LGraphCanvas.prototype.drawNodeWidgets;
  LGraphCanvas.prototype.drawNodeWidgets = function (node, posY, ctx, active_widget) {
    syncDisabled(node);
    return originalDrawNodeWidgets.call(this, node, posY, ctx, active_widget);
  };

  // Also synced here, not just before drawing: a click is only guaranteed to see fresh flags if a frame
  // was drawn since the connection changed. That's true in practice (connecting marks the canvas dirty),
  // but this makes "a wired widget can't be edited" hold regardless of render timing rather than because
  // of it.
  var originalProcessNodeWidgets = LGraphCanvas.prototype.processNodeWidgets;
  LGraphCanvas.prototype.processNodeWidgets = function (node, pos, event, active_widget) {
    syncDisabled(node);
    return originalProcessNodeWidgets.call(this, node, pos, event, active_widget);
  };

  window.WiredWidgets = { sync: syncDisabled };
})();
