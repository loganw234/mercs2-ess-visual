/* nodes-missions.js -- Objective/Quest/Contract/Sandbox nodes, wrapping Ess.Easy.* from mercs2-lua-essentials.
 * Same three-part node shape as nodes.js (exec/then action nodes emitting one real Ess.* call each).
 *
 * COMPLETION CALLBACKS (onDone/onFail/onComplete on the Objective.* / Quest nodes below): modeled as raw
 * Lua-source TEXT properties -- the same "data is Lua source text" convention guids/points/factions lists
 * already use (see codegen.js header) -- spliced in as literal function-literal text, not represented as
 * visually-wired exec branches (compiler.js only assembles a flat sequence of statements; there's nowhere
 * to nest a downstream exec chain INSIDE a generated closure). Default text is the literal Lua token "nil"
 * (an unquoted identifier, not the string "nil"), matching each function's real nil-safe default -- so
 * every node here still compiles standalone with no required edits, same as everywhere else in this repo.
 * Contract's `opts` and Sandbox's `opts` are genuinely different (nil-safe TABLES, not callbacks) and stay
 * omitted entirely, same as before. Table-shaped params (spawns, at, steps) follow the same convention:
 * the raw widget string is spliced in unquoted, not computed.
 */
(function () {
  "use strict";

  // ============================================================
  // Ess/Objective/Reach -- Ess.Easy.Objective.reach(x, y, z, r, label, onDone)
  // Verified against src/59_objective.lua: r defaults to 8 Lua-side if omitted.
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
    this.addProperty("onDone", "nil");
    this.addWidget("text", "onDone (nil = none)", this.properties.onDone, function (v) { this.properties.onDone = v; }.bind(this));
    this.addOutput("objective", "string");
  }
  ObjectiveReach.title = "Objective: Reach";
  ObjectiveReach.desc = "Ess.Easy.Objective.reach(x, y, z, r, label, onDone) -> objective";
  ObjectiveReach.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");   // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var r = CodeGen.resolveNumberInput(this, 4, "r");
    var label = CodeGen.luaString(this.properties.label);
    var varName = CodeGen.newLocal("objective");
    CodeGen.emitCapture(varName, "Ess.Easy.Objective.reach(" + x + ", " + y + ", " + z + ", " + r + ", " + label + ", " + this.properties.onDone + ")");
    this.setOutputData(1, varName);   // "objective" is output slot 1 -- "then" (EVENT) took slot 0
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
    this.addProperty("onDone", "nil");
    this.addWidget("text", "onDone (nil = none)", this.properties.onDone, function (v) { this.properties.onDone = v; }.bind(this));
    this.addOutput("objective", "string");
  }
  ObjectiveDestroy.title = "Objective: Destroy";
  ObjectiveDestroy.desc = "Ess.Easy.Objective.destroy(guid, label, onDone) -> objective";
  ObjectiveDestroy.prototype.onAction = function () {
    var guid = CodeGen.resolveNumberInput(this, 1, "guid");  // raw Lua expression, spliced unquoted
    var label = CodeGen.luaString(this.properties.label);
    var varName = CodeGen.newLocal("objective");
    CodeGen.emitCapture(varName, "Ess.Easy.Objective.destroy(" + guid + ", " + label + ", " + this.properties.onDone + ")");
    this.setOutputData(1, varName);   // "objective" is output slot 1 -- "then" (EVENT) took slot 0
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
    this.addProperty("onDone", "nil");
    this.addWidget("text", "onDone (nil = none)", this.properties.onDone, function (v) { this.properties.onDone = v; }.bind(this));
    this.addOutput("objective", "string");
  }
  ObjectiveClear.title = "Objective: Clear";
  ObjectiveClear.desc = "Ess.Easy.Objective.clear(x, y, z, r, faction, label, onDone) -> objective";
  ObjectiveClear.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");   // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var r = CodeGen.resolveNumberInput(this, 4, "r");
    var faction = CodeGen.luaString(this.properties.faction);
    var label = CodeGen.luaString(this.properties.label);
    var varName = CodeGen.newLocal("objective");
    CodeGen.emitCapture(varName, "Ess.Easy.Objective.clear(" + x + ", " + y + ", " + z + ", " + r + ", " + faction + ", " + label + ", " + this.properties.onDone + ")");
    this.setOutputData(1, varName);   // "objective" is output slot 1 -- "then" (EVENT) took slot 0
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
    this.addProperty("onDone", "nil");
    this.addWidget("text", "onDone (nil = none)", this.properties.onDone, function (v) { this.properties.onDone = v; }.bind(this));
    this.addProperty("onFail", "nil");
    this.addWidget("text", "onFail (nil = none)", this.properties.onFail, function (v) { this.properties.onFail = v; }.bind(this));
    this.addOutput("objective", "string");
  }
  ObjectiveSurvive.title = "Objective: Survive";
  ObjectiveSurvive.desc = "Ess.Easy.Objective.survive(seconds, label, onDone, onFail) -> objective";
  ObjectiveSurvive.prototype.onAction = function () {
    var seconds = CodeGen.resolveNumberInput(this, 1, "seconds");  // input 0 is "exec"
    var label = CodeGen.luaString(this.properties.label);
    var varName = CodeGen.newLocal("objective");
    CodeGen.emitCapture(varName, "Ess.Easy.Objective.survive(" + seconds + ", " + label + ", " + this.properties.onDone + ", " + this.properties.onFail + ")");
    this.setOutputData(1, varName);   // "objective" is output slot 1 -- "then" (EVENT) took slot 0
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
    this.addProperty("onComplete", "nil");
    this.addWidget("text", "onComplete (nil = none)", this.properties.onComplete, function (v) { this.properties.onComplete = v; }.bind(this));
    this.addOutput("quest", "string");
  }
  QuestCreate.title = "Quest: Create";
  QuestCreate.desc = "Ess.Easy.Quest(steps, onComplete) -> quest";
  QuestCreate.prototype.onAction = function () {
    var varName = CodeGen.newLocal("quest");
    CodeGen.emitCapture(varName, "Ess.Easy.Quest(" + this.properties.steps + ", " + this.properties.onComplete + ")");
    this.setOutputData(1, varName);   // "quest" is output slot 1 -- "then" (EVENT) took slot 0
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
    this.addOutput("sId", "string");
  }
  ContractDestroy.title = "Contract: Destroy";
  ContractDestroy.desc = "Ess.Easy.Contract.destroy(title, spawns) -- opts omitted (nil-safe), see file header -> sId";
  ContractDestroy.prototype.onAction = function () {
    var title = CodeGen.luaString(this.properties.title);
    var varName = CodeGen.newLocal("sId");
    CodeGen.emitCapture(varName, "Ess.Easy.Contract.destroy(" + title + ", " + this.properties.spawns + ")");
    this.setOutputData(1, varName);   // "sId" is output slot 1 -- "then" (EVENT) took slot 0
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
    this.addOutput("sId", "string");
  }
  ContractReach.title = "Contract: Reach";
  ContractReach.desc = "Ess.Easy.Contract.reach(title, at, radius) -- opts omitted (nil-safe), see file header -> sId";
  ContractReach.prototype.onAction = function () {
    var radius = CodeGen.resolveNumberInput(this, 1, "radius");  // input 0 is "exec"
    var title = CodeGen.luaString(this.properties.title);
    var varName = CodeGen.newLocal("sId");
    CodeGen.emitCapture(varName, "Ess.Easy.Contract.reach(" + title + ", " + this.properties.at + ", " + radius + ")");
    this.setOutputData(1, varName);   // "sId" is output slot 1 -- "then" (EVENT) took slot 0
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
    this.addOutput("success", "string");
  }
  SandboxArena.title = "Sandbox: Arena";
  SandboxArena.desc = "Ess.Easy.Sandbox.arena(id) -- opts omitted (nil-safe), see file header -> success";
  SandboxArena.prototype.onAction = function () {
    var varName = CodeGen.newLocal("success");
    CodeGen.emitCapture(varName, "Ess.Easy.Sandbox.arena(" + CodeGen.luaString(this.properties.id) + ")");
    this.setOutputData(1, varName);   // "success" is output slot 1 -- "then" (EVENT) took slot 0
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
