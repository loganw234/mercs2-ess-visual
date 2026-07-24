/* nodes-missions.js -- Objective/Quest/Contract/Sandbox nodes, wrapping Ess.Easy.* from mercs2-lua-essentials.
 * Same three-part node shape as nodes.js (exec/then action nodes emitting one real Ess.* call each).
 *
 * SCOPE CUT (applies to every node below that wraps a real onDone/onFail-taking function -- Objective.reach,
 * Objective.destroy, Objective.clear, Objective.survive, Ess.Easy.Quest's onComplete, and both Contract
 * builders' completion path via tOpts): compiler.js only supports a flat sequence of statements right now,
 * it can't nest generated code inside a Lua closure yet, so there's nowhere to plug a completion callback
 * in from the graph. Every such trailing callback param is simply omitted from the generated call (left to
 * its Lua-side default of nil) rather than wired up -- a deliberate, documented scope cut for this pass, not
 * a bug. Table-shaped params (spawns, at, steps, Sandbox/Contract opts) follow the same "widget text IS Lua
 * source" idea as Random Number in nodes.js: the raw widget string is spliced in unquoted, not computed.
 */
(function () {
  "use strict";

  // ============================================================
  // Ess/Objective/Reach -- Ess.Easy.Objective.reach(x, y, z, r, label[, onDone])
  // Verified against src/59_objective.lua: r defaults to 8 Lua-side if omitted; onDone omitted per scope cut.
  // ============================================================
  function ObjectiveReach() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("x", "number");
    this.addProperty("x", 0);
    this.addWidget("number", "x", this.properties.x, function (v) { this.properties.x = v; }.bind(this));
    this.addInput("y", "number");
    this.addProperty("y", 0);
    this.addWidget("number", "y", this.properties.y, function (v) { this.properties.y = v; }.bind(this));
    this.addInput("z", "number");
    this.addProperty("z", 0);
    this.addWidget("number", "z", this.properties.z, function (v) { this.properties.z = v; }.bind(this));
    this.addInput("r", "number");
    this.addProperty("r", 8);
    this.addWidget("number", "r", this.properties.r, function (v) { this.properties.r = v; }.bind(this));
    this.addProperty("label", "Reach the marker");
    this.addWidget("text", "label", this.properties.label, function (v) { this.properties.label = v; }.bind(this));
  }
  ObjectiveReach.title = "Objective: Reach";
  ObjectiveReach.desc = "Ess.Easy.Objective.reach(x, y, z, r, label) -- onDone omitted, see file header";
  ObjectiveReach.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");   // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var r = CodeGen.resolveNumberInput(this, 4, "r");
    var label = CodeGen.luaString(this.properties.label);
    CodeGen.emit("Ess.Easy.Objective.reach(" + x + ", " + y + ", " + z + ", " + r + ", " + label + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/objective/reach", ObjectiveReach);

  // ============================================================
  // Ess/Objective/Destroy -- Ess.Easy.Objective.destroy(guid, label[, onDone])
  // guid is a DATA input carrying raw Lua expression text (like RandomNumber's output), not a quoted string --
  // default text is a placeholder call that resolves to the local player's character at runtime.
  // ============================================================
  function ObjectiveDestroy() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("label", "Destroy the target");
    this.addWidget("text", "label", this.properties.label, function (v) { this.properties.label = v; }.bind(this));
  }
  ObjectiveDestroy.title = "Objective: Destroy";
  ObjectiveDestroy.desc = "Ess.Easy.Objective.destroy(guid, label) -- onDone omitted, see file header";
  ObjectiveDestroy.prototype.onAction = function () {
    var guid = CodeGen.resolveNumberInput(this, 1, "guid");  // raw Lua expression, spliced unquoted
    var label = CodeGen.luaString(this.properties.label);
    CodeGen.emit("Ess.Easy.Objective.destroy(" + guid + ", " + label + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/objective/destroy", ObjectiveDestroy);

  // ============================================================
  // Ess/Objective/Clear -- Ess.Easy.Objective.clear(x, y, z, r, faction, label[, onDone])
  // faction is an Object.HasLabel string (e.g. "VZ"); real Lua treats a nil faction as "all humans", but
  // this node always emits a quoted literal per the assignment spec, so leave faction blank to match that.
  // ============================================================
  function ObjectiveClear() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("x", "number");
    this.addProperty("x", 0);
    this.addWidget("number", "x", this.properties.x, function (v) { this.properties.x = v; }.bind(this));
    this.addInput("y", "number");
    this.addProperty("y", 0);
    this.addWidget("number", "y", this.properties.y, function (v) { this.properties.y = v; }.bind(this));
    this.addInput("z", "number");
    this.addProperty("z", 0);
    this.addWidget("number", "z", this.properties.z, function (v) { this.properties.z = v; }.bind(this));
    this.addInput("r", "number");
    this.addProperty("r", 40);
    this.addWidget("number", "r", this.properties.r, function (v) { this.properties.r = v; }.bind(this));
    this.addProperty("faction", "VZ");
    this.addWidget("text", "faction", this.properties.faction, function (v) { this.properties.faction = v; }.bind(this));
    this.addProperty("label", "Clear the area");
    this.addWidget("text", "label", this.properties.label, function (v) { this.properties.label = v; }.bind(this));
  }
  ObjectiveClear.title = "Objective: Clear";
  ObjectiveClear.desc = "Ess.Easy.Objective.clear(x, y, z, r, faction, label) -- onDone omitted, see file header";
  ObjectiveClear.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");   // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var r = CodeGen.resolveNumberInput(this, 4, "r");
    var faction = CodeGen.luaString(this.properties.faction);
    var label = CodeGen.luaString(this.properties.label);
    CodeGen.emit("Ess.Easy.Objective.clear(" + x + ", " + y + ", " + z + ", " + r + ", " + faction + ", " + label + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/objective/clear", ObjectiveClear);

  // ============================================================
  // Ess/Objective/Survive -- Ess.Easy.Objective.survive(seconds, label[, onDone, onFail])
  // ============================================================
  function ObjectiveSurvive() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("seconds", "number");
    this.addProperty("seconds", 30);
    this.addWidget("number", "seconds", this.properties.seconds, function (v) { this.properties.seconds = v; }.bind(this));
    this.addProperty("label", "Survive");
    this.addWidget("text", "label", this.properties.label, function (v) { this.properties.label = v; }.bind(this));
  }
  ObjectiveSurvive.title = "Objective: Survive";
  ObjectiveSurvive.desc = "Ess.Easy.Objective.survive(seconds, label) -- onDone/onFail omitted, see file header";
  ObjectiveSurvive.prototype.onAction = function () {
    var seconds = CodeGen.resolveNumberInput(this, 1, "seconds");  // input 0 is "exec"
    var label = CodeGen.luaString(this.properties.label);
    CodeGen.emit("Ess.Easy.Objective.survive(" + seconds + ", " + label + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/objective/survive", ObjectiveSurvive);

  // ============================================================
  // Ess/Quest/Create -- Ess.Easy.Quest(steps[, onComplete])
  // steps is a Lua table literal, same "widget text IS Lua source" idea as spawns/at below -- spliced
  // unquoted, not a quoted string.
  // ============================================================
  function QuestCreate() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("steps", "{ 'Step one', 'Step two' }");
    this.addWidget("text", "steps", this.properties.steps, function (v) { this.properties.steps = v; }.bind(this));
  }
  QuestCreate.title = "Quest: Create";
  QuestCreate.desc = "Ess.Easy.Quest(steps) -- onComplete omitted, see file header";
  QuestCreate.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Quest(" + this.properties.steps + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/quest/create", QuestCreate);

  // ============================================================
  // Ess/Contract/Destroy -- Ess.Easy.Contract.destroy(title, spawns[, opts])
  // Verified against src/83_contract_easy.lua: tOpts = tOpts or {} -- nil-safe, so opts is omitted entirely
  // here rather than given a widget (same treatment as every omitted onDone/onFail above).
  // ============================================================
  function ContractDestroy() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("title", "Destroy the convoy");
    this.addWidget("text", "title", this.properties.title, function (v) { this.properties.title = v; }.bind(this));
    this.addProperty("spawns", "{ {'Veyron', 0,0,0, 0} }");
    this.addWidget("text", "spawns", this.properties.spawns, function (v) { this.properties.spawns = v; }.bind(this));
  }
  ContractDestroy.title = "Contract: Destroy";
  ContractDestroy.desc = "Ess.Easy.Contract.destroy(title, spawns) -- opts omitted (nil-safe), see file header";
  ContractDestroy.prototype.onAction = function () {
    var title = CodeGen.luaString(this.properties.title);
    CodeGen.emit("Ess.Easy.Contract.destroy(" + title + ", " + this.properties.spawns + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/contract/destroy", ContractDestroy);

  // ============================================================
  // Ess/Contract/Reach -- Ess.Easy.Contract.reach(title, at, radius[, opts])
  // Same nil-safe tOpts as Contract.destroy above -- opts omitted entirely.
  // ============================================================
  function ContractReach() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("title", "Reach the drop point");
    this.addWidget("text", "title", this.properties.title, function (v) { this.properties.title = v; }.bind(this));
    this.addProperty("at", "{0,0,0}");
    this.addWidget("text", "at", this.properties.at, function (v) { this.properties.at = v; }.bind(this));
    this.addInput("radius", "number");
    this.addProperty("radius", 8);
    this.addWidget("number", "radius", this.properties.radius, function (v) { this.properties.radius = v; }.bind(this));
  }
  ContractReach.title = "Contract: Reach";
  ContractReach.desc = "Ess.Easy.Contract.reach(title, at, radius) -- opts omitted (nil-safe), see file header";
  ContractReach.prototype.onAction = function () {
    var radius = CodeGen.resolveNumberInput(this, 1, "radius");  // input 0 is "exec"
    var title = CodeGen.luaString(this.properties.title);
    CodeGen.emit("Ess.Easy.Contract.reach(" + title + ", " + this.properties.at + ", " + radius + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/contract/reach", ContractReach);

  // ============================================================
  // Ess/Sandbox/Arena -- Ess.Easy.Sandbox.arena(id[, opts])
  // Verified against src/63_sandbox_easy.lua + src/63_sandbox.lua: opts flows straight into
  // Ess.Sandbox.begin(id, providerNames, opts), which does `opts = opts or {}` -- nil-safe with a sane
  // empty default, so opts is omitted entirely and this node only takes id.
  // ============================================================
  function SandboxArena() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("id", "arena1");
    this.addWidget("text", "id", this.properties.id, function (v) { this.properties.id = v; }.bind(this));
  }
  SandboxArena.title = "Sandbox: Arena";
  SandboxArena.desc = "Ess.Easy.Sandbox.arena(id) -- opts omitted (nil-safe), see file header";
  SandboxArena.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Sandbox.arena(" + CodeGen.luaString(this.properties.id) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/sandbox/arena", SandboxArena);

  // ============================================================
  // Ess/Sandbox/Done -- Ess.Easy.Sandbox.done(id)
  // ============================================================
  function SandboxDone() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("id", "arena1");
    this.addWidget("text", "id", this.properties.id, function (v) { this.properties.id = v; }.bind(this));
  }
  SandboxDone.title = "Sandbox: Done";
  SandboxDone.desc = "Ess.Easy.Sandbox.done(id)";
  SandboxDone.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Sandbox.done(" + CodeGen.luaString(this.properties.id) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/sandbox/done", SandboxDone);
})();
