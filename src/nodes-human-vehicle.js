/* nodes-human-vehicle.js -- Ess.Human and Ess.Vehicle direct-namespace ("Core" tier) node types, as
 * opposed to the Ess.Easy.Human / Ess.Easy.Vehicle wrappers already covered elsewhere in this repo
 * (nodes-player.js's Give Weapon, nodes-world.js's Summon Vehicle -- neither is duplicated here). Same
 * three-part shape as nodes.js's header comment describes: exec/then action pins for anything that runs
 * a real engine call, addInput+addProperty+addWidget for wireable values, onAction -> CodeGen.emit(...)
 * -> this.triggerSlot(0); pure-data getter nodes have no exec pins and use onExecute + setOutputData to
 * emit the CALL EXPRESSION as Lua source text (never a resolved value -- see codegen.js's header for why).
 *
 * Signatures verified directly against mercs2-lua-essentials source (not just CAPABILITIES.md):
 *   src/14_human.lua    -- the Ess.Human namespace
 *   src/12_vehicle.lua  -- the Ess.Vehicle namespace
 *
 * GUID INPUTS: every uChar/uWeapon/uVeh/uHeli parameter below is a STRING data slot carrying a Lua
 * EXPRESSION, not a real string to quote -- same convention nodes-markers-camera.js documents at length,
 * resolved with a local resolveRawInput(node, slotIndex, propName) twin (copied here rather than shared
 * through codegen.js, matching that file's own note on why this helper is intentionally duplicated per
 * file). Every wrapped Human/Vehicle function below is pcall-guarded on the Lua side, so a default guid
 * of the "wrong" entity kind (e.g. a character guid where a weapon/vehicle guid is expected) still
 * compiles and runs without throwing -- it just no-ops -- which is why "Ess.Player.character(0)" is used
 * uniformly as the required-guid default, exactly as the rest of this repo already does for guid inputs
 * that aren't strictly characters either (see CameraWatch/SpawnFxOn in their respective files).
 *
 * CALLBACK PARAMETERS (flyTo's opts.onReady, orbitFlight's opts.onDone): both are simple, no-arg
 * completion callbacks, modeled as raw Lua-source TEXT properties spliced into the opts table (blank =
 * omitted from the table so the real function's own "if opts.onReady then ..." guard just skips it) --
 * same convention nodes-utility.js established for the Triggers/Menu callbacks, not a second wired exec
 * branch.
 *
 * PURE-DATA GETTERS (maxAmmo/ammo/primaryWeapon/secondaryWeapon/driver/seatOf/isFlipped): no exec pins
 * and no wired data inputs either -- just a property + text widget for the guid argument, read directly
 * in onExecute, matching PlayerCharacter/DebugIsOn in nodes-player.js exactly.
 *
 * DOCUMENTED SKIPS: Ess.Human.allWeapons and Ess.Vehicle.followGhost are both intentionally left out --
 * see the one-line comments at their would-be call sites below for why.
 */
