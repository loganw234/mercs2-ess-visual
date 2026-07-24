/* nodes-utility.js -- Ess.Easy.Console/Impulse/Menu/Time/Triggers node types. Same three-part shape as
 * nodes.js's header comment describes; this file only adds what's specific to the nodes below.
 *
 * Signatures verified directly against mercs2-lua-essentials source:
 *   src/96_console.lua       -- Ess.Easy.Console.*
 *   src/16_impulse.lua       -- Ess.Easy.Impulse.*
 *   src/95_ui_easy.lua       -- Ess.Easy.Menu
 *   src/23_time.lua          -- Ess.Easy.Time.slowmo
 *   src/62_triggers_easy.lua -- Ess.Easy.Triggers.*
 *   src/20_loop.lua          -- Ess.Loop.start/.stop (Core tier, added in a later pass)
 *
 * CALLBACK PARAMETERS (Menu's entries, every Triggers function's fn): modeled as raw Lua-source TEXT, the
 * same "data is Lua source text" convention guids/points/factions lists already use (see codegen.js
 * header) -- spliced in as literal function-literal text, not represented as visually-wired exec branches.
 * See nodes-markers-camera.js's Confirm Prompt for why: an earlier version of THAT node tried modeling a
 * callback as separate EVENT outputs that fired immediately during compile, which produced Lua where the
 * real callback was an empty no-op while anything wired after the output ran unconditionally at call time
 * instead of when the callback actually fired. Text is less visual but compiles to what it shows.
 */
