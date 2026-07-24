/* nodes-encounter.js -- ess/aiorders/*, ess/relations/*, ess/support/* nodes. Same three-part shape as
 * nodes.js: exec-in/then-out action nodes wrapping one real Ess.* call each (see that file's header).
 *
 * LIST/TABLE CONVENTION: guid lists, point lists, and faction lists are modeled as STRING widgets whose
 * value IS a literal Lua table constructor (e.g. "{ Ess.Guid('some_unit') }" or "{ {0,0,0}, {10,0,10} }"),
 * spliced verbatim into the generated call -- never through CodeGen.luaString, since the text already IS
 * Lua code, not a string to be quoted (same "data is Lua source text" model RandomNumber uses in nodes.js).
 *
 * SKIPPED ON PURPOSE: Ess.Easy.Triggers.* (onPlayerNear/onDeath/after) are NOT included in this pass --
 * they take completion callbacks (fn), which needs a second kind of trigger-root node plus nested-closure
 * codegen this compiler doesn't support yet. Out of scope here; not an oversight.
 */
(function () {
  "use strict";

  // ============================================================
  // Ess/AIOrders/Attack -- Ess.Easy.AIOrders.attack(guids, target)
  // ============================================================
  function AIOrdersAttack() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guids", "string");
    this.addProperty("guids", "{ Ess.Guid('some_unit') }");
    this.addWidget("text", "guids", this.properties.guids, function (v) { this.properties.guids = v; }.bind(this));
    this.addInput("target", "string");
    this.addProperty("target", "Ess.Player.character(0)");
    this.addWidget("text", "target", this.properties.target, function (v) { this.properties.target = v; }.bind(this));
  }
  AIOrdersAttack.title = "AI Orders: Attack";
  AIOrdersAttack.desc = "Ess.Easy.AIOrders.attack(guids, target)";
  AIOrdersAttack.prototype.onAction = function () {
    var guids = CodeGen.resolveNumberInput(this, 1, "guids");    // input 0 is "exec"
    var target = CodeGen.resolveNumberInput(this, 2, "target");
    CodeGen.emit("Ess.Easy.AIOrders.attack(" + guids + ", " + target + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/aiorders/attack", AIOrdersAttack);

  // ============================================================
  // Ess/AIOrders/Patrol -- Ess.Easy.AIOrders.patrol(guids, points)
  // ============================================================
  function AIOrdersPatrol() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guids", "string");
    this.addProperty("guids", "{ Ess.Guid('some_unit') }");
    this.addWidget("text", "guids", this.properties.guids, function (v) { this.properties.guids = v; }.bind(this));
    this.addInput("points", "string");
    this.addProperty("points", "{ {0,0,0}, {10,0,10} }");
    this.addWidget("text", "points", this.properties.points, function (v) { this.properties.points = v; }.bind(this));
  }
  AIOrdersPatrol.title = "AI Orders: Patrol";
  AIOrdersPatrol.desc = "Ess.Easy.AIOrders.patrol(guids, points)";
  AIOrdersPatrol.prototype.onAction = function () {
    var guids = CodeGen.resolveNumberInput(this, 1, "guids");    // input 0 is "exec"
    var points = CodeGen.resolveNumberInput(this, 2, "points");
    CodeGen.emit("Ess.Easy.AIOrders.patrol(" + guids + ", " + points + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/aiorders/patrol", AIOrdersPatrol);

  // ============================================================
  // Ess/AIOrders/Guard -- Ess.Easy.AIOrders.guard(guids, at). Confirmed against
  // mercs2-lua-essentials/src/60_aiorders.lua: opts.at is a SINGLE {x,y,z} point table (same shape as one
  // entry of patrol's "points" list), not flat x/y/z coordinate args -- so "at" is a table-literal string
  // input too, not three number inputs.
  // ============================================================
  function AIOrdersGuard() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guids", "string");
    this.addProperty("guids", "{ Ess.Guid('some_unit') }");
    this.addWidget("text", "guids", this.properties.guids, function (v) { this.properties.guids = v; }.bind(this));
    this.addInput("at", "string");
    this.addProperty("at", "{0,0,0}");
    this.addWidget("text", "at", this.properties.at, function (v) { this.properties.at = v; }.bind(this));
  }
  AIOrdersGuard.title = "AI Orders: Guard";
  AIOrdersGuard.desc = "Ess.Easy.AIOrders.guard(guids, at)";
  AIOrdersGuard.prototype.onAction = function () {
    var guids = CodeGen.resolveNumberInput(this, 1, "guids");    // input 0 is "exec"
    var at = CodeGen.resolveNumberInput(this, 2, "at");
    CodeGen.emit("Ess.Easy.AIOrders.guard(" + guids + ", " + at + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/aiorders/guard", AIOrdersGuard);

  // ============================================================
  // Ess/Relations/MakeHostile -- Ess.Easy.Relations.makeHostile(factionList)
  // ============================================================
  function RelationsMakeHostile() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("factions", "string");
    this.addProperty("factions", "{ 'chinese' }");
    this.addWidget("text", "factions", this.properties.factions, function (v) { this.properties.factions = v; }.bind(this));
  }
  RelationsMakeHostile.title = "Relations: Make Hostile";
  RelationsMakeHostile.desc = "Ess.Easy.Relations.makeHostile(factionList)";
  RelationsMakeHostile.prototype.onAction = function () {
    var factions = CodeGen.resolveNumberInput(this, 1, "factions");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Relations.makeHostile(" + factions + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/relations/makehostile", RelationsMakeHostile);

  // ============================================================
  // Ess/Relations/MakeAllies -- Ess.Easy.Relations.makeAllies(factionList)
  // ============================================================
  function RelationsMakeAllies() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("factions", "string");
    this.addProperty("factions", "{ 'chinese' }");
    this.addWidget("text", "factions", this.properties.factions, function (v) { this.properties.factions = v; }.bind(this));
  }
  RelationsMakeAllies.title = "Relations: Make Allies";
  RelationsMakeAllies.desc = "Ess.Easy.Relations.makeAllies(factionList)";
  RelationsMakeAllies.prototype.onAction = function () {
    var factions = CodeGen.resolveNumberInput(this, 1, "factions");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Relations.makeAllies(" + factions + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/relations/makeallies", RelationsMakeAllies);

  // ============================================================
  // Ess/Relations/War -- Ess.Easy.Relations.war(a, b). "a"/"b" are plain faction-name strings (not table
  // literals), so they're quoted via CodeGen.luaString when emitted.
  // ============================================================
  function RelationsWar() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("a", "string");
    this.addProperty("a", "chinese");
    this.addWidget("text", "a", this.properties.a, function (v) { this.properties.a = v; }.bind(this));
    this.addInput("b", "string");
    this.addProperty("b", "russian");
    this.addWidget("text", "b", this.properties.b, function (v) { this.properties.b = v; }.bind(this));
  }
  RelationsWar.title = "Relations: War";
  RelationsWar.desc = "Ess.Easy.Relations.war(a, b)";
  RelationsWar.prototype.onAction = function () {
    var a = CodeGen.resolveNumberInput(this, 1, "a");  // input 0 is "exec"
    var b = CodeGen.resolveNumberInput(this, 2, "b");
    CodeGen.emit("Ess.Easy.Relations.war(" + CodeGen.luaString(a) + ", " + CodeGen.luaString(b) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/relations/war", RelationsWar);

  // ============================================================
  // Ess/Relations/SideWith -- Ess.Easy.Relations.sideWith(friend, foe). Plain faction-name strings,
  // quoted via CodeGen.luaString when emitted (same as War above).
  // ============================================================
  function RelationsSideWith() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("friend", "string");
    this.addProperty("friend", "chinese");
    this.addWidget("text", "friend", this.properties.friend, function (v) { this.properties.friend = v; }.bind(this));
    this.addInput("foe", "string");
    this.addProperty("foe", "russian");
    this.addWidget("text", "foe", this.properties.foe, function (v) { this.properties.foe = v; }.bind(this));
  }
  RelationsSideWith.title = "Relations: Side With";
  RelationsSideWith.desc = "Ess.Easy.Relations.sideWith(friend, foe)";
  RelationsSideWith.prototype.onAction = function () {
    var friend = CodeGen.resolveNumberInput(this, 1, "friend");  // input 0 is "exec"
    var foe = CodeGen.resolveNumberInput(this, 2, "foe");
    CodeGen.emit("Ess.Easy.Relations.sideWith(" + CodeGen.luaString(friend) + ", " + CodeGen.luaString(foe) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/relations/sidewith", RelationsSideWith);

  // ============================================================
  // Ess/Relations/Restore -- Ess.Easy.Relations.restore(). No args.
  // ============================================================
  function RelationsRestore() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  RelationsRestore.title = "Relations: Restore";
  RelationsRestore.desc = "Ess.Easy.Relations.restore()";
  RelationsRestore.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Relations.restore()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/relations/restore", RelationsRestore);

  // ============================================================
  // Ess/Support/AirstrikeAt -- Ess.Easy.Airstrike.at(x, y, z)
  // ============================================================
  function AirstrikeAt() {
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
  }
  AirstrikeAt.title = "Airstrike At";
  AirstrikeAt.desc = "Ess.Easy.Airstrike.at(x, y, z)";
  AirstrikeAt.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");  // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    CodeGen.emit("Ess.Easy.Airstrike.at(" + x + ", " + y + ", " + z + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/support/airstrikeat", AirstrikeAt);

  // ============================================================
  // Ess/Support/AirstrikeOnTarget -- Ess.Easy.Airstrike.onTarget(i)
  // ============================================================
  function AirstrikeOnTarget() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("i", "number");
    this.addProperty("i", 0);
    this.addWidget("number", "i", this.properties.i, function (v) { this.properties.i = v; }.bind(this));
  }
  AirstrikeOnTarget.title = "Airstrike On Target";
  AirstrikeOnTarget.desc = "Ess.Easy.Airstrike.onTarget(i)";
  AirstrikeOnTarget.prototype.onAction = function () {
    var i = CodeGen.resolveNumberInput(this, 1, "i");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Airstrike.onTarget(" + i + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/support/airstrikeontarget", AirstrikeOnTarget);

  // ============================================================
  // Ess/Support/AirstrikeOnMe -- Ess.Easy.Airstrike.onMe(i)
  // ============================================================
  function AirstrikeOnMe() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("i", "number");
    this.addProperty("i", 0);
    this.addWidget("number", "i", this.properties.i, function (v) { this.properties.i = v; }.bind(this));
  }
  AirstrikeOnMe.title = "Airstrike On Me";
  AirstrikeOnMe.desc = "Ess.Easy.Airstrike.onMe(i)";
  AirstrikeOnMe.prototype.onAction = function () {
    var i = CodeGen.resolveNumberInput(this, 1, "i");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Airstrike.onMe(" + i + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/support/airstrikeonme", AirstrikeOnMe);
})();
