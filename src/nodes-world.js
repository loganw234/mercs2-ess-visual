/* nodes-world.js -- Ess.Easy.World / Ess.Easy.Spawn / Ess.Easy.Vehicle / Ess.Easy.Fun node library. Same
 * three-part shape as nodes.js: addInput("exec", ACTION) + addOutput("then", EVENT) for action nodes,
 * addInput(name, "number") + widget + CodeGen.resolveNumberInput for wireable values, onAction ->
 * CodeGen.emit(...) -> this.triggerSlot(0). No pure-data nodes in this file.
 *
 * Signatures verified against the real Lua source in mercs2-lua-essentials/src:
 *   Ess.Easy.Vehicle.summon  -- 12_vehicle.lua
 *   Ess.Easy.Spawn.*         -- 92_easy_spawn.lua
 *   Ess.Easy.World.*         -- 94_easy_world.lua (removeMapBoundary/clearWanted/tint/brightness/
 *                               hellscape/resetAtmosphere) + 17_pursuit.lua (noPursuit)
 *   Ess.Easy.Fun.*           -- 93_easy_unlocks.lua
 *
 * Registered names are prefixed ess/world/, ess/spawn/, ess/vehicle/, ess/fun/ so litegraph's "/"-nesting
 * groups the right-click add-node menu sensibly.
 */