(function () {
  "use strict";

  // Resolve a node's input slot exactly like CodeGen.resolveNumberInput does (wired value wins, else the
  // property default) but without any numeric assumption -- same local twin nodes-markers-camera.js and
  // nodes-encounter.js each keep for guid/raw-expression inputs (see either file's header for why this
  // isn't shared centrally through codegen.js).
  function resolveRawInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  // ============================================================
  // Ess/Console/Open -- Ess.Easy.Console.open(), no args -- browse the full Easy reference, in-game.
  // ============================================================
  function ConsoleOpen() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  ConsoleOpen.title = "Console: Open";
  ConsoleOpen.desc = "Ess.Easy.Console.open()";
  ConsoleOpen.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Console.open()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/console/open", ConsoleOpen);

  // ============================================================
  // Ess/Console/Close -- Ess.Easy.Console.close(), no args.
  // ============================================================
  function ConsoleClose() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  ConsoleClose.title = "Console: Close";
  ConsoleClose.desc = "Ess.Easy.Console.close()";
  ConsoleClose.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Console.close()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/console/close", ConsoleClose);

  // ============================================================
  // Ess/Console/Play -- Ess.Easy.Console.play(), no args -- the interactive playground (run functions live).
  // ============================================================
  function ConsolePlay() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  ConsolePlay.title = "Console: Playground";
  ConsolePlay.desc = "Ess.Easy.Console.play()";
  ConsolePlay.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Console.play()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/console/play", ConsolePlay);

  // ============================================================
  // Ess/Console/Search -- Ess.Easy.Console.search(), no args -- opens a typed filter prompt.
  // ============================================================
  function ConsoleSearch() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  ConsoleSearch.title = "Console: Search";
  ConsoleSearch.desc = "Ess.Easy.Console.search()";
  ConsoleSearch.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Console.search()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/console/search", ConsoleSearch);

  // ============================================================
  // Ess/Impulse/SpeedBoost -- Ess.Easy.Impulse.speedBoost(uGuid, strength). uGuid is OPTIONAL in the real
  // function (nil = the vehicle you're driving, or you on foot) -- default widget text is the literal Lua
  // token "nil" (spliced as-is, an unquoted identifier, not the string "nil") to keep that real default.
  // ============================================================
  function ImpulseSpeedBoost() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "nil");
    this.addWidget("text", "uGuid (nil = auto)", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addInput("strength", "number");
    this.addProperty("strength", 8);
    this.addWidget("number", "strength", this.properties.strength, function (v) { this.properties.strength = v; }.bind(this));
  }
  ImpulseSpeedBoost.title = "Impulse: Speed Boost";
  ImpulseSpeedBoost.desc = "Ess.Easy.Impulse.speedBoost(uGuid, strength)";
  ImpulseSpeedBoost.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");     // input 0 is "exec"
    var strength = CodeGen.resolveNumberInput(this, 2, "strength");
    CodeGen.emit("Ess.Easy.Impulse.speedBoost(" + uGuid + ", " + strength + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/impulse/speedboost", ImpulseSpeedBoost);

  // ============================================================
  // Ess/Impulse/Launch -- Ess.Easy.Impulse.launch(uGuid, strength). Same optional-uGuid convention as
  // Speed Boost above.
  // ============================================================
  function ImpulseLaunch() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "nil");
    this.addWidget("text", "uGuid (nil = auto)", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addInput("strength", "number");
    this.addProperty("strength", 12);
    this.addWidget("number", "strength", this.properties.strength, function (v) { this.properties.strength = v; }.bind(this));
  }
  ImpulseLaunch.title = "Impulse: Launch";
  ImpulseLaunch.desc = "Ess.Easy.Impulse.launch(uGuid, strength)";
  ImpulseLaunch.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");     // input 0 is "exec"
    var strength = CodeGen.resolveNumberInput(this, 2, "strength");
    CodeGen.emit("Ess.Easy.Impulse.launch(" + uGuid + ", " + strength + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/impulse/launch", ImpulseLaunch);

  // ============================================================
  // Ess/Impulse/Knockback -- Ess.Easy.Impulse.knockback(uGuid, fromGuid, strength). uGuid is REQUIRED (the
  // real function no-ops without one) so it defaults to the same "Ess.Player.character(0)" placeholder
  // every other required-guid node in this repo uses. fromGuid stays optional (nil = you).
  // ============================================================
  function ImpulseKnockback() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addInput("fromGuid", "string");
    this.addProperty("fromGuid", "nil");
    this.addWidget("text", "fromGuid (nil = you)", this.properties.fromGuid, function (v) { this.properties.fromGuid = v; }.bind(this));
    this.addInput("strength", "number");
    this.addProperty("strength", 10);
    this.addWidget("number", "strength", this.properties.strength, function (v) { this.properties.strength = v; }.bind(this));
  }
  ImpulseKnockback.title = "Impulse: Knockback";
  ImpulseKnockback.desc = "Ess.Easy.Impulse.knockback(uGuid, fromGuid, strength)";
  ImpulseKnockback.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");      // input 0 is "exec"
    var fromGuid = resolveRawInput(this, 2, "fromGuid");
    var strength = CodeGen.resolveNumberInput(this, 3, "strength");
    CodeGen.emit("Ess.Easy.Impulse.knockback(" + uGuid + ", " + fromGuid + ", " + strength + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/impulse/knockback", ImpulseKnockback);

  // ============================================================
  // Ess/UI/Menu -- Ess.Easy.Menu(title, entries). `entries` is a raw Lua-source TEXT property -- an ordered
  // list of {label, actionFn} pairs, actionFn a real Lua closure -- see file header on why callbacks are
  // modeled as text here rather than wired branches.
  // ============================================================
  var DEFAULT_MENU_ENTRIES =
    "{\n" +
    "  { \"Give Cash\", function() Ess.Player.giveCash(50000) end },\n" +
    "  { \"Dance\", function() Ess.Easy.Fun.dance() end },\n" +
    "}";

  function UIMenu() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("title", "Quick Menu");
    this.addWidget("text", "title", this.properties.title, function (v) { this.properties.title = v; }.bind(this));
    this.addProperty("entries", DEFAULT_MENU_ENTRIES);
    this.addWidget("text", "entries", this.properties.entries, function (v) { this.properties.entries = v; }.bind(this));
    this.size = [260, 100];
  }
  UIMenu.title = "Menu";
  UIMenu.desc = "Ess.Easy.Menu(title, entries)";
  UIMenu.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Menu(" + CodeGen.luaString(this.properties.title) + ", " + this.properties.entries + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/ui/menu", UIMenu);

  // ============================================================
  // Ess/Time/Slowmo -- Ess.Easy.Time.slowmo(n, seconds)
  // ============================================================
  function TimeSlowmo() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("n", "number");
    this.addProperty("n", 0.2);
    this.addWidget("number", "n", this.properties.n, function (v) { this.properties.n = v; }.bind(this));
    this.addInput("seconds", "number");
    this.addProperty("seconds", 2);
    this.addWidget("number", "seconds", this.properties.seconds, function (v) { this.properties.seconds = v; }.bind(this));
  }
  TimeSlowmo.title = "Time: Slow Motion";
  TimeSlowmo.desc = "Ess.Easy.Time.slowmo(n, seconds)";
  TimeSlowmo.prototype.onAction = function () {
    var n = CodeGen.resolveNumberInput(this, 1, "n");    // input 0 is "exec"
    var seconds = CodeGen.resolveNumberInput(this, 2, "seconds");
    CodeGen.emit("Ess.Easy.Time.slowmo(" + n + ", " + seconds + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/time/slowmo", TimeSlowmo);

  // ============================================================
  // Ess/Triggers/OnPlayerNear -- Ess.Easy.Triggers.onPlayerNear(x, y, z, r, fn)
  // ============================================================
  function TriggerOnPlayerNear() {
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
    this.addProperty("fn", "function() Ess.Easy.Toast('Triggered!') end");
    this.addWidget("text", "fn", this.properties.fn, function (v) { this.properties.fn = v; }.bind(this));
  }
  TriggerOnPlayerNear.title = "Trigger: On Player Near";
  TriggerOnPlayerNear.desc = "Ess.Easy.Triggers.onPlayerNear(x, y, z, r, fn) -- fn is raw Lua function-literal text, see file header";
  TriggerOnPlayerNear.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");    // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var r = CodeGen.resolveNumberInput(this, 4, "r");
    CodeGen.emit("Ess.Easy.Triggers.onPlayerNear(" + x + ", " + y + ", " + z + ", " + r + ", " + this.properties.fn + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/triggers/onplayernear", TriggerOnPlayerNear);

  // ============================================================
  // Ess/Triggers/OnDeath -- Ess.Easy.Triggers.onDeath(uGuid, fn)
  // ============================================================
  function TriggerOnDeath() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addProperty("fn", "function() Ess.Easy.Toast('Triggered!') end");
    this.addWidget("text", "fn", this.properties.fn, function (v) { this.properties.fn = v; }.bind(this));
  }
  TriggerOnDeath.title = "Trigger: On Death";
  TriggerOnDeath.desc = "Ess.Easy.Triggers.onDeath(uGuid, fn) -- fn is raw Lua function-literal text, see file header";
  TriggerOnDeath.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");    // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Triggers.onDeath(" + uGuid + ", " + this.properties.fn + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/triggers/ondeath", TriggerOnDeath);

  // ============================================================
  // Ess/Triggers/After -- Ess.Easy.Triggers.after(seconds, fn)
  // ============================================================
  function TriggerAfter() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("seconds", "number");
    this.addProperty("seconds", 3);
    this.addWidget("number", "seconds", this.properties.seconds, function (v) { this.properties.seconds = v; }.bind(this));
    this.addProperty("fn", "function() Ess.Easy.Toast('Triggered!') end");
    this.addWidget("text", "fn", this.properties.fn, function (v) { this.properties.fn = v; }.bind(this));
  }
  TriggerAfter.title = "Trigger: After Delay";
  TriggerAfter.desc = "Ess.Easy.Triggers.after(seconds, fn) -- fn is raw Lua function-literal text, see file header";
  TriggerAfter.prototype.onAction = function () {
    var seconds = CodeGen.resolveNumberInput(this, 1, "seconds");    // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Triggers.after(" + seconds + ", " + this.properties.fn + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/triggers/after", TriggerAfter);

  // ============================================================
  // Ess/Loop/Start -- Ess.Loop.start(id, interval, tickFn). tickFn is a Lua closure, modeled as raw
  // Lua-source text same as every other callback param here -- returning `true` keeps the loop going,
  // `false`/nil auto-stops it (see mercs2-lua-essentials/src/20_loop.lua for the full API, including the
  // stats()/list() introspection this exact framework's Loop Monitor tooling was built around).
  // ============================================================
  var DEFAULT_TICK_FN = "function() Ess.Log('tick') return true end";

  function LoopStart() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("id", "myLoop");
    this.addWidget("text", "id", this.properties.id, function (v) { this.properties.id = v; }.bind(this));
    this.addInput("interval", "number");
    this.addProperty("interval", 1);
    this.addWidget("number", "interval", this.properties.interval, function (v) { this.properties.interval = v; }.bind(this));
    this.addProperty("tickFn", DEFAULT_TICK_FN);
    this.addWidget("text", "tickFn", this.properties.tickFn, function (v) { this.properties.tickFn = v; }.bind(this));
    this.size = [220, 100];
  }
  LoopStart.title = "Loop: Start";
  LoopStart.desc = "Ess.Loop.start(id, interval, tickFn) -- tickFn is raw Lua function-literal text, see file header";
  LoopStart.prototype.onAction = function () {
    var interval = CodeGen.resolveNumberInput(this, 1, "interval");  // input 0 is "exec"
    CodeGen.emit("Ess.Loop.start(" + CodeGen.luaString(this.properties.id) + ", " + interval + ", " + this.properties.tickFn + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/loop/start", LoopStart);

  // ============================================================
  // Ess/Loop/Stop -- Ess.Loop.stop(id)
  // ============================================================
  function LoopStop() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("id", "myLoop");
    this.addWidget("text", "id", this.properties.id, function (v) { this.properties.id = v; }.bind(this));
  }
  LoopStop.title = "Loop: Stop";
  LoopStop.desc = "Ess.Loop.stop(id)";
  LoopStop.prototype.onAction = function () {
    CodeGen.emit("Ess.Loop.stop(" + CodeGen.luaString(this.properties.id) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/loop/stop", LoopStop);
})();
