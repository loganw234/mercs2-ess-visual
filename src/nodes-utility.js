/* nodes-utility.js -- Ess.Easy.Console/Impulse/Menu/Time/Triggers/Keys node types. Same three-part shape as
 * nodes.js's header comment describes; this file only adds what's specific to the nodes below.
 *
 * Signatures verified directly against mercs2-lua-essentials source:
 *   src/96_console.lua       -- Ess.Easy.Console.*
 *   src/16_impulse.lua       -- Ess.Easy.Impulse.*
 *   src/95_ui_easy.lua       -- Ess.Easy.Menu
 *   src/23_time.lua          -- Ess.Easy.Time.slowmo
 *   src/62_triggers_easy.lua -- Ess.Easy.Triggers.*
 *   src/20_loop.lua          -- Ess.Loop.start/.stop (Core tier, added in a later pass)
 *   src/25_keys.lua          -- Ess.Keys.* (Core tier, added in a later pass)
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
    this.addOutput("cancel", "string");
  }
  TriggerOnPlayerNear.title = "Trigger: On Player Near";
  TriggerOnPlayerNear.desc = "Ess.Easy.Triggers.onPlayerNear(x, y, z, r, fn) -- fn is raw Lua function-literal text, see file header -> cancel";
  TriggerOnPlayerNear.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");    // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var r = CodeGen.resolveNumberInput(this, 4, "r");
    var varName = CodeGen.newLocal("trigger");
    CodeGen.emitCapture(varName, "Ess.Easy.Triggers.onPlayerNear(" + x + ", " + y + ", " + z + ", " + r + ", " + this.properties.fn + ")");
    this.setOutputData(1, varName);   // "cancel" is output slot 1 -- "then" (EVENT) took slot 0
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
    this.addOutput("cancel", "string");
  }
  TriggerOnDeath.title = "Trigger: On Death";
  TriggerOnDeath.desc = "Ess.Easy.Triggers.onDeath(uGuid, fn) -- fn is raw Lua function-literal text, see file header -> cancel";
  TriggerOnDeath.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");    // input 0 is "exec"
    var varName = CodeGen.newLocal("trigger");
    CodeGen.emitCapture(varName, "Ess.Easy.Triggers.onDeath(" + uGuid + ", " + this.properties.fn + ")");
    this.setOutputData(1, varName);   // "cancel" is output slot 1 -- "then" (EVENT) took slot 0
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
    this.addOutput("cancel", "string");
  }
  TriggerAfter.title = "Trigger: After Delay";
  TriggerAfter.desc = "Ess.Easy.Triggers.after(seconds, fn) -- fn is raw Lua function-literal text, see file header -> cancel";
  TriggerAfter.prototype.onAction = function () {
    var seconds = CodeGen.resolveNumberInput(this, 1, "seconds");    // input 0 is "exec"
    var varName = CodeGen.newLocal("trigger");
    CodeGen.emitCapture(varName, "Ess.Easy.Triggers.after(" + seconds + ", " + this.properties.fn + ")");
    this.setOutputData(1, varName);   // "cancel" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/triggers/after", TriggerAfter);

  // ============================================================
  // Ess/Loop/Start -- Ess.Loop.start(id, interval, tickFn). TWO ways to say what happens each tick, same
  // precedence as Keys: On (see that node's own header): wire "on tick" to a real exec chain -- captured via
  // the same pushScope()/popScope() mechanism, wrapped in `function() ... return true end` at emit time (the
  // trailing `return true` is added FOR you, since a wired chain has no natural "return" of its own and
  // Ess.Loop.start stops the loop the moment a tick returns anything falsy -- see
  // mercs2-lua-essentials/src/20_loop.lua). Leave "on tick" unwired and the raw-text `tickFn` fallback below
  // applies instead (own responsibility for its own `return true`/`false`, same as before this existed).
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
    this.addOutput("on tick", LiteGraph.EVENT);
    this.size = [220, 120];
  }
  LoopStart.title = "Loop: Start";
  LoopStart.desc = "Ess.Loop.start(id, interval, tickFn) -- wire \"on tick\" for a real exec chain each tick (preferred, see file header); the raw-text tickFn is only used when nothing's wired there.";
  LoopStart.prototype.onAction = function () {
    var interval = CodeGen.resolveNumberInput(this, 1, "interval");  // input 0 is "exec"
    var onTickSlot = this.outputs[1];
    var isWired = onTickSlot && onTickSlot.links && onTickSlot.links.length > 0;
    if (isWired) {
      CodeGen.pushScope();
      this.triggerSlot(1);
      var bodyLines = CodeGen.popScope();
      CodeGen.emit("Ess.Loop.start(" + CodeGen.luaString(this.properties.id) + ", " + interval + ", function()");
      CodeGen.emitLines(bodyLines);
      CodeGen.emit("return true");
      CodeGen.emit("end)");
    } else {
      CodeGen.emit("Ess.Loop.start(" + CodeGen.luaString(this.properties.id) + ", " + interval + ", " + this.properties.tickFn + ")");
    }
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

  // ============================================================
  // Ess/Input/IsKeyHeld -- pure data. Ess.Input.held(vk) -> is this key down RIGHT NOW (no buffer drain,
  // safe to call from any number of loops at once -- see src/21_input.lua). DIFFERENT from Keys: On's own
  // key-name convention (that's an edge-triggered PRESS via Ess.Keys/Loader's own named-key strings) --
  // this is a raw Win32 virtual-key CODE read via GetKeyboardState, a separate lower-level system, so it
  // takes its own combo of the common modifier/whitespace keys rather than reusing Keys: On's string names.
  // A combo (not a free-text VK number) makes a typo'd/out-of-range code unreachable, same reasoning as
  // nodes-encounter.js's FACTIONS combo. Outputs "string" (a raw boolean-expression, the same convention
  // Compare/And/Or/Not use) so it wires directly into Branch's condition -- no separate Compare needed.
  // ============================================================
  var VK_KEYS = { "Shift": 0x10, "Ctrl": 0x11, "Alt": 0x12, "Space": 0x20, "Enter": 0x0D, "Tab": 0x09, "Escape": 0x1B };
  function InputIsKeyHeld() {
    this.addProperty("key", "Shift");
    this.addWidget("combo", "key", this.properties.key, function (v) { this.properties.key = v; }.bind(this), { values: Object.keys(VK_KEYS) });
    this.addOutput("held", "string");
  }
  InputIsKeyHeld.title = "Input: Is Key Held";
  InputIsKeyHeld.desc = "Ess.Input.held(vk) -- is this key down right now (not an edge-triggered press) -- e.g. gate a Loop: Start tick on \"is Shift held\" for a hold-to-do-something effect.";
  InputIsKeyHeld.prototype.onExecute = function () {
    var vk = VK_KEYS[this.properties.key] || VK_KEYS.Shift;
    this.setOutputData(0, "Ess.Input.held(0x" + vk.toString(16).toUpperCase() + ")");
  };
  LiteGraph.registerNodeType("ess/input/iskeyheld", InputIsKeyHeld);

  // ============================================================
  // Ess/Keys -- a whole PANEL of hotkeys inside ONE script, decoupled from the file-level KEYVAL/OnKey
  // binding (which is exactly one key per compiled script -- see compiler.js's multi-trigger-key guardrail).
  // Ess.Keys.on drains an edge-triggered key buffer on its own shared Ess.Loop, so a script that starts with
  // one On Key Press can still own several independent hotkeys once it's running. Edge-triggered: a held key
  // fires its handler ONCE, not every frame. CAVEAT (from src/25_keys.lua): this reads the same input buffer
  // Ess.UI's focused widgets read -- don't bind Ess.Keys AND a focused Ess.UI.Menu to the same keys at once.
  //
  // TWO ways to say what happens on a press, prefer the first:
  //   1. Wire "on press" to a real exec chain -- captured into its own scope (the SAME pushScope()/
  //      popScope() mechanism Branch's true/false and every Function Block body already use) and wrapped
  //      in `function(shift) ... end` at emit time, so the actual behavior is real, wired, visible nodes,
  //      not text. A held key firing that chain as a normal EVENT->ACTION link (like "then" below) would
  //      run it immediately at COMPILE time instead of waiting for the real keypress -- the exact bug this
  //      file's Confirm-node history already proves (see nodes-markers-camera.js's Confirm Prompt) -- so
  //      "on press" is walked through pushScope() specifically to defer it, exactly like Branch's outputs.
  //   2. Leave "on press" unwired and just type `call` -- a raw Lua statement, auto-wrapped the same way.
  //      Only used as a fallback when nothing's wired to "on press"; fine for a one-liner, but for
  //      anything with real logic worth seeing, wire in the real nodes (a Function Block's "Call: name"
  //      node, generated per src/nodes-function-calls.js, is a natural thing to wire "on press" straight
  //      into -- its exec input accepts an EVENT output same as any other action node's).
  // Reference `shift` directly (in `call`, or in a wired node's own raw-text fields) for a Shift+key combo.
  // ============================================================
  function KeysOn() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("key", "F6");
    this.addWidget("text", "key", this.properties.key, function (v) { this.properties.key = v; }.bind(this));
    this.addProperty("call", "Ess.Log('key pressed')");
    this.addWidget("text", "call", this.properties.call, function (v) { this.properties.call = v; }.bind(this));
    this.addOutput("on press", LiteGraph.EVENT);
    this.size = [240, 120];
  }
  KeysOn.title = "Keys: On";
  KeysOn.desc = "Ess.Keys.on(key, function(shift) ... end) -- binds a key inside THIS script (independent of the file's own OnKey binding). Wire \"on press\" to a real exec chain for what happens each press (preferred, see file header); `call` (raw Lua) is only used when nothing's wired there.";
  KeysOn.prototype.onAction = function () {
    var key = CodeGen.luaString(this.properties.key);
    var onPressSlot = this.outputs[1];
    var isWired = onPressSlot && onPressSlot.links && onPressSlot.links.length > 0;
    if (isWired) {
      CodeGen.pushScope();
      this.triggerSlot(1);
      var bodyLines = CodeGen.popScope();
      CodeGen.emit("Ess.Keys.on(" + key + ", function(shift)");
      CodeGen.emitLines(bodyLines);
      CodeGen.emit("end)");
    } else {
      CodeGen.emit("Ess.Keys.on(" + key + ", function(shift) " + this.properties.call + " end)");
    }
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/keys/on", KeysOn);

  // ============================================================
  // Ess/Keys/Off -- Ess.Keys.off(key) -- stop handling that key (the binding, not the loop; the loop
  // self-stops on its own once nothing is bound at all, see src/25_keys.lua).
  // ============================================================
  function KeysOff() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("key", "F6");
    this.addWidget("text", "key", this.properties.key, function (v) { this.properties.key = v; }.bind(this));
  }
  KeysOff.title = "Keys: Off";
  KeysOff.desc = "Ess.Keys.off(key)";
  KeysOff.prototype.onAction = function () {
    CodeGen.emit("Ess.Keys.off(" + CodeGen.luaString(this.properties.key) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/keys/off", KeysOff);

  // ============================================================
  // Ess/Keys/Clear -- Ess.Keys.clear() -- drop every binding at once, no args.
  // ============================================================
  function KeysClear() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  KeysClear.title = "Keys: Clear";
  KeysClear.desc = "Ess.Keys.clear()";
  KeysClear.prototype.onAction = function () {
    CodeGen.emit("Ess.Keys.clear()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/keys/clear", KeysClear);

  // ============================================================
  // Ess/Keys/IsBound -- Ess.Keys.isBound(key) -> bool. Pure-data: emits a Lua boolean-EXPRESSION as text,
  // never a resolved value here (see codegen.js's header) -- same convention every other query getter in
  // this repo follows (e.g. Object: Alive).
  // ============================================================
  function KeysIsBound() {
    this.addProperty("key", "F6");
    this.addWidget("text", "key", this.properties.key, function (v) { this.properties.key = v; }.bind(this));
    this.addOutput("bound", "string");
  }
  KeysIsBound.title = "Keys: Is Bound";
  KeysIsBound.desc = "Ess.Keys.isBound(key) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  KeysIsBound.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Keys.isBound(" + CodeGen.luaString(this.properties.key) + ")");
  };
  LiteGraph.registerNodeType("ess/keys/isbound", KeysIsBound);
})();
