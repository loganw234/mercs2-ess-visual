/* nodes-function-calls.js -- dynamically registers one "Call: <name>" node type per Function Start node
 * found in the CURRENT graph (see nodes-function.js), so a user-defined function can actually be invoked
 * from elsewhere in the same graph. This is the one place in the whole tool where node TYPES themselves
 * are generated at runtime from graph CONTENT, rather than declared once in a nodes*.js file at page load
 * -- everything else here is static.
 *
 * FunctionCalls.rescan(graph) is called from app.js: once after every sample load, and once right before
 * every compile (so the compiled output is always correct even if the palette hasn't been manually
 * refreshed) -- see app.js for exactly where. It's cheap (a handful of nodes at most) so re-running it
 * liberally isn't a concern.
 *
 * KNOWN LIMITATION, worth knowing before it surprises you: rescanning only changes what NEW "Call: name"
 * nodes look like when dropped from the palette afterward. An ALREADY-PLACED Call node instance keeps
 * whatever inputs/outputs it was built with at drop time -- litegraph has no live pin-migration for an
 * existing node instance when its type's constructor is re-registered. Edit a function's params/returns
 * after already dropping a Call for it, and you need to delete + re-drop that Call node to pick up the new
 * signature. Solving this properly would need real per-instance pin migration on rescan; not worth the
 * complexity for a draft tool -- this is a documented gap, not a bug.
 */
window.FunctionCalls = (function () {
  "use strict";

  var FLOW_COLOR = "#1a5a6b";
  var FLOW_BGCOLOR = "#0c2a32";

  function splitNames(text) {
    return String(text || "").split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
  }

  function sanitize(name) {
    return String(name || "").trim().replace(/[^A-Za-z0-9_]/g, "_");
  }

  function makeCallType(name, params, returns) {
    function Call() {
      this.addInput("exec", LiteGraph.ACTION);
      this.addOutput("then", LiteGraph.EVENT);
      var self = this;
      // Same addInput+addProperty+addWidget triple every other data slot in this codebase has -- a typed
      // default ("nil") you can leave as-is or wire over, not a wire-only slot with no literal fallback.
      params.forEach(function (p) {
        self.addInput(p, "string");
        self.addProperty(p, "nil");
        self.addWidget("text", p, "nil", function (v) { self.properties[p] = v; }.bind(self));
      });
      returns.forEach(function (r) { self.addOutput(r, "string"); });
      this.color = FLOW_COLOR;
      this.bgcolor = FLOW_BGCOLOR;
    }
    Call.title = "Call: " + name;
    Call.desc = "Calls " + name + "(" + params.join(", ") + ")" + (returns.length ? " -> " + returns.join(", ") : "") + " -- defined by a Function Start node elsewhere in this graph.";
    Call.prototype.onAction = function () {
      var self = this;
      var args = params.map(function (p, i) { return CodeGen.resolveNumberInput(self, i + 1, p); });
      var callExpr = name + "(" + args.join(", ") + ")";
      if (returns.length) {
        var vars = returns.map(function () { return CodeGen.newLocal("ret"); });
        CodeGen.emit("local " + vars.join(", ") + " = " + callExpr);
        vars.forEach(function (v, i) { self.setOutputData(i + 1, v); });
      } else {
        CodeGen.emit(callExpr);
      }
      this.triggerSlot(0);
    };
    return Call;
  }

  var registeredTypes = [];

  function rescan(graph) {
    registeredTypes.forEach(function (type) { LiteGraph.unregisterNodeType(type); });
    registeredTypes = [];

    var starts = graph._nodes.filter(function (n) { return n.constructor.isFunctionStartNode; });
    starts.forEach(function (startNode) {
      var name = String(startNode.properties.name || "").trim();
      if (!name) return;
      var params = splitNames(startNode.properties.params);
      var returns = splitNames(startNode.properties.returns);
      var type = "flow/call/" + sanitize(name);
      LiteGraph.registerNodeType(type, makeCallType(name, params, returns));
      registeredTypes.push(type);
    });
  }

  return { rescan: rescan };
})();