(function () {
  "use strict";

  // ============================================================
  // Ess/Vehicle/Summon -- Ess.Easy.Vehicle.summon(sTemplate, opts). Real signature also takes an opts
  // table (dist/height/useView) -- not exposed here, matching the assignment's single-template scope;
  // Lua-side defaults (18 ahead, 10 up) apply when opts is omitted.
  // ============================================================
  function VehicleSummon() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("template", "Veyron");
    this.addWidget("text", "template", this.properties.template, function (v) { this.properties.template = v; }.bind(this));
    this.addOutput("guid", "string");
  }
  VehicleSummon.title = "Summon Vehicle";
  VehicleSummon.desc = "Ess.Easy.Vehicle.summon(template) -- spawn ahead + drop you into the driver seat -> guid";
  VehicleSummon.prototype.onAction = function () {
    var varName = CodeGen.newLocal("vehicle");
    CodeGen.emitCapture(varName, "Ess.Easy.Vehicle.summon(" + CodeGen.luaString(this.properties.template) + ")");
    this.setOutputData(1, varName);   // "guid" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/vehicle/summon", VehicleSummon);

  // ============================================================
  // Ess/Spawn/Explosion -- Ess.Easy.Spawn.explosion(sType). CONFIRMED optional: Lua does
  // `sType or "Explosion (Grenade)"`, so the widget default mirrors that fallback.
  // ============================================================
  function SpawnExplosion() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("type", "Explosion (Grenade)");
    this.addWidget("text", "type", this.properties.type, function (v) { this.properties.type = v; }.bind(this));
    this.addOutput("guid", "string");
  }
  SpawnExplosion.title = "Spawn Explosion";
  SpawnExplosion.desc = "Ess.Easy.Spawn.explosion(type) -- a real, damaging boom ~10 units in front of you -> guid";
  SpawnExplosion.prototype.onAction = function () {
    var varName = CodeGen.newLocal("explosion");
    CodeGen.emitCapture(varName, "Ess.Easy.Spawn.explosion(" + CodeGen.luaString(this.properties.type) + ")");
    this.setOutputData(1, varName);   // "guid" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/spawn/explosion", SpawnExplosion);

  // ============================================================
  // Ess/Spawn/Crate -- Ess.Easy.Spawn.crate(sType). CONFIRMED optional, default "Supply Drop (Light MG)".
  // ============================================================
  function SpawnCrate() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("type", "Supply Drop (Light MG)");
    this.addWidget("text", "type", this.properties.type, function (v) { this.properties.type = v; }.bind(this));
    this.addOutput("guid", "string");
  }
  SpawnCrate.title = "Spawn Crate";
  SpawnCrate.desc = "Ess.Easy.Spawn.crate(type) -- a supply drop that parachutes in just ahead of you -> guid";
  SpawnCrate.prototype.onAction = function () {
    var varName = CodeGen.newLocal("crate");
    CodeGen.emitCapture(varName, "Ess.Easy.Spawn.crate(" + CodeGen.luaString(this.properties.type) + ")");
    this.setOutputData(1, varName);   // "guid" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/spawn/crate", SpawnCrate);

  // ============================================================
  // Ess/Spawn/Weapon -- Ess.Easy.Spawn.weapon(sName). CONFIRMED optional, default "RPG".
  // ============================================================
  function SpawnWeapon() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("name", "RPG");
    this.addWidget("text", "name", this.properties.name, function (v) { this.properties.name = v; }.bind(this));
    this.addOutput("guid", "string");
  }
  SpawnWeapon.title = "Spawn Weapon";
  SpawnWeapon.desc = "Ess.Easy.Spawn.weapon(name) -- a weapon pickup on the ground in front of you -> guid";
  SpawnWeapon.prototype.onAction = function () {
    var varName = CodeGen.newLocal("weapon");
    CodeGen.emitCapture(varName, "Ess.Easy.Spawn.weapon(" + CodeGen.luaString(this.properties.name) + ")");
    this.setOutputData(1, varName);   // "guid" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/spawn/weapon", SpawnWeapon);

  // ============================================================
  // Ess/Spawn/Airstrike -- Ess.Easy.Spawn.airstrike(sRound). CONFIRMED optional, default "Artillery Shell".
  // Real, lethal ordnance dropped on the player's own head.
  // ============================================================
  function SpawnAirstrike() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("round", "Artillery Shell");
    this.addWidget("text", "round", this.properties.round, function (v) { this.properties.round = v; }.bind(this));
  }
  SpawnAirstrike.title = "Spawn Airstrike";
  SpawnAirstrike.desc = "Ess.Easy.Spawn.airstrike(round) -- a shell dropped on your own head";
  SpawnAirstrike.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Spawn.airstrike(" + CodeGen.luaString(this.properties.round) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/spawn/airstrike", SpawnAirstrike);

  // ============================================================
  // Ess/Spawn/Enemies -- Ess.Easy.Spawn.enemies(nCount, opts). Real signature also takes an opts table
  // (template/dist/spread/attack/target) -- not exposed here, matching the assignment's single-count
  // scope; Lua-side defaults ("VZ Soldier", attack = true against you) apply when opts is omitted.
  // ============================================================
  function SpawnEnemies() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("count", "number");
    this.addProperty("count", 3);
    this.addWidget("number", "count", this.properties.count, function (v) { this.properties.count = v; }.bind(this));
    this.addOutput("guids", "string");
  }
  SpawnEnemies.title = "Spawn Enemies";
  SpawnEnemies.desc = "Ess.Easy.Spawn.enemies(count) -- a squad of hostiles spawned ahead and sent at you -> guids";
  SpawnEnemies.prototype.onAction = function () {
    var count = CodeGen.resolveNumberInput(this, 1, "count");  // input 0 is "exec"
    var varName = CodeGen.newLocal("enemies");
    CodeGen.emitCapture(varName, "Ess.Easy.Spawn.enemies(" + count + ")");
    this.setOutputData(1, varName);   // "guids" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/spawn/enemies", SpawnEnemies);

  // ============================================================
  // Ess/Spawn/Fx -- Ess.Easy.Spawn.fx(sTemplate, x, y, z). CONFIRMED: this is a thin passthrough to
  // Ess.Object.spawn(sTemplate, x, y, z) -- x/y/z are REQUIRED coordinates, there is no player-position
  // fallback in the source (unlike the spawnAhead-based verbs above).
  // ============================================================
  function SpawnFx() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("type", "fx_Explosion_Huge");
    this.addWidget("text", "type", this.properties.type, function (v) { this.properties.type = v; }.bind(this));
    this.addInput("x", "number");
    this.addProperty("x", 0);
    this.addWidget("number", "x", this.properties.x, function (v) { this.properties.x = v; }.bind(this));
    this.addInput("y", "number");
    this.addProperty("y", 0);
    this.addWidget("number", "y", this.properties.y, function (v) { this.properties.y = v; }.bind(this));
    this.addInput("z", "number");
    this.addProperty("z", 0);
    this.addWidget("number", "z", this.properties.z, function (v) { this.properties.z = v; }.bind(this));
    this.addOutput("guid", "string");
  }
  SpawnFx.title = "Spawn FX";
  SpawnFx.desc = "Ess.Easy.Spawn.fx(type, x, y, z) -- particle/FX at a world location (x/y/z required) -> guid";
  SpawnFx.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");  // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var varName = CodeGen.newLocal("fx");
    CodeGen.emitCapture(varName, "Ess.Easy.Spawn.fx(" + CodeGen.luaString(this.properties.type) + ", " + x + ", " + y + ", " + z + ")");
    this.setOutputData(1, varName);   // "guid" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/spawn/fx", SpawnFx);

  // ============================================================
  // Ess/Spawn/FxOn -- Ess.Easy.Spawn.fxOn(sTemplate, uGuid, sBone). CONFIRMED: uGuid is a real runtime
  // object handle, which in this codegen model means a Lua EXPRESSION string (e.g. "Ess.Player.character(0)"),
  // NOT a quoted literal -- so it's resolved like a numeric/data slot (raw text, wire overrides widget),
  // never passed through CodeGen.luaString. sBone is genuinely optional in the source (nil means "one-shot
  // at the object's current position, won't follow" vs. a bone name meaning "glue to that bone"); since Lua
  // treats an empty string as truthy, a blank bone widget must emit literal `nil`, not `''`, or the wrong
  // branch of Ess.Easy.Spawn.fxOn would run.
  // ============================================================
  function SpawnFxOn() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("type", "fx_Explosion_Huge");
    this.addWidget("text", "type", this.properties.type, function (v) { this.properties.type = v; }.bind(this));
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bone", "");
    this.addWidget("text", "bone", this.properties.bone, function (v) { this.properties.bone = v; }.bind(this));
    this.addOutput("handle", "string");
  }
  SpawnFxOn.title = "Spawn FX On";
  SpawnFxOn.desc = "Ess.Easy.Spawn.fxOn(type, guid, bone) -- FX glued to a bone (leave bone blank for a one-shot at the object's position) -> handle";
  SpawnFxOn.prototype.onAction = function () {
    // "guid" is Lua source text (an expression), not a literal -- resolve like a data slot so a wired
    // guid-producing node's raw expression passes through untouched, same as the widget default.
    var guid = CodeGen.resolveNumberInput(this, 1, "guid");  // input 0 is "exec"
    var bone = this.properties.bone;
    var boneArg = (bone === undefined || bone === null || bone === "") ? "nil" : CodeGen.luaString(bone);
    var varName = CodeGen.newLocal("fxOn");
    CodeGen.emitCapture(varName, "Ess.Easy.Spawn.fxOn(" + CodeGen.luaString(this.properties.type) + ", " + guid + ", " + boneArg + ")");
    this.setOutputData(1, varName);   // "handle" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/spawn/fxon", SpawnFxOn);

  // ============================================================
  // Ess/World/RemoveMapBoundary -- Ess.Easy.World.removeMapBoundary(). No args.
  // ============================================================
  function WorldRemoveMapBoundary() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  WorldRemoveMapBoundary.title = "Remove Map Boundary";
  WorldRemoveMapBoundary.desc = "Ess.Easy.World.removeMapBoundary()";
  WorldRemoveMapBoundary.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.World.removeMapBoundary()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/world/removemapboundary", WorldRemoveMapBoundary);

  // ============================================================
  // Ess/World/ClearWanted -- Ess.Easy.World.clearWanted(). No args.
  // ============================================================
  function WorldClearWanted() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  WorldClearWanted.title = "Clear Wanted";
  WorldClearWanted.desc = "Ess.Easy.World.clearWanted()";
  WorldClearWanted.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.World.clearWanted()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/world/clearwanted", WorldClearWanted);

  // ============================================================
  // Ess/World/Hellscape -- Ess.Easy.World.hellscape(). No args.
  // ============================================================
  function WorldHellscape() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  WorldHellscape.title = "Hellscape";
  WorldHellscape.desc = "Ess.Easy.World.hellscape() -- dark + deep red preset";
  WorldHellscape.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.World.hellscape()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/world/hellscape", WorldHellscape);

  // ============================================================
  // Ess/World/Tint -- Ess.Easy.World.tint(r, g, b). Lua falls back to 220/30/30 when args are omitted;
  // since this node always passes all three, the widgets default to those same values.
  // ============================================================
  function WorldTint() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("r", "number");
    this.addProperty("r", 220);
    this.addWidget("number", "r", this.properties.r, function (v) { this.properties.r = v; }.bind(this));
    this.addInput("g", "number");
    this.addProperty("g", 30);
    this.addWidget("number", "g", this.properties.g, function (v) { this.properties.g = v; }.bind(this));
    this.addInput("b", "number");
    this.addProperty("b", 30);
    this.addWidget("number", "b", this.properties.b, function (v) { this.properties.b = v; }.bind(this));
  }
  WorldTint.title = "World Tint";
  WorldTint.desc = "Ess.Easy.World.tint(r, g, b) -- wash the world in an ambient color (0..255 each)";
  WorldTint.prototype.onAction = function () {
    var r = CodeGen.resolveNumberInput(this, 1, "r");  // input 0 is "exec"
    var g = CodeGen.resolveNumberInput(this, 2, "g");
    var b = CodeGen.resolveNumberInput(this, 3, "b");
    CodeGen.emit("Ess.Easy.World.tint(" + r + ", " + g + ", " + b + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/world/tint", WorldTint);

  // ============================================================
  // Ess/World/Brightness -- Ess.Easy.World.brightness(n). Lua falls back to 1 when omitted; this node
  // always passes n, so the widget default mirrors that fallback.
  // ============================================================
  function WorldBrightness() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("n", "number");
    this.addProperty("n", 1);
    this.addWidget("number", "n", this.properties.n, function (v) { this.properties.n = v; }.bind(this));
  }
  WorldBrightness.title = "World Brightness";
  WorldBrightness.desc = "Ess.Easy.World.brightness(n) -- overall light level (0.05 ~ near-black, 1 = normal)";
  WorldBrightness.prototype.onAction = function () {
    var n = CodeGen.resolveNumberInput(this, 1, "n");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.World.brightness(" + n + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/world/brightness", WorldBrightness);

  // ============================================================
  // Ess/World/ResetAtmosphere -- Ess.Easy.World.resetAtmosphere(). No args.
  // ============================================================
  function WorldResetAtmosphere() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  WorldResetAtmosphere.title = "Reset Atmosphere";
  WorldResetAtmosphere.desc = "Ess.Easy.World.resetAtmosphere() -- undo tint/brightness back to the region default";
  WorldResetAtmosphere.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.World.resetAtmosphere()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/world/resetatmosphere", WorldResetAtmosphere);

  // ============================================================
  // Ess/World/NoPursuit -- Ess.Easy.World.noPursuit(bOn). CONFIRMED single boolean, default true (17_pursuit.lua).
  // Modeled as a toggle widget rather than a data input, per the assignment's guidance for booleans.
  // ============================================================
  function WorldNoPursuit() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("on", true);
    this.addWidget("toggle", "on", this.properties.on, function (v) { this.properties.on = v; }.bind(this));
  }
  WorldNoPursuit.title = "No Pursuit";
  WorldNoPursuit.desc = "Ess.Easy.World.noPursuit(on) -- true: clear the chase + block new heat, false: lift the block";
  WorldNoPursuit.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.World.noPursuit(" + (this.properties.on ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/world/nopursuit", WorldNoPursuit);

  // ============================================================
  // Ess/Fun/Dance -- Ess.Easy.Fun.dance(). No args.
  // ============================================================
  function FunDance() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  FunDance.title = "Dance";
  FunDance.desc = "Ess.Easy.Fun.dance() -- the technoviking dance";
  FunDance.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Fun.dance()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/fun/dance", FunDance);

  // ============================================================
  // Ess/Fun/Fanfare -- Ess.Easy.Fun.fanfare(bWin). CONFIRMED single boolean; Lua computes `bWin ~= false`,
  // so anything but an explicit false plays the win sting -- default true here matches that.
  // ============================================================
  function FunFanfare() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("win", true);
    this.addWidget("toggle", "win", this.properties.win, function (v) { this.properties.win = v; }.bind(this));
  }
  FunFanfare.title = "Fanfare";
  FunFanfare.desc = "Ess.Easy.Fun.fanfare(win) -- true: victory sting, false: defeat sting";
  FunFanfare.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Fun.fanfare(" + (this.properties.win ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/fun/fanfare", FunFanfare);
})();