(function () {
  "use strict";

  // Resolve a node's input slot exactly like CodeGen.resolveNumberInput does (wired value wins, else the
  // property default) but without any numeric assumption -- used for guid/table-literal EXPRESSION inputs
  // (spliced raw, never through CodeGen.luaString). Local per-file twin, same pattern as
  // nodes-markers-camera.js and nodes-utility.js each keep their own copy of.
  function resolveRawInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  // ============================================================
  // Ess/Human/DoAction -- Ess.Human.doAction(uChar, sActionName). "Cower" is a confirmed real action name
  // straight from the Ess source comment (src/14_human.lua), alongside "Stand"/"Proximity".
  // ============================================================
  function HumanDoAction() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
    this.addProperty("sActionName", "Cower");
    this.addWidget("text", "sActionName", this.properties.sActionName, function (v) { this.properties.sActionName = v; }.bind(this));
  }
  HumanDoAction.title = "Human: Do Action";
  HumanDoAction.desc = "Ess.Human.doAction(uChar, sActionName) -- Human.DoAction, e.g. \"Cower\"/\"Stand\"/\"Proximity\"";
  HumanDoAction.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");  // input 0 is "exec"
    var sActionName = CodeGen.luaString(this.properties.sActionName);
    CodeGen.emit("Ess.Human.doAction(" + uChar + ", " + sActionName + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/doaction", HumanDoAction);

  // ============================================================
  // Ess/Human/EquipWeapon -- Ess.Human.equipWeapon(uChar, uWeapon) -- Human.Inventory.EquipWeapon.
  // ============================================================
  function HumanEquipWeapon() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
    this.addInput("uWeapon", "string");
    this.addProperty("uWeapon", "Ess.Player.character(0)");
    this.addWidget("text", "uWeapon", this.properties.uWeapon, function (v) { this.properties.uWeapon = v; }.bind(this));
  }
  HumanEquipWeapon.title = "Human: Equip Weapon";
  HumanEquipWeapon.desc = "Ess.Human.equipWeapon(uChar, uWeapon) -- Human.Inventory.EquipWeapon";
  HumanEquipWeapon.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");    // input 0 is "exec"
    var uWeapon = resolveRawInput(this, 2, "uWeapon");
    CodeGen.emit("Ess.Human.equipWeapon(" + uChar + ", " + uWeapon + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/equipweapon", HumanEquipWeapon);

  // ============================================================
  // Ess/Human/RefillAmmo -- Ess.Human.refillAmmo(uWeapon) -- sets reserve ammo to max reserve ammo.
  // ============================================================
  function HumanRefillAmmo() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uWeapon", "string");
    this.addProperty("uWeapon", "Ess.Player.character(0)");
    this.addWidget("text", "uWeapon", this.properties.uWeapon, function (v) { this.properties.uWeapon = v; }.bind(this));
  }
  HumanRefillAmmo.title = "Human: Refill Ammo";
  HumanRefillAmmo.desc = "Ess.Human.refillAmmo(uWeapon) -- Weapon.SetReserveAmmo(w, Weapon.GetMaxReserveAmmo(w))";
  HumanRefillAmmo.prototype.onAction = function () {
    var uWeapon = resolveRawInput(this, 1, "uWeapon");  // input 0 is "exec"
    CodeGen.emit("Ess.Human.refillAmmo(" + uWeapon + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/refillammo", HumanRefillAmmo);

  // ============================================================
  // Ess/Human/SetInfiniteAmmo -- Ess.Human.setInfiniteAmmo(uChar, bOn) -- Object.SetInfiniteAmmo, keeps
  // reserve ammo maxed forever (the current magazine still empties and still needs a reload).
  // ============================================================
  function HumanSetInfiniteAmmo() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
    this.addProperty("bOn", true);
    this.addWidget("toggle", "bOn", this.properties.bOn, function (v) { this.properties.bOn = v; }.bind(this));
  }
  HumanSetInfiniteAmmo.title = "Human: Set Infinite Ammo";
  HumanSetInfiniteAmmo.desc = "Ess.Human.setInfiniteAmmo(uChar, bOn) -- Object.SetInfiniteAmmo";
  HumanSetInfiniteAmmo.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");  // input 0 is "exec"
    CodeGen.emit("Ess.Human.setInfiniteAmmo(" + uChar + ", " + (this.properties.bOn ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/setinfiniteammo", HumanSetInfiniteAmmo);

  // ============================================================
  // Ess/Human/Knockdown -- Ess.Human.knockdown(uChar, nDuration). Lua-side default nDuration is 0.5.
  // ============================================================
  function HumanKnockdown() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
    this.addInput("nDuration", "number");
    this.addProperty("nDuration", 0.5);
    this.addWidget("number", "nDuration", this.properties.nDuration, function (v) { this.properties.nDuration = v; }.bind(this));
  }
  HumanKnockdown.title = "Human: Knockdown";
  HumanKnockdown.desc = "Ess.Human.knockdown(uChar, nDuration)";
  HumanKnockdown.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");  // input 0 is "exec"
    var nDuration = CodeGen.resolveNumberInput(this, 2, "nDuration");
    CodeGen.emit("Ess.Human.knockdown(" + uChar + ", " + nDuration + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/knockdown", HumanKnockdown);

  // ============================================================
  // Ess/Human/DropWeapon -- Ess.Human.dropWeapon(uChar, uWeapon) -- Human.Inventory.DropWeapon.
  // ============================================================
  function HumanDropWeapon() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
    this.addInput("uWeapon", "string");
    this.addProperty("uWeapon", "Ess.Player.character(0)");
    this.addWidget("text", "uWeapon", this.properties.uWeapon, function (v) { this.properties.uWeapon = v; }.bind(this));
  }
  HumanDropWeapon.title = "Human: Drop Weapon";
  HumanDropWeapon.desc = "Ess.Human.dropWeapon(uChar, uWeapon) -- Human.Inventory.DropWeapon";
  HumanDropWeapon.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");    // input 0 is "exec"
    var uWeapon = resolveRawInput(this, 2, "uWeapon");
    CodeGen.emit("Ess.Human.dropWeapon(" + uChar + ", " + uWeapon + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/dropweapon", HumanDropWeapon);

  // ============================================================
  // Ess/Human/DisableWeapons -- Ess.Human.disableWeapons(uChar) -- Human.DisableWeapons.
  // ============================================================
  function HumanDisableWeapons() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
  }
  HumanDisableWeapons.title = "Human: Disable Weapons";
  HumanDisableWeapons.desc = "Ess.Human.disableWeapons(uChar)";
  HumanDisableWeapons.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");  // input 0 is "exec"
    CodeGen.emit("Ess.Human.disableWeapons(" + uChar + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/disableweapons", HumanDisableWeapons);

  // ============================================================
  // Ess/Human/EnableWeapons -- Ess.Human.enableWeapons(uChar) -- Human.EnableWeapons.
  // ============================================================
  function HumanEnableWeapons() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
  }
  HumanEnableWeapons.title = "Human: Enable Weapons";
  HumanEnableWeapons.desc = "Ess.Human.enableWeapons(uChar)";
  HumanEnableWeapons.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");  // input 0 is "exec"
    CodeGen.emit("Ess.Human.enableWeapons(" + uChar + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/enableweapons", HumanEnableWeapons);

  // ============================================================
  // Ess/Human/ReloadAll -- Ess.Human.reloadAll(uChar) -- Human.Inventory.ReloadAll(uChar, false).
  // ============================================================
  function HumanReloadAll() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
  }
  HumanReloadAll.title = "Human: Reload All";
  HumanReloadAll.desc = "Ess.Human.reloadAll(uChar) -- Human.Inventory.ReloadAll(uChar, false)";
  HumanReloadAll.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");  // input 0 is "exec"
    CodeGen.emit("Ess.Human.reloadAll(" + uChar + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/reloadall", HumanReloadAll);

  // ============================================================
  // Ess/Human/SetAmmo -- Ess.Human.setAmmo(uWeapon, n) -- Weapon.SetReserveAmmo.
  // ============================================================
  function HumanSetAmmo() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uWeapon", "string");
    this.addProperty("uWeapon", "Ess.Player.character(0)");
    this.addWidget("text", "uWeapon", this.properties.uWeapon, function (v) { this.properties.uWeapon = v; }.bind(this));
    this.addInput("n", "number");
    this.addProperty("n", 999);
    this.addWidget("number", "n", this.properties.n, function (v) { this.properties.n = v; }.bind(this));
  }
  HumanSetAmmo.title = "Human: Set Ammo";
  HumanSetAmmo.desc = "Ess.Human.setAmmo(uWeapon, n) -- Weapon.SetReserveAmmo";
  HumanSetAmmo.prototype.onAction = function () {
    var uWeapon = resolveRawInput(this, 1, "uWeapon");  // input 0 is "exec"
    var n = CodeGen.resolveNumberInput(this, 2, "n");
    CodeGen.emit("Ess.Human.setAmmo(" + uWeapon + ", " + n + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/human/setammo", HumanSetAmmo);

  // ============================================================
  // Ess/Human/MaxAmmo -- a PURE DATA node wrapping Ess.Human.maxAmmo(uWeapon) -> n -- Weapon.GetMaxReserveAmmo.
  // ============================================================
  function HumanMaxAmmo() {
    this.addOutput("maxAmmo", "number");
    this.addProperty("uWeapon", "Ess.Player.character(0)");
    this.addWidget("text", "uWeapon", this.properties.uWeapon, function (v) { this.properties.uWeapon = v; }.bind(this));
  }
  HumanMaxAmmo.title = "Human: Max Ammo";
  HumanMaxAmmo.desc = "Ess.Human.maxAmmo(uWeapon) -- emits Lua source, not a resolved number (see codegen.js header)";
  HumanMaxAmmo.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Human.maxAmmo(" + this.properties.uWeapon + ")");
  };
  LiteGraph.registerNodeType("ess/human/maxammo", HumanMaxAmmo);

  // ============================================================
  // Ess/Human/Ammo -- a PURE DATA node wrapping Ess.Human.ammo(uWeapon) -> n -- Weapon.GetReserveAmmo.
  // ============================================================
  function HumanAmmo() {
    this.addOutput("ammo", "number");
    this.addProperty("uWeapon", "Ess.Player.character(0)");
    this.addWidget("text", "uWeapon", this.properties.uWeapon, function (v) { this.properties.uWeapon = v; }.bind(this));
  }
  HumanAmmo.title = "Human: Ammo";
  HumanAmmo.desc = "Ess.Human.ammo(uWeapon) -- emits Lua source, not a resolved number (see codegen.js header)";
  HumanAmmo.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Human.ammo(" + this.properties.uWeapon + ")");
  };
  LiteGraph.registerNodeType("ess/human/ammo", HumanAmmo);

  // ============================================================
  // Ess/Human/PrimaryWeapon -- a PURE DATA node wrapping Ess.Human.primaryWeapon(uChar) -> uGuid|nil --
  // Human.Inventory.GetPrimaryWeapon.
  // ============================================================
  function HumanPrimaryWeapon() {
    this.addOutput("weapon", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
  }
  HumanPrimaryWeapon.title = "Human: Primary Weapon";
  HumanPrimaryWeapon.desc = "Ess.Human.primaryWeapon(uChar) -- emits Lua source, not a resolved guid (see codegen.js header)";
  HumanPrimaryWeapon.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Human.primaryWeapon(" + this.properties.uChar + ")");
  };
  LiteGraph.registerNodeType("ess/human/primaryweapon", HumanPrimaryWeapon);

  // ============================================================
  // Ess/Human/SecondaryWeapon -- a PURE DATA node wrapping Ess.Human.secondaryWeapon(uChar) -> uGuid|nil --
  // Human.Inventory.GetSecondaryWeapon.
  // ============================================================
  function HumanSecondaryWeapon() {
    this.addOutput("weapon", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
  }
  HumanSecondaryWeapon.title = "Human: Secondary Weapon";
  HumanSecondaryWeapon.desc = "Ess.Human.secondaryWeapon(uChar) -- emits Lua source, not a resolved guid (see codegen.js header)";
  HumanSecondaryWeapon.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Human.secondaryWeapon(" + this.properties.uChar + ")");
  };
  LiteGraph.registerNodeType("ess/human/secondaryweapon", HumanSecondaryWeapon);

  // Ess.Human.allWeapons(uChar) -- SKIPPED: returns a table ({ uGuid, ... }), not a single value, so it
  // doesn't fit the pure-data "emit one call expression" getter model any getter node here uses -- same
  // reasoning as any other multi/table-return getter this pass leaves out.

  // ============================================================
  // Ess/Vehicle/Driver -- a PURE DATA node wrapping Ess.Vehicle.driver(uVeh) -> uCharGuid|nil -- Vehicle.GetDriver.
  // ============================================================
  function VehicleDriver() {
    this.addOutput("driver", "string");
    this.addProperty("uVeh", "Ess.Player.character(0)");
    this.addWidget("text", "uVeh", this.properties.uVeh, function (v) { this.properties.uVeh = v; }.bind(this));
  }
  VehicleDriver.title = "Vehicle: Driver";
  VehicleDriver.desc = "Ess.Vehicle.driver(uVeh) -- emits Lua source, not a resolved guid (see codegen.js header)";
  VehicleDriver.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Vehicle.driver(" + this.properties.uVeh + ")");
  };
  LiteGraph.registerNodeType("ess/vehicle/driver", VehicleDriver);

  // ============================================================
  // Ess/Vehicle/Exit -- Ess.Vehicle.exit(uVeh, uChar) -- Vehicle.Exit(uVeh, uChar, true).
  // ============================================================
  function VehicleExit() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVeh", "string");
    this.addProperty("uVeh", "Ess.Player.character(0)");
    this.addWidget("text", "uVeh", this.properties.uVeh, function (v) { this.properties.uVeh = v; }.bind(this));
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
  }
  VehicleExit.title = "Vehicle: Exit";
  VehicleExit.desc = "Ess.Vehicle.exit(uVeh, uChar) -- Vehicle.Exit(uVeh, uChar, true)";
  VehicleExit.prototype.onAction = function () {
    var uVeh = resolveRawInput(this, 1, "uVeh");    // input 0 is "exec"
    var uChar = resolveRawInput(this, 2, "uChar");
    CodeGen.emit("Ess.Vehicle.exit(" + uVeh + ", " + uChar + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/vehicle/exit", VehicleExit);

  // ============================================================
  // Ess/Vehicle/Repair -- Ess.Vehicle.repair(uVeh) -- Vehicle.RestoreHealth + Vehicle.RestoreAmmo.
  // ============================================================
  function VehicleRepair() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVeh", "string");
    this.addProperty("uVeh", "Ess.Player.character(0)");
    this.addWidget("text", "uVeh", this.properties.uVeh, function (v) { this.properties.uVeh = v; }.bind(this));
  }
  VehicleRepair.title = "Vehicle: Repair";
  VehicleRepair.desc = "Ess.Vehicle.repair(uVeh) -- full heal + rearm in one call";
  VehicleRepair.prototype.onAction = function () {
    var uVeh = resolveRawInput(this, 1, "uVeh");  // input 0 is "exec"
    CodeGen.emit("Ess.Vehicle.repair(" + uVeh + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/vehicle/repair", VehicleRepair);

  // ============================================================
  // Ess/Vehicle/EvictAll -- Ess.Vehicle.evictAll(uVeh) -- Ai.EveryoneOut(uVeh), takes the VEHICLE's own
  // guid (not a rider/pilot guid).
  // ============================================================
  function VehicleEvictAll() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVeh", "string");
    this.addProperty("uVeh", "Ess.Player.character(0)");
    this.addWidget("text", "uVeh", this.properties.uVeh, function (v) { this.properties.uVeh = v; }.bind(this));
  }
  VehicleEvictAll.title = "Vehicle: Evict All";
  VehicleEvictAll.desc = "Ess.Vehicle.evictAll(uVeh) -- force every occupant out at once (Ai.EveryoneOut)";
  VehicleEvictAll.prototype.onAction = function () {
    var uVeh = resolveRawInput(this, 1, "uVeh");  // input 0 is "exec"
    CodeGen.emit("Ess.Vehicle.evictAll(" + uVeh + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/vehicle/evictall", VehicleEvictAll);

  // ============================================================
  // Ess/Vehicle/SeatOf -- a PURE DATA node wrapping Ess.Vehicle.seatOf(uChar) -> sSeat|nil --
  // Vehicle.GetSeatFromRider. sSeat is one of "d"/"g"/"p"/"c" (driver/gunner/passenger/cargo).
  // ============================================================
  function VehicleSeatOf() {
    this.addOutput("seat", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
  }
  VehicleSeatOf.title = "Vehicle: Seat Of";
  VehicleSeatOf.desc = "Ess.Vehicle.seatOf(uChar) -- emits Lua source, not a resolved seat string (see codegen.js header)";
  VehicleSeatOf.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Vehicle.seatOf(" + this.properties.uChar + ")");
  };
  LiteGraph.registerNodeType("ess/vehicle/seatof", VehicleSeatOf);

  // ============================================================
  // Ess/Vehicle/IsFlipped -- a PURE DATA node wrapping Ess.Vehicle.isFlipped(uVeh) -> bool -- Vehicle.IsFlipped.
  // ============================================================
  function VehicleIsFlipped() {
    this.addOutput("isFlipped", "boolean");
    this.addProperty("uVeh", "Ess.Player.character(0)");
    this.addWidget("text", "uVeh", this.properties.uVeh, function (v) { this.properties.uVeh = v; }.bind(this));
  }
  VehicleIsFlipped.title = "Vehicle: Is Flipped";
  VehicleIsFlipped.desc = "Ess.Vehicle.isFlipped(uVeh) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  VehicleIsFlipped.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Vehicle.isFlipped(" + this.properties.uVeh + ")");
  };
  LiteGraph.registerNodeType("ess/vehicle/isflipped", VehicleIsFlipped);

  // ============================================================
  // Ess/Vehicle/Land -- Ess.Vehicle.land(uHeliOrPilot) -- Ai.HeliLand(pilot). Accepts either the heli
  // (pilot resolved via .driver) or the pilot guid directly. LIVE-CONFIRMED pattern (0.3.1 release pass):
  // an autonomous combat AI heli overrides the land order -- fly it under scripted control first (see
  // Vehicle: Fly To below), then land.
  // ============================================================
  function VehicleLand() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uHeliOrPilot", "string");
    this.addProperty("uHeliOrPilot", "Ess.Player.character(0)");
    this.addWidget("text", "uHeliOrPilot", this.properties.uHeliOrPilot, function (v) { this.properties.uHeliOrPilot = v; }.bind(this));
  }
  VehicleLand.title = "Vehicle: Land";
  VehicleLand.desc = "Ess.Vehicle.land(uHeliOrPilot) -- command an AI helicopter to descend and set down";
  VehicleLand.prototype.onAction = function () {
    var uHeliOrPilot = resolveRawInput(this, 1, "uHeliOrPilot");  // input 0 is "exec"
    CodeGen.emit("Ess.Vehicle.land(" + uHeliOrPilot + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/vehicle/land", VehicleLand);

  // ============================================================
  // Ess/Vehicle/FlyTo -- Ess.Vehicle.flyTo(uHeli, x, y, z, opts) -- Ai.Deliver once a driver exists.
  // opts.height/careless are exposed directly (Lua-side defaults 0.5/false); opts.onReady is a simple
  // no-arg completion callback modeled as raw Lua-source TEXT (blank = omitted from the opts table, see
  // file header) -- fires once the flight order is actually issued.
  // ============================================================
  function VehicleFlyTo() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uHeli", "string");
    this.addProperty("uHeli", "Ess.Player.character(0)");
    this.addWidget("text", "uHeli", this.properties.uHeli, function (v) { this.properties.uHeli = v; }.bind(this));
    this.addInput("x", "number");
    this.addProperty("x", 0);
    this.addWidget("number", "x", this.properties.x, function (v) { this.properties.x = v; }.bind(this));
    this.addInput("y", "number");
    this.addProperty("y", 0);
    this.addWidget("number", "y", this.properties.y, function (v) { this.properties.y = v; }.bind(this));
    this.addInput("z", "number");
    this.addProperty("z", 0);
    this.addWidget("number", "z", this.properties.z, function (v) { this.properties.z = v; }.bind(this));
    this.addInput("height", "number");
    this.addProperty("height", 0.5);
    this.addWidget("number", "height", this.properties.height, function (v) { this.properties.height = v; }.bind(this));
    this.addProperty("careless", false);
    this.addWidget("toggle", "careless", this.properties.careless, function (v) { this.properties.careless = v; }.bind(this));
    this.addProperty("onReady", "");
    this.addWidget("text", "onReady (blank = none)", this.properties.onReady, function (v) { this.properties.onReady = v; }.bind(this));
  }
  VehicleFlyTo.title = "Vehicle: Fly To";
  VehicleFlyTo.desc = "Ess.Vehicle.flyTo(uHeli, x, y, z, opts) -- opts.onReady is raw Lua function-literal text, see file header";
  VehicleFlyTo.prototype.onAction = function () {
    var uHeli = resolveRawInput(this, 1, "uHeli");    // input 0 is "exec"
    var x = CodeGen.resolveNumberInput(this, 2, "x");
    var y = CodeGen.resolveNumberInput(this, 3, "y");
    var z = CodeGen.resolveNumberInput(this, 4, "z");
    var height = CodeGen.resolveNumberInput(this, 5, "height");
    var careless = this.properties.careless ? "true" : "false";
    var onReady = (this.properties.onReady && this.properties.onReady.trim()) ? this.properties.onReady : "";
    var opts = "{ height = " + height + ", careless = " + careless + (onReady ? ", onReady = " + onReady : "") + " }";
    CodeGen.emit("Ess.Vehicle.flyTo(" + uHeli + ", " + x + ", " + y + ", " + z + ", " + opts + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/vehicle/flyto", VehicleFlyTo);

  // ============================================================
  // Ess/Vehicle/EnterBestSeat -- Ess.Vehicle.enterBestSeat(uChar, uVeh) -- MrxUtil.EnterBestAvailableSeat,
  // confirmed d/g/p/c (driver/gunner/passenger/cargo) seat priority order.
  // ============================================================
  function VehicleEnterBestSeat() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
    this.addInput("uVeh", "string");
    this.addProperty("uVeh", "Ess.Player.character(0)");
    this.addWidget("text", "uVeh", this.properties.uVeh, function (v) { this.properties.uVeh = v; }.bind(this));
  }
  VehicleEnterBestSeat.title = "Vehicle: Enter Best Seat";
  VehicleEnterBestSeat.desc = "Ess.Vehicle.enterBestSeat(uChar, uVeh) -- MrxUtil.EnterBestAvailableSeat";
  VehicleEnterBestSeat.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");  // input 0 is "exec"
    var uVeh = resolveRawInput(this, 2, "uVeh");
    CodeGen.emit("Ess.Vehicle.enterBestSeat(" + uChar + ", " + uVeh + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/vehicle/enterbestseat", VehicleEnterBestSeat);

  // ============================================================
  // Ess/Vehicle/EnterSeatExcluding -- Ess.Vehicle.enterSeatExcluding(uChar, uVeh, excludeSeats) -- for
  // "board a vehicle but never take the driver seat". excludeSeats is a Lua table-literal of seat-type
  // codes ("d"/"g"/"p"/"c"), modeled as raw text like the guid/list conventions elsewhere in this repo
  // (nodes-encounter.js) -- never through CodeGen.luaString. Default excludes the driver seat, matching
  // the confirmed co-op-partner-boarding use case documented in the Lua source.
  // ============================================================
  function VehicleEnterSeatExcluding() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uChar", "string");
    this.addProperty("uChar", "Ess.Player.character(0)");
    this.addWidget("text", "uChar", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
    this.addInput("uVeh", "string");
    this.addProperty("uVeh", "Ess.Player.character(0)");
    this.addWidget("text", "uVeh", this.properties.uVeh, function (v) { this.properties.uVeh = v; }.bind(this));
    this.addInput("excludeSeats", "string");
    this.addProperty("excludeSeats", "{ 'd' }");
    this.addWidget("text", "excludeSeats", this.properties.excludeSeats, function (v) { this.properties.excludeSeats = v; }.bind(this));
  }
  VehicleEnterSeatExcluding.title = "Vehicle: Enter Seat Excluding";
  VehicleEnterSeatExcluding.desc = "Ess.Vehicle.enterSeatExcluding(uChar, uVeh, excludeSeats) -- excludeSeats is a Lua table literal of \"d\"/\"g\"/\"p\"/\"c\"";
  VehicleEnterSeatExcluding.prototype.onAction = function () {
    var uChar = resolveRawInput(this, 1, "uChar");    // input 0 is "exec"
    var uVeh = resolveRawInput(this, 2, "uVeh");
    var excludeSeats = resolveRawInput(this, 3, "excludeSeats");
    CodeGen.emit("Ess.Vehicle.enterSeatExcluding(" + uChar + ", " + uVeh + ", " + excludeSeats + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/vehicle/enterseatexcluding", VehicleEnterSeatExcluding);

  // Ess.Vehicle.followGhost(template, x, y, z) -> ghost|nil -- SKIPPED: returns a stateful "ghost" object
  // (a .guid field plus bound :update()/:remove() closures over that guid), not a single primitive value.
  // Re-evaluating a call-expression-as-text default on every read (this compiler's whole pure-data model)
  // would spawn a brand NEW ghost each time rather than reuse the one instance the caller needs to hold
  // onto -- doesn't fit any better than a table return does, same reasoning as allWeapons above.

  // ============================================================
  // Ess/Vehicle/OrbitFlight -- Ess.Vehicle.orbitFlight(uHeli, cx, cy, cz, opts) -- fly a CREWED heli a few
  // laps around a point. opts.radius/orbits are exposed directly (Lua-side defaults 90/2); opts.onDone is
  // a simple no-arg completion callback modeled as raw Lua-source TEXT (blank = omitted, see file header)
  // -- fires after the last leg. The real function's own return (totalSeconds) is discarded, same as every
  // other action node here that ignores a secondary/incidental return value.
  // ============================================================
  function VehicleOrbitFlight() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uHeli", "string");
    this.addProperty("uHeli", "Ess.Player.character(0)");
    this.addWidget("text", "uHeli", this.properties.uHeli, function (v) { this.properties.uHeli = v; }.bind(this));
    this.addInput("cx", "number");
    this.addProperty("cx", 0);
    this.addWidget("number", "cx", this.properties.cx, function (v) { this.properties.cx = v; }.bind(this));
    this.addInput("cy", "number");
    this.addProperty("cy", 0);
    this.addWidget("number", "cy", this.properties.cy, function (v) { this.properties.cy = v; }.bind(this));
    this.addInput("cz", "number");
    this.addProperty("cz", 0);
    this.addWidget("number", "cz", this.properties.cz, function (v) { this.properties.cz = v; }.bind(this));
    this.addInput("radius", "number");
    this.addProperty("radius", 90);
    this.addWidget("number", "radius", this.properties.radius, function (v) { this.properties.radius = v; }.bind(this));
    this.addInput("orbits", "number");
    this.addProperty("orbits", 2);
    this.addWidget("number", "orbits", this.properties.orbits, function (v) { this.properties.orbits = v; }.bind(this));
    this.addProperty("onDone", "");
    this.addWidget("text", "onDone (blank = none)", this.properties.onDone, function (v) { this.properties.onDone = v; }.bind(this));
  }
  VehicleOrbitFlight.title = "Vehicle: Orbit Flight";
  VehicleOrbitFlight.desc = "Ess.Vehicle.orbitFlight(uHeli, cx, cy, cz, opts) -- opts.onDone is raw Lua function-literal text, see file header";
  VehicleOrbitFlight.prototype.onAction = function () {
    var uHeli = resolveRawInput(this, 1, "uHeli");    // input 0 is "exec"
    var cx = CodeGen.resolveNumberInput(this, 2, "cx");
    var cy = CodeGen.resolveNumberInput(this, 3, "cy");
    var cz = CodeGen.resolveNumberInput(this, 4, "cz");
    var radius = CodeGen.resolveNumberInput(this, 5, "radius");
    var orbits = CodeGen.resolveNumberInput(this, 6, "orbits");
    var onDone = (this.properties.onDone && this.properties.onDone.trim()) ? this.properties.onDone : "";
    var opts = "{ radius = " + radius + ", orbits = " + orbits + (onDone ? ", onDone = " + onDone : "") + " }";
    CodeGen.emit("Ess.Vehicle.orbitFlight(" + uHeli + ", " + cx + ", " + cy + ", " + cz + ", " + opts + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/vehicle/orbitflight", VehicleOrbitFlight);
})();
