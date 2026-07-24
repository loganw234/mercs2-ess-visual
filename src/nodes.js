/* nodes.js -- the small set of custom Ess-flavored node types this draft ships with. Each is deliberately
 * a thin wrapper: one real Ess.* call, one node. Adding your own follows the same three-part shape every
 * node here uses:
 *   1. addInput("exec", LiteGraph.ACTION) / addOutput("then", LiteGraph.EVENT) for anything that should
 *      chain in sequence (an action node) -- litegraph's own built-in event-slot system, not something
 *      invented for this repo (see FilterEvent in lib/litegraph.js for the same pattern upstream).
 *   2. addInput(name, "number"/"string") for anything the node needs a value for -- gets a widget by
 *      default, gets overridden by a wire if one's connected (CodeGen.resolveNumberInput / this.properties).
 *   3. onAction(action, param) that calls CodeGen.emit(...) with the real Lua line, then this.triggerSlot(0)
 *      to continue the chain. Pure-data nodes (no ACTION input) use onExecute + setOutputData instead --
 *      see RandomNumber below.
 */
(function () {
  "use strict";

  // ============================================================
  // Ess/OnKeyPress -- the one trigger node in this draft. Compiling walks from every node with
  // isTriggerNode === true, firing its output once. See compiler.js.
  // ============================================================
  function OnKeyPress() {
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("key", "insert");
    this.addWidget("text", "key", this.properties.key, function (v) { this.properties.key = v; }.bind(this));
    this.size = [180, 60];
    this.color = "#2a4d3a";
  }
  OnKeyPress.title = "On Key Press";
  OnKeyPress.desc = "Root trigger for an OnKey script -- fires once per compile, walking the chain below it.";
  OnKeyPress.isTriggerNode = true;
  OnKeyPress.prototype.fireOnce = function () { this.triggerSlot(0); };
  LiteGraph.registerNodeType("ess/onkeypress", OnKeyPress);

  // ============================================================
  // Ess/GiveCash -- Ess.Player.giveCash(amount)
  // ============================================================
  function GiveCash() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("amount", "number");
    this.addProperty("amount", 1000000);
    this.addWidget("number", "amount", this.properties.amount, function (v) { this.properties.amount = v; }.bind(this));
  }
  GiveCash.title = "Give Cash";
  GiveCash.desc = "Ess.Player.giveCash(amount)";
  GiveCash.prototype.onAction = function () {
    var amount = CodeGen.resolveNumberInput(this, 1, "amount");  // input 0 is "exec"
    CodeGen.emit("Ess.Player.giveCash(" + amount + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/givecash", GiveCash);

  // ============================================================
  // Ess/ToastMessage -- Ess.Easy.Toast(message)
  // ============================================================
  function ToastMessage() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("message", "Hello from the graph!");
    this.addWidget("text", "message", this.properties.message, function (v) { this.properties.message = v; }.bind(this));
  }
  ToastMessage.title = "Toast Message";
  ToastMessage.desc = "Ess.Easy.Toast(message)";
  ToastMessage.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Toast(" + CodeGen.luaString(this.properties.message) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/toastmessage", ToastMessage);

  // ============================================================
  // Ess/SpawnAhead -- Ess.Object.spawnAhead(template, distance). "distance" can come from the widget OR
  // a connected data node (e.g. Random Number below) -- the point of having a data input at all.
  // ============================================================
  function SpawnAhead() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("template", "Veyron");
    this.addWidget("text", "template", this.properties.template, function (v) { this.properties.template = v; }.bind(this));
    this.addInput("distance", "number");
    this.addProperty("distance", 8);
    this.addWidget("number", "distance", this.properties.distance, function (v) { this.properties.distance = v; }.bind(this));
  }
  SpawnAhead.title = "Spawn Ahead";
  SpawnAhead.desc = "Ess.Object.spawnAhead(template, distance)";
  SpawnAhead.prototype.onAction = function () {
    var distance = CodeGen.resolveNumberInput(this, 1, "distance");  // input 0 is "exec"
    CodeGen.emit("Ess.Object.spawnAhead(" + CodeGen.luaString(this.properties.template) + ", " + distance + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/spawnahead", SpawnAhead);

  // ============================================================
  // Ess/RandomNumber -- a PURE DATA node, no exec pins at all. Its "value" is never a real JS number --
  // it's a Lua expression, so the randomness happens in-game at runtime, not once at compile time. This
  // is the node that demonstrates the thing blocks/Scratch are awkward at: wire its output straight into
  // Spawn Ahead's "distance" input instead of typing a fixed number.
  //
  // Uses Ess.RNG, NOT math.random -- an earlier version of this node emitted raw math.random(min, max),
  // which is exactly the trap Ess.RNG exists to route around (this engine's 32-bit float numbers make a
  // naive LCG silently degenerate; see CONTRIBUTING.md's "Engine rules" in mercs2-lua-essentials, and
  // src/53_rng.lua's own header for the confirmed WaveDefense.lua incident that motivated it). Note
  // Ess.RNG:int(n) returns [1, n], not a (min, max) range -- the offset math below converts one to the
  // other. A fresh Ess.RNG.new() per call is a little wasteful next to a shared instance reused across
  // many rolls, but it's correct (still routes through the engine-safe generator) and needs no change to
  // compiler.js's flat-statement model -- a shared top-level `local RNG = Ess.RNG.new()` preamble would be
  // the next step if this node ends up used heavily in one script.
  // ============================================================
  function RandomNumber() {
    this.addOutput("value", "number");
    this.addProperty("min", 5);
    this.addProperty("max", 15);
    this.addWidget("number", "min", this.properties.min, function (v) { this.properties.min = v; }.bind(this));
    this.addWidget("number", "max", this.properties.max, function (v) { this.properties.max = v; }.bind(this));
    this.size = [160, 80];
  }
  RandomNumber.title = "Random Number";
  RandomNumber.desc = "Ess.RNG.new():int(...) -- emits Lua source, not a computed value (see codegen.js header)";
  RandomNumber.prototype.onExecute = function () {
    var min = this.properties.min, max = this.properties.max;
    var range = Math.max(1, max - min + 1);
    this.setOutputData(0, "(Ess.RNG.new():int(" + range + ") + " + (min - 1) + ")");
  };
  LiteGraph.registerNodeType("ess/randomnumber", RandomNumber);
})();
