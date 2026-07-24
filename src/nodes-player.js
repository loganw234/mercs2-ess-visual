/* nodes-player.js -- Ess.Player / Ess.Human / Ess.Debug node types, following the exact three-part shape
 * from nodes.js: action nodes take an "exec" ACTION input (always slot 0) and fire a "then" EVENT output
 * via triggerSlot(0); pure-data nodes have no exec pins and use onExecute + setOutputData to emit a
 * fragment of LUA SOURCE TEXT (never a computed value -- see codegen.js header for why).
 *
 * Signatures below were verified directly against mercs2-lua-essentials source (not just CAPABILITIES.md):
 *   src/93_easy_unlocks.lua  -- Ess.Easy.Player.*
 *   src/14_human.lua         -- Ess.Easy.Human.giveWeapon
 *   src/97_easy_debug.lua    -- Ess.Easy.Debug.*
 *   src/10_player.lua        -- Ess.Player.* (Core tier, added in a later pass)
 *
 * Ess.Player.pose/slot/viewYaw are NOT covered here -- pose/viewYaw return more than one meaningfully
 * distinct value (x,y,z,yaw,char,slot / angle,bool) with no single obviously-primary one, which doesn't
 * fit this repo's one-output-per-data-node model; slot() returns an opaque native player handle with no
 * standalone value to a mod script. targetUnderReticle DOES return multiple values (g,x,y,z) but follows
 * the SAME "own convention puts the guid first" the real function's doc comment already establishes, so
 * it's modeled here the same way Player Character is: emit the call expression, let Lua's normal
 * single-value-context truncation take just the guid wherever this output gets spliced in.
 */
