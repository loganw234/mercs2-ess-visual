/* runviz.js -- animates the exec chain on canvas so "Run" LOOKS like something is happening in order, not
 * just a script firing all at once.
 *
 * Compiling (and therefore Running) walks the real exec chain SYNCHRONOUSLY -- litegraph's own
 * triggerSlot machinery calls each downstream onAction in the same JS tick with no wall-clock gap between
 * them (see compiler.js's header), and the actual game executes the whole sent chunk in under a frame
 * regardless. Neither of those has any real "time between steps" to visualize. So this is a SEPARATE,
 * purely-visual walk over the same topology (following only EVENT-typed output links -- data wires carry
 * no flow, they're excluded), independently paced with real delays, run in parallel with the real compile+
 * send. It doesn't call onAction or touch CodeGen -- selectNode()/deselectAllNodes() are litegraph's own
 * selection APIs (the same ones palette.js already uses), so "current step" gets a real highlighted node
 * ring plus its connected links lit, for free, with no custom drawing code.
 */
window.RunViz = (function () {
  "use strict";

  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  function flowTargets(node) {
    var out = [];
    if (!node.outputs) return out;
    node.outputs.forEach(function (slot) {
      if (slot.type !== LiteGraph.EVENT) return;   // data outputs (e.g. Random Number's "value") aren't flow
      (slot.links || []).forEach(function (linkId) {
        var link = node.graph.links[linkId];
        var target = link && node.graph.getNodeById(link.target_id);
        if (target) out.push(target);
      });
    });
    return out;
  }

  // BFS from every isTriggerNode in the graph, one node highlighted at a time. Runs to completion even if
  // the graph changes mid-walk (a stale reference just stops producing further targets).
  async function animate(graph, canvas, stepDelay) {
    stepDelay = stepDelay || 260;
    var triggers = graph._nodes.filter(function (n) { return n.constructor.isTriggerNode; });
    var seen = {};

    for (var t = 0; t < triggers.length; t++) {
      var queue = [triggers[t]];
      while (queue.length) {
        var node = queue.shift();
        if (seen[node.id]) continue;
        seen[node.id] = true;

        canvas.selectNode(node);
        graph.setDirtyCanvas(true, true);
        await sleep(stepDelay);

        flowTargets(node).forEach(function (n) { queue.push(n); });
      }
    }

    canvas.deselectAllNodes();
    graph.setDirtyCanvas(true, true);
  }

  return { animate: animate };
})();
