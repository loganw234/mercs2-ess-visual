/* nodes-function.js -- user-defined functions: Function Start / Function Return mark the boundary of a
 * reusable Lua function, compiled once (compiler.js walks each Function Start's own chain into a separate
 * `local function name(...) ... end` block, ahead of the main script body) and invoked from anywhere else
 * in the SAME graph via a dynamically-generated "Call: name" node -- see src/nodes-function-calls.js for
 * how those get registered, and compiler.js's new pre-pass for how the function body itself gets compiled.
 *
 * Both nodes here use the same "comma-separated name list drives a dynamic set of pins" pattern: typing
 * into the `params`/`returns` text widget re-parses the list and rebuilds addOutput/addInput slots to
 * match, exactly like Compare/And/Or already do for a single value, just generalized to N names. Existing
 * wires into a slot that gets removed are dropped by litegraph's own removeInput/removeOutput (same
 * behavior as deleting any other input/output) -- there's no attempt to preserve a wire across a rename.
 *
 * DELIBERATE ASYMMETRY: Function Start's `params` becomes the function's REAL Lua parameter list --
 * `paramNames` are spliced directly into `local function name(a, b, c)`. Function Return's `returns` is
 * NOT similarly authoritative -- it's an independent declaration on each Return node, checked against its
 * owning Function Start's `returns` at COMPILE TIME (compiler.js), not synced live in the UI. A function
 * can have more than one Return node (early returns down different Branch paths); making every one of them
 * live-track a single Start node's property would need real cross-node event wiring for a benefit that's
 * mostly caught just as well by a clear compile error -- simpler and more robust for what this tool is.
 */
(function () {
  "use strict";

  function splitNames(text) {
    return String(text || "").split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
  }

  // ============================================================
  // Flow/FunctionStart -- the entry point of a user-defined function's own exec chain, compiled separately
  // from (and ahead of) the main script body. Not a `LiteGraph.isTriggerNode` -- a different kind of root,
  // marked `isFunctionStartNode` so compiler.js's pre-pass can find every one of these without also
  // sweeping up the real On Key Press triggers.
  // ============================================================
  function FunctionStart() {
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("name", "MyFunction");
    this.addWidget("text", "name", this.properties.name, function (v) { this.properties.name = v; }.bind(this));
    this.addProperty("params", "");
    this.addWidget("text", "params", this.properties.params, function (v) { this.properties.params = v; this.rebuildParams(); }.bind(this));
    this.addProperty("returns", "");
    this.addWidget("text", "returns", this.properties.returns, function (v) { this.properties.returns = v; }.bind(this));
    this.paramNames = [];
    this.rebuildParams();
  }
  FunctionStart.title = "Function Start";
  FunctionStart.desc = "Entry point of a user-defined function -- name it, list its params (comma-separated) and returns (comma-separated, for the Call node's outputs and Function Return's expected count).";
  FunctionStart.isFunctionStartNode = true;
  FunctionStart.prototype.fireOnce = function () { this.triggerSlot(0); };
  // Rebuilds the param OUTPUT slots (slot 0 is always "then") from the `params` text -- shape only, not
  // data. litegraph's setOutputData both stores the value on the output AND pushes it onto every link
  // CURRENTLY connected to that slot (lib/litegraph.js's LGraphNode.prototype.setOutputData) -- it does
  // NOT retroactively push to a link made afterward. Since this runs from the widget callback the moment
  // you type into `params`, typically well before you've wired anything to the new pins, setting data here
  // would silently go nowhere. Instead this only shapes the outputs array (so the pins exist immediately,
  // for wiring); onExecute below -- called once by compiler.js's existing flat data-node pre-pass, which
  // runs only after the whole graph's wiring is final -- is what actually pushes each param's literal name
  // out onto whatever's connected by then.
  FunctionStart.prototype.rebuildParams = function () {
    while (this.outputs.length > 1) this.removeOutput(this.outputs.length - 1);
    var names = splitNames(this.properties.params);
    var self = this;
    names.forEach(function (n) { self.addOutput(n, "string"); });
    this.paramNames = names;
  };
  FunctionStart.prototype.onExecute = function () {
    var self = this;
    (this.paramNames || []).forEach(function (n, i) { self.setOutputData(i + 1, n); });
  };
  FunctionStart.prototype.onConfigure = function () { this.rebuildParams(); };
  LiteGraph.registerNodeType("flow/functionstart", FunctionStart);

  // ============================================================
  // Flow/FunctionReturn -- `return a, b, ...` and the function's execution ends here (no "then" output,
  // matching Lua's own `return` semantics). A function can have several of these down different Branch
  // paths (early returns); each is checked independently against its owning Function Start's declared
  // `returns` at compile time (see this file's header for why that's not live-synced instead).
  // ============================================================
  function FunctionReturn() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addProperty("returns", "");
    this.addWidget("text", "returns", this.properties.returns, function (v) { this.properties.returns = v; this.rebuildReturns(); }.bind(this));
    this.returnNames = [];
    this.rebuildReturns();
  }
  FunctionReturn.title = "Function Return";
  FunctionReturn.desc = "return a, b, ... -- ends the function here. `returns` (comma-separated names) must match its Function Start's own `returns` list, checked at compile time.";
  FunctionReturn.isFunctionReturnNode = true;
  // Each return-value slot gets the same addInput+addProperty+addWidget triple every other data slot in
  // this codebase has -- a typed default ("nil" to start) you can leave as-is or wire over -- rather than
  // ONLY accepting a wire with no way to type a literal directly into the node. Since the slot list itself
  // is dynamic (driven by the `returns` text, not a fixed property per node), rebuilding also has to
  // manually truncate `this.widgets` back to the one static "returns" widget before re-adding one dynamic
  // widget per name -- litegraph has no removeWidget, addWidget only ever appends.
  FunctionReturn.prototype.rebuildReturns = function () {
    while (this.inputs.length > 1) this.removeInput(this.inputs.length - 1);
    this.widgets.length = 1;
    var names = splitNames(this.properties.returns);
    var self = this;
    names.forEach(function (n) {
      self.addInput(n, "string");
      if (self.properties[n] === undefined) self.properties[n] = "nil";
      self.addWidget("text", n, self.properties[n], function (v) { self.properties[n] = v; }.bind(self));
    });
    this.returnNames = names;
  };
  FunctionReturn.prototype.onConfigure = function () { this.rebuildReturns(); };
  FunctionReturn.prototype.onAction = function () {
    var self = this;
    var exprs = this.returnNames.map(function (n, i) { return CodeGen.resolveNumberInput(self, i + 1, n); });
    CodeGen.emit(exprs.length ? ("return " + exprs.join(", ")) : "return");
  };
  LiteGraph.registerNodeType("flow/functionreturn", FunctionReturn);
})();