(function () {
  "use strict";

  // ============================================================
  // Ess/Player/Character -- a PURE DATA node wrapping Ess.Player.character(i). Emits the CALL EXPRESSION
  // as text (not a resolved guid), same "emit source text" idea as RandomNumber in nodes.js -- whatever
  // consumes this output gets that exact Lua call spliced into the generated code.
  // ============================================================
  function PlayerCharacter() {
    this.addOutput("char", "string");
    this.addProperty("playerIndex", 0);
    this.addWidget("number", "playerIndex", this.properties.playerIndex, function (v) { this.properties.playerIndex = v; }.bind(this));
  }
  PlayerCharacter.title = "Player Character";
  PlayerCharacter.desc = "Ess.Player.character(i) -- emits Lua source, not a resolved guid (see codegen.js header)";
  PlayerCharacter.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Player.character(" + this.properties.playerIndex + ")");
  };
  LiteGraph.registerNodeType("ess/player/character", PlayerCharacter);

  // ============================================================
  // Ess/Player/GiveGrapplingHook -- Ess.Easy.Player.giveGrapplingHook(), no args.
  // ============================================================
  function GiveGrapplingHook() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  GiveGrapplingHook.title = "Give Grappling Hook";
  GiveGrapplingHook.desc = "Ess.Easy.Player.giveGrapplingHook()";
  GiveGrapplingHook.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Player.giveGrapplingHook()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/givegrapplinghook", GiveGrapplingHook);

  // ============================================================
  // Ess/Player/UnlockFastTravel -- Ess.Easy.Player.unlockFastTravel(), no args.
  // ============================================================
  function UnlockFastTravel() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  UnlockFastTravel.title = "Unlock Fast Travel";
  UnlockFastTravel.desc = "Ess.Easy.Player.unlockFastTravel()";
  UnlockFastTravel.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Player.unlockFastTravel()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/unlockfasttravel", UnlockFastTravel);

  // ============================================================
  // Ess/Player/UnlockAllHQs -- Ess.Easy.Player.unlockAllHQs(), no args.
  // ============================================================
  function UnlockAllHQs() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  UnlockAllHQs.title = "Unlock All HQs";
  UnlockAllHQs.desc = "Ess.Easy.Player.unlockAllHQs()";
  UnlockAllHQs.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Player.unlockAllHQs()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/unlockallhqs", UnlockAllHQs);

  // ============================================================
  // Ess/Player/GiveAllRewards -- Ess.Easy.Player.giveAllRewards(), no args.
  // ============================================================
  function GiveAllRewards() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  GiveAllRewards.title = "Give All Rewards";
  GiveAllRewards.desc = "Ess.Easy.Player.giveAllRewards()";
  GiveAllRewards.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Player.giveAllRewards()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/giveallrewards", GiveAllRewards);

  // ============================================================
  // Ess/Player/FreeSupport -- Ess.Easy.Player.freeSupport(), no args (the real function takes an optional
  // bOn that defaults to true when omitted, so a bare no-arg call turns it ON -- exactly this node's job).
  // ============================================================
  function FreeSupport() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  FreeSupport.title = "Free Support";
  FreeSupport.desc = "Ess.Easy.Player.freeSupport()";
  FreeSupport.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Player.freeSupport()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/freesupport", FreeSupport);

  // ============================================================
  // Ess/Player/Skin -- Ess.Easy.Player.skin(code). "pmc_hum_fiona" is a confirmed-real code straight from
  // the Ess source comment (src/93_easy_unlocks.lua).
  // ============================================================
  function PlayerSkin() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("code", "pmc_hum_fiona");
    this.addWidget("text", "code", this.properties.code, function (v) { this.properties.code = v; }.bind(this));
  }
  PlayerSkin.title = "Player Skin";
  PlayerSkin.desc = "Ess.Easy.Player.skin(code)";
  PlayerSkin.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Player.skin(" + CodeGen.luaString(this.properties.code) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/skin", PlayerSkin);

  // ============================================================
  // Ess/Player/Ghost -- Ess.Easy.Player.ghost(bOn). Toggle widget, default true (turn ghost mode ON).
  // ============================================================
  function Ghost() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("on", true);
    this.addWidget("toggle", "on", this.properties.on, function (v) { this.properties.on = v; }.bind(this));
  }
  Ghost.title = "Ghost Mode";
  Ghost.desc = "Ess.Easy.Player.ghost(bOn)";
  Ghost.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Player.ghost(" + (this.properties.on ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/ghost", Ghost);

  // ============================================================
  // Ess/Human/GiveWeapon -- Ess.Easy.Human.giveWeapon(char, templateName). "char" is a data input carrying
  // a Lua expression (defaults to the literal fallback expression text "Ess.Player.character(0)" -- same
  // "emit source text" idea as Random Number/Player Character above), spliced in AS-IS, never quoted --
  // its value is already a Lua expression, not a string literal. "templateName" is a plain widget string,
  // quoted with CodeGen.luaString. "Grenade Launcher" is the confirmed live-tested example template name
  // from the Ess source comment (src/14_human.lua).
  // ============================================================
  function GiveWeapon() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("templateName", "Grenade Launcher");
    this.addWidget("text", "templateName", this.properties.templateName, function (v) { this.properties.templateName = v; }.bind(this));
    this.addInput("char", "string");  // input 1 -- exec already took input 0
    this.addProperty("char", "Ess.Player.character(0)");
    this.addWidget("text", "char", this.properties.char, function (v) { this.properties.char = v; }.bind(this));
  }
  GiveWeapon.title = "Give Weapon";
  GiveWeapon.desc = "Ess.Easy.Human.giveWeapon(char, templateName)";
  GiveWeapon.prototype.onAction = function () {
    var char = CodeGen.resolveNumberInput(this, 1, "char");  // input 1 -- reused for its generic
    // "wire overrides property text" logic even though this isn't a number; the fallback property is
    // itself a Lua expression string, spliced in as-is (never quoted).
    var templateName = CodeGen.luaString(this.properties.templateName);
    CodeGen.emit("Ess.Easy.Human.giveWeapon(" + char + ", " + templateName + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/giveweapon", GiveWeapon);

  // ============================================================
  // Ess/Debug/Overlay -- Ess.Easy.Debug.overlay(opts). The real function's opts (x, y, interval, radius, i)
  // are ALL optional, and the call itself is a TOGGLE (call once to show, again to hide) -- so a no-arg
  // call is a fully faithful, meaningful use of the real function, not a simplification that drops
  // required data.
  // ============================================================
  function DebugOverlay() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  DebugOverlay.title = "Debug Overlay";
  DebugOverlay.desc = "Ess.Easy.Debug.overlay() -- toggles the dev overlay on/off";
  DebugOverlay.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Debug.overlay()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/debug/overlay", DebugOverlay);

  // ============================================================
  // Ess/Debug/Hide -- Ess.Easy.Debug.hide(), no args -- forces the overlay off regardless of toggle state.
  // ============================================================
  function DebugHide() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  DebugHide.title = "Hide Debug Overlay";
  DebugHide.desc = "Ess.Easy.Debug.hide()";
  DebugHide.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Debug.hide()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/debug/hide", DebugHide);

  // ============================================================
  // Ess/Debug/IsOn -- a PURE DATA node wrapping Ess.Easy.Debug.isOn() -> bool. Same "emit source text" idea
  // as Player Character above -- nothing here queries the live game at compile time, it just emits the
  // call expression for whatever consumes this boolean output to splice in.
  // ============================================================
  function DebugIsOn() {
    this.addOutput("isOn", "boolean");
  }
  DebugIsOn.title = "Debug: Is Overlay On";
  DebugIsOn.desc = "Ess.Easy.Debug.isOn() -- emits Lua source, not a resolved boolean (see codegen.js header)";
  DebugIsOn.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Easy.Debug.isOn()");
  };
  LiteGraph.registerNodeType("ess/debug/ison", DebugIsOn);

  // ============================================================
  // Ess/Player/Camera -- a PURE DATA node wrapping Ess.Player.camera(i) -> camera guid | nil.
  // ============================================================
  function PlayerCamera() {
    this.addOutput("cam", "string");
    this.addProperty("playerIndex", 0);
    this.addWidget("number", "playerIndex", this.properties.playerIndex, function (v) { this.properties.playerIndex = v; }.bind(this));
  }
  PlayerCamera.title = "Player Camera";
  PlayerCamera.desc = "Ess.Player.camera(i) -- emits Lua source, not a resolved guid";
  PlayerCamera.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Player.camera(" + this.properties.playerIndex + ")");
  };
  LiteGraph.registerNodeType("ess/player/camera", PlayerCamera);

  // ============================================================
  // Ess/Player/TargetUnderReticle -- a PURE DATA node wrapping Ess.Player.targetUnderReticle(i). Real
  // return is (g, x, y, z); this emits the bare call expression, so wherever this output gets spliced (a
  // single-value guid slot) Lua's own single-value-context truncation takes just g -- see file header.
  // ============================================================
  function PlayerTargetUnderReticle() {
    this.addOutput("guid", "string");
    this.addProperty("playerIndex", 0);
    this.addWidget("number", "playerIndex", this.properties.playerIndex, function (v) { this.properties.playerIndex = v; }.bind(this));
  }
  PlayerTargetUnderReticle.title = "Player: Target Under Reticle";
  PlayerTargetUnderReticle.desc = "Ess.Player.targetUnderReticle(i) -- emits Lua source; real return is (g,x,y,z), only g survives a single-value splice";
  PlayerTargetUnderReticle.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Player.targetUnderReticle(" + this.properties.playerIndex + ")");
  };
  LiteGraph.registerNodeType("ess/player/targetunderreticle", PlayerTargetUnderReticle);

  // ============================================================
  // Ess/Player/InVehicle -- a PURE DATA node wrapping Ess.Player.inVehicle(i) -> vehicle guid | nil.
  // ============================================================
  function PlayerInVehicle() {
    this.addOutput("veh", "string");
    this.addProperty("playerIndex", 0);
    this.addWidget("number", "playerIndex", this.properties.playerIndex, function (v) { this.properties.playerIndex = v; }.bind(this));
  }
  PlayerInVehicle.title = "Player In Vehicle";
  PlayerInVehicle.desc = "Ess.Player.inVehicle(i) -- emits Lua source, not a resolved guid";
  PlayerInVehicle.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Player.inVehicle(" + this.properties.playerIndex + ")");
  };
  LiteGraph.registerNodeType("ess/player/invehicle", PlayerInVehicle);

  // ============================================================
  // Ess/Player/OnFoot -- a PURE DATA node wrapping Ess.Player.onFoot(i) -> bool.
  // ============================================================
  function PlayerOnFoot() {
    this.addOutput("onFoot", "boolean");
    this.addProperty("playerIndex", 0);
    this.addWidget("number", "playerIndex", this.properties.playerIndex, function (v) { this.properties.playerIndex = v; }.bind(this));
  }
  PlayerOnFoot.title = "Player On Foot";
  PlayerOnFoot.desc = "Ess.Player.onFoot(i) -- emits Lua source, not a resolved boolean";
  PlayerOnFoot.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Player.onFoot(" + this.properties.playerIndex + ")");
  };
  LiteGraph.registerNodeType("ess/player/onfoot", PlayerOnFoot);

  // ============================================================
  // Ess/Player/GiveFuel -- Ess.Player.giveFuel(n)
  // ============================================================
  function PlayerGiveFuel() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("n", "number");
    this.addProperty("n", 100);
    this.addWidget("number", "n", this.properties.n, function (v) { this.properties.n = v; }.bind(this));
  }
  PlayerGiveFuel.title = "Give Fuel";
  PlayerGiveFuel.desc = "Ess.Player.giveFuel(n)";
  PlayerGiveFuel.prototype.onAction = function () {
    var n = CodeGen.resolveNumberInput(this, 1, "n");  // input 0 is "exec"
    CodeGen.emit("Ess.Player.giveFuel(" + n + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/givefuel", PlayerGiveFuel);

  // ============================================================
  // Ess/Player/RemoveBoundaries -- Ess.Player.removeBoundaries(). No args -- lifts every active
  // out-of-bounds volume for every connected player at once.
  // ============================================================
  function PlayerRemoveBoundaries() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  PlayerRemoveBoundaries.title = "Remove Boundaries";
  PlayerRemoveBoundaries.desc = "Ess.Player.removeBoundaries()";
  PlayerRemoveBoundaries.prototype.onAction = function () {
    CodeGen.emit("Ess.Player.removeBoundaries()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/removeboundaries", PlayerRemoveBoundaries);

  // ============================================================
  // Ess/Player/SetInputEnabled -- Ess.Player.setInputEnabled(bOn, i). Gates GAME control only -- a UI
  // reading keyboard events (e.g. a chat box) keeps working while this is off.
  // ============================================================
  function PlayerSetInputEnabled() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("on", true);
    this.addWidget("toggle", "on", this.properties.on, function (v) { this.properties.on = v; }.bind(this));
    this.addInput("i", "number");
    this.addProperty("i", 0);
    this.addWidget("number", "i", this.properties.i, function (v) { this.properties.i = v; }.bind(this));
  }
  PlayerSetInputEnabled.title = "Set Input Enabled";
  PlayerSetInputEnabled.desc = "Ess.Player.setInputEnabled(bOn, i)";
  PlayerSetInputEnabled.prototype.onAction = function () {
    var i = CodeGen.resolveNumberInput(this, 1, "i");  // input 0 is "exec"
    CodeGen.emit("Ess.Player.setInputEnabled(" + (this.properties.on ? "true" : "false") + ", " + i + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/setinputenabled", PlayerSetInputEnabled);

  // ============================================================
  // Ess/Player/Rumble -- Ess.Player.rumble(i, fLength) -- controller haptic feedback.
  // ============================================================
  function PlayerRumble() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("i", "number");
    this.addProperty("i", 0);
    this.addWidget("number", "i", this.properties.i, function (v) { this.properties.i = v; }.bind(this));
    this.addInput("fLength", "number");
    this.addProperty("fLength", 0.2);
    this.addWidget("number", "fLength", this.properties.fLength, function (v) { this.properties.fLength = v; }.bind(this));
  }
  PlayerRumble.title = "Rumble";
  PlayerRumble.desc = "Ess.Player.rumble(i, fLength)";
  PlayerRumble.prototype.onAction = function () {
    var i = CodeGen.resolveNumberInput(this, 1, "i");  // input 0 is "exec"
    var fLength = CodeGen.resolveNumberInput(this, 2, "fLength");
    CodeGen.emit("Ess.Player.rumble(" + i + ", " + fLength + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/rumble", PlayerRumble);

  // ============================================================
  // Ess/Player/Teleport -- Ess.Player.teleport(x, y, z, yaw, onDone). onDone is a completion callback,
  // modeled as raw Lua-source text same as every other callback param in this repo (see nodes-utility.js's
  // file header for why) -- default "nil" (the real function's own nil-safe fallback).
  // ============================================================
  function PlayerTeleport() {
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
    this.addInput("yaw", "number");
    this.addProperty("yaw", 0);
    this.addWidget("number", "yaw", this.properties.yaw, function (v) { this.properties.yaw = v; }.bind(this));
    this.addProperty("onDone", "nil");
    this.addWidget("text", "onDone (nil = none)", this.properties.onDone, function (v) { this.properties.onDone = v; }.bind(this));
  }
  PlayerTeleport.title = "Teleport";
  PlayerTeleport.desc = "Ess.Player.teleport(x, y, z, yaw, onDone)";
  PlayerTeleport.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");  // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var yaw = CodeGen.resolveNumberInput(this, 4, "yaw");
    CodeGen.emit("Ess.Player.teleport(" + x + ", " + y + ", " + z + ", " + yaw + ", " + this.properties.onDone + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/player/teleport", PlayerTeleport);
})();
