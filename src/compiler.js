/* compiler.js -- turns the current graph into a real scripts/OnKey/*.lua file.
 *
 * Two passes, deliberately in this order:
 *   1. Every pure-data node (has onExecute, no ACTION input -- e.g. Random Number) runs once, populating
 *      its output via setOutputData. These never depend on each other in this draft, so a single flat
 *      pass is enough; a graph with data-node-to-data-node chains would need a real topological sort here
 *      instead (out of scope for this draft -- see README's "what's deliberately not done yet").
 *   2. Every trigger node (isTriggerNode === true, e.g. On Key Press) fires once via its own fireOnce(),
 *      which synchronously walks the whole onAction -> triggerSlot -> onAction chain via litegraph's own
 *      event-propagation machinery -- this compiler doesn't re-implement graph traversal, it just kicks
 *      litegraph's real one off once per trigger and lets CodeGen collect whatever each node emits.
 *
 * This only targets an OnKey script export in this draft -- see README for why OnLoad/HTML-button targets
 * are noted as the natural next step rather than built here.
 */
window.Compiler = (function () {
  function isDataNode(node) {
    return typeof node.onExecute === "function" && !node.inputs?.some(function (i) { return i.type === LiteGraph.ACTION; });
  }

  // Follows only EVENT-typed output links (the exec chain) from a node -- runviz.js keeps its own copy of
  // this exact same shape for its (unrelated) animation walk; duplicated here rather than shared since the
  // two files serve different purposes and neither depends on the other.
  function flowTargets(node) {
    var out = [];
    if (!node.outputs) return out;
    node.outputs.forEach(function (slot) {
      if (slot.type !== LiteGraph.EVENT) return;
      (slot.links || []).forEach(function (linkId) {
        var link = node.graph.links[linkId];
        var target = link && node.graph.getNodeById(link.target_id);
        if (target) out.push(target);
      });
    });
    return out;
  }

  // findCycle(triggers) -> the first node found to be part of an exec-chain cycle, or null. A node's own
  // "then"/event output eventually looping back into itself would make litegraph's real triggerSlot
  // recursion (what fireOnce() below actually drives) recurse forever -- a genuinely easy accident once a
  // graph has a few branches (Flow/Branch's true/false, a node with fan-out to multiple downstream chains
  // that reconverge). Standard white/gray/black DFS: only revisiting a node still GRAY (on the CURRENT
  // path) is a cycle -- two different branches legitimately reconverging on the same downstream node later
  // is fine, that's just shared reuse, not a loop.
  function findCycle(triggers) {
    var state = {};
    function visit(node) {
      if (state[node.id] === "gray") return node;
      if (state[node.id] === "black") return null;
      state[node.id] = "gray";
      var targets = flowTargets(node);
      for (var i = 0; i < targets.length; i++) {
        var found = visit(targets[i]);
        if (found) return found;
      }
      state[node.id] = "black";
      return null;
    }
    for (var t = 0; t < triggers.length; t++) {
      var found = visit(triggers[t]);
      if (found) return found;
    }
    return null;
  }

  function compile(graph, opts) {
    opts = opts || {};
    CodeGen.reset();

    var triggers = graph._nodes.filter(function (node) { return node.constructor.isTriggerNode; });

    // A compiled script binds to exactly one key (KEYVAL, declared once for the OnKey loader) -- more than
    // one On Key Press node with DIFFERENT keys can't both be honored by a single script file. Catch this
    // up front rather than silently keying off only the first trigger while still compiling every other
    // trigger's chain into the body anyway (which used to mean the second trigger's chain ran on the FIRST
    // trigger's key, and its own key was never reachable at all).
    var keys = {};
    triggers.forEach(function (t) { keys[(t.properties && t.properties.key) || "insert"] = true; });
    var distinctKeys = Object.keys(keys);
    if (distinctKeys.length > 1) {
      return { ok: false, error: "Multiple On Key Press nodes with different keys (" + distinctKeys.join(", ") + ") -- a compiled script binds to exactly one key. Give every trigger the same key, or split into separate graphs." };
    }

    var cycleNode = findCycle(triggers);
    if (cycleNode) {
      return { ok: false, error: "Exec chain cycle at \"" + (cycleNode.title || cycleNode.type) + "\" -- a \"then\"/event output eventually loops back into itself. Compiling would recurse forever; remove the loop." };
    }

    graph._nodes.forEach(function (node) {
      if (isDataNode(node)) node.onExecute();
    });

    triggers.forEach(function (node) { node.fireOnce(); });

    var body = CodeGen.getLines();
    var key = (triggers[0] && triggers[0].properties && triggers[0].properties.key) || "insert";
    var name = opts.scriptName || "GraphOutput";

    var out = [];
    out.push('local KEYVAL = "' + key + '"  -- must be in the first 10 lines');
    out.push("");
    out.push("-- " + name + ".lua -- generated by mercs2-ess-visual. Edit the graph, not this file, and re-export.");
    out.push('if not _G.Ess then Loader.Printf("' + name + ': load Ess first (1_Ess.lua in scripts/OnLoad)") return end');
    out.push("");
    body.forEach(function (line) { out.push(line); });
    out.push("");
    out.push('Ess.Log("[' + name + '] ran")');
    out.push("");

    return {
      ok: true,
      triggerCount: triggers.length,
      lineCount: body.length,
      code: out.join("\n")
    };
  }

  return { compile: compile };
})();
