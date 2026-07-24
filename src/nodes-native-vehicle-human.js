/* nodes-native-vehicle-human.js -- NATIVE Vehicle.* and Human.* node types: bare engine calls straight off
 * the wiki's namespace reference pages, not Ess wrappers. These cover real Vehicle/Human engine capability
 * Ess's own framework doesn't wrap at all yet -- doors, turrets, the hijack state machine, raw animation
 * playback, forced/no-snap seat exit, ragdoll-adjacent state, and a handful of granular getters. See
 * codegen.js's "Native tier" section for what makes a Native node different from every Ess node in this
 * repo (distinct color, CodeGen.emitNative's extra pcall wrap).
 *
 * Source of truth for every signature/caveat below is the wiki, NOT mercs2-lua-essentials:
 *   docs/mercs2-luacd/wiki/namespaces/vehicle.md
 *   docs/mercs2-luacd/wiki/namespaces/human.md
 * Both pages are themselves derived from a live pairs() dump plus real call-site grepping across the
 * decompiled corpus -- "Confirmed"/"Live-confirmed" rows are solid; "no call sites found" rows are real
 * (the function exists) but their argument shape beyond a leading guid is inferred from naming convention
 * only, and this file only turns those into nodes when the guessed shape is simple and low-risk (a single
 * guid, or guid plus one plain value).
 *
 * DO NOT DUPLICATE ESS COVERAGE: nodes-human-vehicle.js already wraps Vehicle.GetDriver, Vehicle.Exit,
 * Vehicle.GetSeatFromRider, and Vehicle.IsFlipped (as Ess.Vehicle.driver/exit/seatOf/isFlipped), plus
 * Vehicle.RestoreHealth + Vehicle.RestoreAmmo combined (as Ess.Vehicle.repair) -- none of those four are
 * repeated here. Vehicle.RestoreHealth and Vehicle.RestoreAmmo ARE each still given their own node below
 * despite repair() covering their combination, because repair() is all-or-nothing: these two let a mod
 * restore only health or only ammo, a capability Ess genuinely doesn't expose on its own. On the Human
 * side, nodes-human-vehicle.js already wraps Human.DoAction, Human.Inventory.EquipWeapon/DropWeapon/
 * ReloadAll/GetPrimaryWeapon/GetSecondaryWeapon, Human.Knockdown, Human.DisableWeapons, and
 * Human.EnableWeapons (as Ess.Human.doAction/equipWeapon/dropWeapon/reloadAll/primaryWeapon/
 * secondaryWeapon/knockdown/disableWeapons/enableWeapons) -- none of those are repeated here either. See
 * the per-node skip comments throughout for everything else left out and why (table-return getters,
 * fully-unconfirmed signatures, ambiguous or broken live-probe results, variadic "..." forms).
 *
 * GUID INPUTS / STRING PARAMS / NUMBERS / BOOLEANS / PURE-DATA GETTERS: identical conventions to
 * nodes-human-vehicle.js's own header -- same local resolveRawInput(node, slotIndex, propName) twin
 * (copied below, per this repo's per-file convention), same "Ess.Player.character(0)" universal
 * placeholder default for every required guid regardless of the entity kind actually expected (character/
 * vehicle/seat/weapon -- none of the guids below have a Lua-confirmed nil-safe path, so none default to
 * bare "nil"), same luaString(...) wrapping for plain text parameters, same discard-the-secondary-return
 * treatment nodes-object.js's Object.spawn established for action nodes whose wrapped call returns
 * something incidental (a success bool, a previous-state bool). Pure-data getters here follow
 * nodes-human-vehicle.js's simpler style exactly: no exec pins, no wired data inputs, just a property plus
 * text/number widget per argument, read directly in onExecute.
 *
 * ACTION NODES HERE USE CodeGen.emitNative, NOT CodeGen.emit -- see codegen.js's Native tier note for why
 * (defense in depth on top of these namespaces' own fail-safe behavior). Pure-data getters still use plain
 * setOutputData with no pcall wrap -- nothing executes at compile time regardless (see codegen.js's opening
 * comment on why every data node just emits Lua source text, never a computed value).
 *
 * TURRET CAVEAT: per the wiki's own "Notes for modders", nothing on this namespace selects what a turret
 * fires -- EnableTurret/SetTurretPitch/SetTurretYaw below only ever control orientation and enable/disable
 * state, confirmed by every real call site being part of the hijack cinematic's turret-control handoff.
 */
(function () {
  "use strict";

  // Resolve a node's input slot exactly like CodeGen.resolveNumberInput does (wired value wins, else the
  // property default) but without any numeric assumption -- used for guid/table-literal EXPRESSION inputs
  // (spliced raw, never through CodeGen.luaString). Local per-file twin, same pattern every other
  // nodes-*.js file in this repo keeps (see nodes-human-vehicle.js's own header for why this isn't shared
  // centrally through codegen.js).
  function resolveRawInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  // ============================================================================================
  // VEHICLE -- Seats & Riders
  // ============================================================================================

  // Vehicle.GetRiders(uVehicle, sSeatType?) -- SKIPPED: returns a TABLE of rider guids, not a single value
  // -- doesn't fit the pure-data "emit one call expression" getter model any getter node in this repo
  // uses, same reasoning nodes-human-vehicle.js already gives for skipping Ess.Human.allWeapons.

  // Vehicle.GetSeatFromRider(uCharacter) -- SKIPPED: this is exactly what Ess.Vehicle.seatOf(uChar) already
  // wraps (nodes-human-vehicle.js) -- no native equivalent needed, per the Do-Not-Duplicate list above.

  // Vehicle.GetRiderFromSeat(uVehicle, seat) -- SKIPPED: probed live over the WebSocket lua-bridge
  // (2026-07-22) and still inconclusive -- neither a string nor a number seat-id argument returned
  // anything but nil, so the correct seat-id shape remains genuinely unresolved. Not safe to ship a node
  // whose only confirmed behavior is "always returns nil".

  // ============================================================
  // Native/Vehicle/GetSeatByType -- a PURE DATA node wrapping Vehicle.GetSeatByType(uVehicle, sSeatType) ->
  // uSeatGuid. The optional trailing bBoolFlag some call sites pass is dropped here -- its effect is
  // unconfirmed. The returned seat guid is what TransferToSeat/EnterBySeatGuid below expect for their
  // uSeat argument.
  // ============================================================
  function NativeVehicleGetSeatByType() {
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addProperty("sSeatType", "d");
    this.addWidget("text", "sSeatType", this.properties.sSeatType, function (v) { this.properties.sSeatType = v; }.bind(this));
    this.addOutput("seat", "string");
  }
  NativeVehicleGetSeatByType.title = "Vehicle: Get Seat By Type";
  NativeVehicleGetSeatByType.desc = "Vehicle.GetSeatByType(uVehicle, sSeatType) -- \"d\"/\"g\"/\"p\" -- trailing optional bBoolFlag omitted, unconfirmed effect";
  NativeVehicleGetSeatByType.prototype.onExecute = function () {
    var sSeatType = CodeGen.luaString(this.properties.sSeatType);
    this.setOutputData(0, "Vehicle.GetSeatByType(" + this.properties.uVehicle + ", " + sSeatType + ")");
  };
  LiteGraph.registerNodeType("native/vehicle/getseatbytype", NativeVehicleGetSeatByType);

  // Vehicle.GetSeatToSeat(uSeat, bBoolFlag) -- SKIPPED: notes describe it as returning "possible
  // seat-transfer targets" (plural), meaning this is very likely another table-shaped return, and the
  // boolean argument's meaning is undocumented on top of that -- doesn't clear the bar for a pure-data
  // single-value getter node.

  // Vehicle.GetFromSeat(uVehicle, seat) -- SKIPPED: probed live over the WebSocket lua-bridge (2026-07-22),
  // same inconclusive result as GetRiderFromSeat above -- neither a string nor a number seat-id argument
  // returned anything but nil. Needs a real seat guid (e.g. from GetSeatByType) re-probed before this is
  // safe to expose as a working node.

  // Vehicle.GetSeatParams(uSeat) -- SKIPPED: returns a TABLE (at least an IsGunner field per observed
  // usage), not a single value -- same table-return reasoning as GetRiders above.

  // ============================================================
  // Native/Vehicle/TransferToSeat -- Vehicle.TransferToSeat(uVehicle, uSeat, bFlag). Moves a rider directly
  // into a seat guid -- e.g. swap a passenger into the gunner seat mid-ride, something none of Ess's
  // higher-level enter/exit helpers do. bFlag's exact effect isn't confirmed by the wiki; default true.
  // ============================================================
  function NativeVehicleTransferToSeat() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addInput("uSeat", "string");
    this.addProperty("uSeat", "Ess.Player.character(0)");
    this.addWidget("text", "uSeat", this.properties.uSeat, function (v) { this.properties.uSeat = v; }.bind(this));
    this.addProperty("bFlag", true);
    this.addWidget("toggle", "bFlag", this.properties.bFlag, function (v) { this.properties.bFlag = v; }.bind(this));
  }
  NativeVehicleTransferToSeat.title = "Vehicle: Transfer To Seat";
  NativeVehicleTransferToSeat.desc = "Vehicle.TransferToSeat(uVehicle, uSeat, bFlag) -- move a rider directly into a seat guid; bFlag's exact effect is unconfirmed";
  NativeVehicleTransferToSeat.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var uSeat = resolveRawInput(this, 2, "uSeat");
    var bFlag = this.properties.bFlag ? "true" : "false";
    CodeGen.emitNative("Vehicle.TransferToSeat(" + uVehicle + ", " + uSeat + ", " + bFlag + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/transfertoseat", NativeVehicleTransferToSeat);

  // ============================================================
  // Native/Vehicle/EnterBySeatGuid -- Vehicle.EnterBySeatGuid(uVehicle, uCharacter, uSeat, bImmediate). The
  // precise-seat-guid sibling of the plain Enter node below -- use with a guid from GetSeatByType. The
  // wiki notes some call sites pass a second trailing boolean flag; its effect is unconfirmed, so it's
  // omitted here. Returns a success boolean, discarded (same treatment nodes-object.js gives
  // Object.spawn's discarded guid).
  // ============================================================
  function NativeVehicleEnterBySeatGuid() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addInput("uCharacter", "string");
    this.addProperty("uCharacter", "Ess.Player.character(0)");
    this.addWidget("text", "uCharacter", this.properties.uCharacter, function (v) { this.properties.uCharacter = v; }.bind(this));
    this.addInput("uSeat", "string");
    this.addProperty("uSeat", "Ess.Player.character(0)");
    this.addWidget("text", "uSeat", this.properties.uSeat, function (v) { this.properties.uSeat = v; }.bind(this));
    this.addProperty("bImmediate", true);
    this.addWidget("toggle", "bImmediate", this.properties.bImmediate, function (v) { this.properties.bImmediate = v; }.bind(this));
  }
  NativeVehicleEnterBySeatGuid.title = "Vehicle: Enter By Seat Guid";
  NativeVehicleEnterBySeatGuid.desc = "Vehicle.EnterBySeatGuid(uVehicle, uCharacter, uSeat, bImmediate) -- return (success) discarded; trailing optional 2nd flag omitted, unconfirmed";
  NativeVehicleEnterBySeatGuid.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var uCharacter = resolveRawInput(this, 2, "uCharacter");
    var uSeat = resolveRawInput(this, 3, "uSeat");
    var bImmediate = this.properties.bImmediate ? "true" : "false";
    CodeGen.emitNative("Vehicle.EnterBySeatGuid(" + uVehicle + ", " + uCharacter + ", " + uSeat + ", " + bImmediate + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/enterbyseatguid", NativeVehicleEnterBySeatGuid);

  // ============================================================
  // Native/Vehicle/Enter -- Vehicle.Enter(uVehicle, uCharacter, sSeatType, bImmediate). Enter a SPECIFIC
  // seat type on demand (e.g. force straight into the gunner seat "g") -- distinct from Ess's
  // enterBestSeat (priority-based) and enterSeatExcluding (avoid a set of types). Trailing optional 2nd
  // boolean flag some call sites pass is omitted, unconfirmed effect.
  // ============================================================
  function NativeVehicleEnter() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addInput("uCharacter", "string");
    this.addProperty("uCharacter", "Ess.Player.character(0)");
    this.addWidget("text", "uCharacter", this.properties.uCharacter, function (v) { this.properties.uCharacter = v; }.bind(this));
    this.addProperty("sSeatType", "g");
    this.addWidget("text", "sSeatType", this.properties.sSeatType, function (v) { this.properties.sSeatType = v; }.bind(this));
    this.addProperty("bImmediate", true);
    this.addWidget("toggle", "bImmediate", this.properties.bImmediate, function (v) { this.properties.bImmediate = v; }.bind(this));
  }
  NativeVehicleEnter.title = "Vehicle: Enter Seat Type";
  NativeVehicleEnter.desc = "Vehicle.Enter(uVehicle, uCharacter, sSeatType, bImmediate) -- \"d\"/\"p\"/\"g\" -- trailing optional 2nd flag omitted, unconfirmed";
  NativeVehicleEnter.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var uCharacter = resolveRawInput(this, 2, "uCharacter");
    var sSeatType = CodeGen.luaString(this.properties.sSeatType);
    var bImmediate = this.properties.bImmediate ? "true" : "false";
    CodeGen.emitNative("Vehicle.Enter(" + uVehicle + ", " + uCharacter + ", " + sSeatType + ", " + bImmediate + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/enter", NativeVehicleEnter);

  // Vehicle.Exit(uVehicle, uCharacter, bFlag?) -- SKIPPED: this is exactly what Ess.Vehicle.exit(uVeh,
  // uChar) already wraps (Vehicle.Exit(uVeh, uChar, true)) -- no native equivalent needed.

  // ============================================================
  // Native/Vehicle/IsSeatALadder -- a PURE DATA node wrapping Vehicle.IsSeatALadder(uSeat) -> bool.
  // ============================================================
  function NativeVehicleIsSeatALadder() {
    this.addProperty("uSeat", "Ess.Player.character(0)");
    this.addWidget("text", "uSeat", this.properties.uSeat, function (v) { this.properties.uSeat = v; }.bind(this));
    this.addOutput("isLadder", "boolean");
  }
  NativeVehicleIsSeatALadder.title = "Vehicle: Is Seat A Ladder";
  NativeVehicleIsSeatALadder.desc = "Vehicle.IsSeatALadder(uSeat) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  NativeVehicleIsSeatALadder.prototype.onExecute = function () {
    this.setOutputData(0, "Vehicle.IsSeatALadder(" + this.properties.uSeat + ")");
  };
  LiteGraph.registerNodeType("native/vehicle/isseataladder", NativeVehicleIsSeatALadder);

  // ============================================================
  // Native/Vehicle/IsSeatBlocked -- a PURE DATA node wrapping Vehicle.IsSeatBlocked(uSeat) -> bool.
  // ============================================================
  function NativeVehicleIsSeatBlocked() {
    this.addProperty("uSeat", "Ess.Player.character(0)");
    this.addWidget("text", "uSeat", this.properties.uSeat, function (v) { this.properties.uSeat = v; }.bind(this));
    this.addOutput("isBlocked", "boolean");
  }
  NativeVehicleIsSeatBlocked.title = "Vehicle: Is Seat Blocked";
  NativeVehicleIsSeatBlocked.desc = "Vehicle.IsSeatBlocked(uSeat) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  NativeVehicleIsSeatBlocked.prototype.onExecute = function () {
    this.setOutputData(0, "Vehicle.IsSeatBlocked(" + this.properties.uSeat + ")");
  };
  LiteGraph.registerNodeType("native/vehicle/isseatblocked", NativeVehicleIsSeatBlocked);

  // ============================================================
  // Native/Vehicle/GetFromRider -- a PURE DATA node wrapping Vehicle.GetFromRider(uCharacter) ->
  // uVehicleGuid | nil.
  // ============================================================
  function NativeVehicleGetFromRider() {
    this.addProperty("uCharacter", "Ess.Player.character(0)");
    this.addWidget("text", "uCharacter", this.properties.uCharacter, function (v) { this.properties.uCharacter = v; }.bind(this));
    this.addOutput("vehicle", "string");
  }
  NativeVehicleGetFromRider.title = "Vehicle: Get From Rider";
  NativeVehicleGetFromRider.desc = "Vehicle.GetFromRider(uCharacter) -- emits Lua source, not a resolved guid (see codegen.js header)";
  NativeVehicleGetFromRider.prototype.onExecute = function () {
    this.setOutputData(0, "Vehicle.GetFromRider(" + this.properties.uCharacter + ")");
  };
  LiteGraph.registerNodeType("native/vehicle/getfromrider", NativeVehicleGetFromRider);

  // ============================================================================================
  // VEHICLE -- Doors & Turrets (entirely new capability -- Ess.Vehicle doesn't touch any of this)
  // ============================================================================================

  // ============================================================
  // Native/Vehicle/OpenDoor -- Vehicle.OpenDoor(uVehicle, sDoorName). "pivot" is the confirmed-in-corpus
  // example; "DriverHatch" has been proposed for tank hatches but isn't independently live-test-confirmed.
  // ============================================================
  function NativeVehicleOpenDoor() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addProperty("sDoorName", "pivot");
    this.addWidget("text", "sDoorName", this.properties.sDoorName, function (v) { this.properties.sDoorName = v; }.bind(this));
  }
  NativeVehicleOpenDoor.title = "Vehicle: Open Door";
  NativeVehicleOpenDoor.desc = "Vehicle.OpenDoor(uVehicle, sDoorName) -- e.g. \"pivot\"; \"DriverHatch\" proposed for tank hatches but unconfirmed by live test";
  NativeVehicleOpenDoor.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var sDoorName = CodeGen.luaString(this.properties.sDoorName);
    CodeGen.emitNative("Vehicle.OpenDoor(" + uVehicle + ", " + sDoorName + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/opendoor", NativeVehicleOpenDoor);

  // ============================================================
  // Native/Vehicle/CloseDoor -- Vehicle.CloseDoor(uVehicle, sDoorName). Mirrors OpenDoor above.
  // ============================================================
  function NativeVehicleCloseDoor() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addProperty("sDoorName", "pivot");
    this.addWidget("text", "sDoorName", this.properties.sDoorName, function (v) { this.properties.sDoorName = v; }.bind(this));
  }
  NativeVehicleCloseDoor.title = "Vehicle: Close Door";
  NativeVehicleCloseDoor.desc = "Vehicle.CloseDoor(uVehicle, sDoorName) -- e.g. \"pivot\", mirrors OpenDoor";
  NativeVehicleCloseDoor.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var sDoorName = CodeGen.luaString(this.properties.sDoorName);
    CodeGen.emitNative("Vehicle.CloseDoor(" + uVehicle + ", " + sDoorName + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/closedoor", NativeVehicleCloseDoor);

  // ============================================================
  // Native/Vehicle/EnableTurret -- Vehicle.EnableTurret(uVehicle, sTurretName, bEnable). CONFIRMED
  // control/orientation-only -- every real call site is disabling/re-enabling the turret's own control
  // during a hijack cinematic, none of them touch what the turret fires (see file header). Optional
  // trailing sAxis/bAxisFlag args some call sites pass ("all", false) are omitted here for a clean 3-arg
  // core form; the plain enable/disable case doesn't need them.
  // ============================================================
  function NativeVehicleEnableTurret() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addProperty("sTurretName", "head");
    this.addWidget("text", "sTurretName", this.properties.sTurretName, function (v) { this.properties.sTurretName = v; }.bind(this));
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
  }
  NativeVehicleEnableTurret.title = "Vehicle: Enable Turret";
  NativeVehicleEnableTurret.desc = "Vehicle.EnableTurret(uVehicle, sTurretName, bEnable) -- orientation/control only, does NOT select what fires (see file header)";
  NativeVehicleEnableTurret.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var sTurretName = CodeGen.luaString(this.properties.sTurretName);
    var bEnable = this.properties.bEnable ? "true" : "false";
    CodeGen.emitNative("Vehicle.EnableTurret(" + uVehicle + ", " + sTurretName + ", " + bEnable + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/enableturret", NativeVehicleEnableTurret);

  // ============================================================
  // Native/Vehicle/SetTurretPitch -- Vehicle.SetTurretPitch(uVehicle, sTurretName, nValue). Orientation
  // only, same caveat as EnableTurret above -- observed usage resets pitch to level (0) right after
  // disabling turret control.
  // ============================================================
  function NativeVehicleSetTurretPitch() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addProperty("sTurretName", "head");
    this.addWidget("text", "sTurretName", this.properties.sTurretName, function (v) { this.properties.sTurretName = v; }.bind(this));
    this.addInput("nValue", "number");
    this.addProperty("nValue", 0);
    this.addWidget("number", "nValue", this.properties.nValue, function (v) { this.properties.nValue = v; }.bind(this));
  }
  NativeVehicleSetTurretPitch.title = "Vehicle: Set Turret Pitch";
  NativeVehicleSetTurretPitch.desc = "Vehicle.SetTurretPitch(uVehicle, sTurretName, nValue) -- orientation only, see file header's turret caveat";
  NativeVehicleSetTurretPitch.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var sTurretName = CodeGen.luaString(this.properties.sTurretName);
    var nValue = CodeGen.resolveNumberInput(this, 2, "nValue");
    CodeGen.emitNative("Vehicle.SetTurretPitch(" + uVehicle + ", " + sTurretName + ", " + nValue + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/setturretpitch", NativeVehicleSetTurretPitch);

  // ============================================================
  // Native/Vehicle/SetTurretYaw -- Vehicle.SetTurretYaw(uVehicle, nAngle). Live-confirmed via WebSocket
  // lua-bridge probe (2026-07-22) as an EFFECT (write, no return value). Unlike SetTurretPitch, the
  // confirmed signature has no turret-name argument. Presumed orientation-only by naming symmetry with
  // SetTurretPitch/EnableTurret, though that specific point wasn't independently re-verified by the probe.
  // ============================================================
  function NativeVehicleSetTurretYaw() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addInput("nAngle", "number");
    this.addProperty("nAngle", 0);
    this.addWidget("number", "nAngle", this.properties.nAngle, function (v) { this.properties.nAngle = v; }.bind(this));
  }
  NativeVehicleSetTurretYaw.title = "Vehicle: Set Turret Yaw";
  NativeVehicleSetTurretYaw.desc = "Vehicle.SetTurretYaw(uVehicle, nAngle) -- live-confirmed EFFECT, no call sites in the decompiled corpus";
  NativeVehicleSetTurretYaw.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var nAngle = CodeGen.resolveNumberInput(this, 2, "nAngle");
    CodeGen.emitNative("Vehicle.SetTurretYaw(" + uVehicle + ", " + nAngle + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/setturretyaw", NativeVehicleSetTurretYaw);

  // ============================================================
  // Native/Vehicle/SetParts -- Vehicle.SetParts(uVehicle, sPartName, bState). Also used on non-vehicle
  // gate/alarm objects in the decompiled source per the wiki, so this works more broadly than just
  // player-driven vehicles. Returns a boolean, discarded (same treatment as every other action node here
  // that ignores an incidental return value).
  // ============================================================
  function NativeVehicleSetParts() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addProperty("sPartName", "LightFront");
    this.addWidget("text", "sPartName", this.properties.sPartName, function (v) { this.properties.sPartName = v; }.bind(this));
    this.addProperty("bState", true);
    this.addWidget("toggle", "bState", this.properties.bState, function (v) { this.properties.bState = v; }.bind(this));
  }
  NativeVehicleSetParts.title = "Vehicle: Set Parts";
  NativeVehicleSetParts.desc = "Vehicle.SetParts(uVehicle, sPartName, bState) -- e.g. \"LightFront\"/\"CtrlRotation\"; return (bool) discarded";
  NativeVehicleSetParts.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var sPartName = CodeGen.luaString(this.properties.sPartName);
    var bState = this.properties.bState ? "true" : "false";
    CodeGen.emitNative("Vehicle.SetParts(" + uVehicle + ", " + sPartName + ", " + bState + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/setparts", NativeVehicleSetParts);

  // ============================================================
  // Native/Vehicle/SetCanPlayerUse -- Vehicle.SetCanPlayerUse(uVehicle, sSeatType, bCanUse).
  // ============================================================
  function NativeVehicleSetCanPlayerUse() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addProperty("sSeatType", "d");
    this.addWidget("text", "sSeatType", this.properties.sSeatType, function (v) { this.properties.sSeatType = v; }.bind(this));
    this.addProperty("bCanUse", true);
    this.addWidget("toggle", "bCanUse", this.properties.bCanUse, function (v) { this.properties.bCanUse = v; }.bind(this));
  }
  NativeVehicleSetCanPlayerUse.title = "Vehicle: Set Can Player Use";
  NativeVehicleSetCanPlayerUse.desc = "Vehicle.SetCanPlayerUse(uVehicle, sSeatType, bCanUse) -- \"d\"/\"a\"";
  NativeVehicleSetCanPlayerUse.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var sSeatType = CodeGen.luaString(this.properties.sSeatType);
    var bCanUse = this.properties.bCanUse ? "true" : "false";
    CodeGen.emitNative("Vehicle.SetCanPlayerUse(" + uVehicle + ", " + sSeatType + ", " + bCanUse + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/setcanplayeruse", NativeVehicleSetCanPlayerUse);

  // ============================================================
  // Native/Vehicle/Usable -- Vehicle.Usable(uVehicle, bUsable). Toggles whether the vehicle can be
  // entered/used at all.
  // ============================================================
  function NativeVehicleUsable() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addProperty("bUsable", true);
    this.addWidget("toggle", "bUsable", this.properties.bUsable, function (v) { this.properties.bUsable = v; }.bind(this));
  }
  NativeVehicleUsable.title = "Vehicle: Usable";
  NativeVehicleUsable.desc = "Vehicle.Usable(uVehicle, bUsable) -- toggles whether the vehicle can be entered/used";
  NativeVehicleUsable.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    var bUsable = this.properties.bUsable ? "true" : "false";
    CodeGen.emitNative("Vehicle.Usable(" + uVehicle + ", " + bUsable + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/usable", NativeVehicleUsable);

  // ============================================================================================
  // VEHICLE -- Hijacking (entirely new capability -- Ess.Vehicle doesn't touch any of this)
  // ============================================================================================

  // ============================================================
  // Native/Vehicle/HijackStart -- Vehicle.HijackStart(uHijacker, uHijackee, uVehicle). The one observed
  // call site also passes a 4th argument, a table/object reference (the calling mission script's own
  // "self") -- omitted here since there's no clean way to splice an arbitrary Lua table from this editor,
  // and the function's behavior without it isn't independently confirmed.
  // ============================================================
  function NativeVehicleHijackStart() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uHijacker", "string");
    this.addProperty("uHijacker", "Ess.Player.character(0)");
    this.addWidget("text", "uHijacker", this.properties.uHijacker, function (v) { this.properties.uHijacker = v; }.bind(this));
    this.addInput("uHijackee", "string");
    this.addProperty("uHijackee", "Ess.Player.character(0)");
    this.addWidget("text", "uHijackee", this.properties.uHijackee, function (v) { this.properties.uHijackee = v; }.bind(this));
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
  }
  NativeVehicleHijackStart.title = "Vehicle: Hijack Start";
  NativeVehicleHijackStart.desc = "Vehicle.HijackStart(uHijacker, uHijackee, uVehicle) -- optional 4th \"self\" table arg from the one real call site is omitted, see comment above";
  NativeVehicleHijackStart.prototype.onAction = function () {
    var uHijacker = resolveRawInput(this, 1, "uHijacker");  // input 0 is "exec"
    var uHijackee = resolveRawInput(this, 2, "uHijackee");
    var uVehicle = resolveRawInput(this, 3, "uVehicle");
    CodeGen.emitNative("Vehicle.HijackStart(" + uHijacker + ", " + uHijackee + ", " + uVehicle + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/hijackstart", NativeVehicleHijackStart);

  // ============================================================
  // Native/Vehicle/HijackAbort -- Vehicle.HijackAbort(uHijacker).
  // ============================================================
  function NativeVehicleHijackAbort() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uHijacker", "string");
    this.addProperty("uHijacker", "Ess.Player.character(0)");
    this.addWidget("text", "uHijacker", this.properties.uHijacker, function (v) { this.properties.uHijacker = v; }.bind(this));
  }
  NativeVehicleHijackAbort.title = "Vehicle: Hijack Abort";
  NativeVehicleHijackAbort.desc = "Vehicle.HijackAbort(uHijacker)";
  NativeVehicleHijackAbort.prototype.onAction = function () {
    var uHijacker = resolveRawInput(this, 1, "uHijacker");  // input 0 is "exec"
    CodeGen.emitNative("Vehicle.HijackAbort(" + uHijacker + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/hijackabort", NativeVehicleHijackAbort);

  // ============================================================
  // Native/Vehicle/HijackAbortDone -- Vehicle.HijackAbortDone(uHijacker).
  // ============================================================
  function NativeVehicleHijackAbortDone() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uHijacker", "string");
    this.addProperty("uHijacker", "Ess.Player.character(0)");
    this.addWidget("text", "uHijacker", this.properties.uHijacker, function (v) { this.properties.uHijacker = v; }.bind(this));
  }
  NativeVehicleHijackAbortDone.title = "Vehicle: Hijack Abort Done";
  NativeVehicleHijackAbortDone.desc = "Vehicle.HijackAbortDone(uHijacker)";
  NativeVehicleHijackAbortDone.prototype.onAction = function () {
    var uHijacker = resolveRawInput(this, 1, "uHijacker");  // input 0 is "exec"
    CodeGen.emitNative("Vehicle.HijackAbortDone(" + uHijacker + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/hijackabortdone", NativeVehicleHijackAbortDone);

  // ============================================================
  // Native/Vehicle/HijackComplete -- Vehicle.HijackComplete(uHijacker).
  // ============================================================
  function NativeVehicleHijackComplete() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uHijacker", "string");
    this.addProperty("uHijacker", "Ess.Player.character(0)");
    this.addWidget("text", "uHijacker", this.properties.uHijacker, function (v) { this.properties.uHijacker = v; }.bind(this));
  }
  NativeVehicleHijackComplete.title = "Vehicle: Hijack Complete";
  NativeVehicleHijackComplete.desc = "Vehicle.HijackComplete(uHijacker)";
  NativeVehicleHijackComplete.prototype.onAction = function () {
    var uHijacker = resolveRawInput(this, 1, "uHijacker");  // input 0 is "exec"
    CodeGen.emitNative("Vehicle.HijackComplete(" + uHijacker + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/hijackcomplete", NativeVehicleHijackComplete);

  // ============================================================
  // Native/Vehicle/SetHijackState -- Vehicle.SetHijackState(uHijacker, nState). What each numeric state
  // value means is not documented anywhere in the corpus -- treat this as an experimental control, not a
  // known enum.
  // ============================================================
  function NativeVehicleSetHijackState() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uHijacker", "string");
    this.addProperty("uHijacker", "Ess.Player.character(0)");
    this.addWidget("text", "uHijacker", this.properties.uHijacker, function (v) { this.properties.uHijacker = v; }.bind(this));
    this.addInput("nState", "number");
    this.addProperty("nState", 0);
    this.addWidget("number", "nState", this.properties.nState, function (v) { this.properties.nState = v; }.bind(this));
  }
  NativeVehicleSetHijackState.title = "Vehicle: Set Hijack State";
  NativeVehicleSetHijackState.desc = "Vehicle.SetHijackState(uHijacker, nState) -- numeric state meaning not documented in the corpus, experimental";
  NativeVehicleSetHijackState.prototype.onAction = function () {
    var uHijacker = resolveRawInput(this, 1, "uHijacker");  // input 0 is "exec"
    var nState = CodeGen.resolveNumberInput(this, 2, "nState");
    CodeGen.emitNative("Vehicle.SetHijackState(" + uHijacker + ", " + nState + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/sethijackstate", NativeVehicleSetHijackState);

  // ============================================================
  // Native/Vehicle/SetHijackSuccess -- Vehicle.SetHijackSuccess(uHijacker, bSuccess). Observed call site
  // passes false.
  // ============================================================
  function NativeVehicleSetHijackSuccess() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uHijacker", "string");
    this.addProperty("uHijacker", "Ess.Player.character(0)");
    this.addWidget("text", "uHijacker", this.properties.uHijacker, function (v) { this.properties.uHijacker = v; }.bind(this));
    this.addProperty("bSuccess", false);
    this.addWidget("toggle", "bSuccess", this.properties.bSuccess, function (v) { this.properties.bSuccess = v; }.bind(this));
  }
  NativeVehicleSetHijackSuccess.title = "Vehicle: Set Hijack Success";
  NativeVehicleSetHijackSuccess.desc = "Vehicle.SetHijackSuccess(uHijacker, bSuccess)";
  NativeVehicleSetHijackSuccess.prototype.onAction = function () {
    var uHijacker = resolveRawInput(this, 1, "uHijacker");  // input 0 is "exec"
    var bSuccess = this.properties.bSuccess ? "true" : "false";
    CodeGen.emitNative("Vehicle.SetHijackSuccess(" + uHijacker + ", " + bSuccess + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/sethijacksuccess", NativeVehicleSetHijackSuccess);

  // ============================================================
  // Native/Vehicle/IsHijackRemote -- a PURE DATA node wrapping Vehicle.IsHijackRemote(uHijacker) -> bool.
  // One real call site guards the call itself with "Vehicle.IsHijackRemote and ...", implying the
  // function's presence was historically uncertain in some game builds -- it's confirmed present today via
  // the live pairs(Vehicle) dump.
  // ============================================================
  function NativeVehicleIsHijackRemote() {
    this.addProperty("uHijacker", "Ess.Player.character(0)");
    this.addWidget("text", "uHijacker", this.properties.uHijacker, function (v) { this.properties.uHijacker = v; }.bind(this));
    this.addOutput("isRemote", "boolean");
  }
  NativeVehicleIsHijackRemote.title = "Vehicle: Is Hijack Remote";
  NativeVehicleIsHijackRemote.desc = "Vehicle.IsHijackRemote(uHijacker) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  NativeVehicleIsHijackRemote.prototype.onExecute = function () {
    this.setOutputData(0, "Vehicle.IsHijackRemote(" + this.properties.uHijacker + ")");
  };
  LiteGraph.registerNodeType("native/vehicle/ishijackremote", NativeVehicleIsHijackRemote);

  // ============================================================
  // Native/Vehicle/IsHijackBad -- a PURE DATA node wrapping Vehicle.IsHijackBad(uGuid) -> bool.
  // Live-confirmed via WebSocket lua-bridge probe (2026-07-22). The probe didn't disambiguate which guid
  // this expects (hijacker character vs. vehicle) -- naming symmetry with the adjacent uHijacker-taking
  // hijack functions makes hijacker guid the likelier reading, but that's inference, not confirmed.
  // ============================================================
  function NativeVehicleIsHijackBad() {
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addOutput("isBad", "boolean");
  }
  NativeVehicleIsHijackBad.title = "Vehicle: Is Hijack Bad";
  NativeVehicleIsHijackBad.desc = "Vehicle.IsHijackBad(uGuid) -- live-confirmed return type; which guid kind (hijacker vs vehicle) is inferred, not confirmed";
  NativeVehicleIsHijackBad.prototype.onExecute = function () {
    this.setOutputData(0, "Vehicle.IsHijackBad(" + this.properties.uGuid + ")");
  };
  LiteGraph.registerNodeType("native/vehicle/ishijackbad", NativeVehicleIsHijackBad);

  // ============================================================
  // Native/Vehicle/CancelHijack -- Vehicle.CancelHijack(uCharacter). Called on player logout/cleanup in
  // the observed call site.
  // ============================================================
  function NativeVehicleCancelHijack() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uCharacter", "string");
    this.addProperty("uCharacter", "Ess.Player.character(0)");
    this.addWidget("text", "uCharacter", this.properties.uCharacter, function (v) { this.properties.uCharacter = v; }.bind(this));
  }
  NativeVehicleCancelHijack.title = "Vehicle: Cancel Hijack";
  NativeVehicleCancelHijack.desc = "Vehicle.CancelHijack(uCharacter)";
  NativeVehicleCancelHijack.prototype.onAction = function () {
    var uCharacter = resolveRawInput(this, 1, "uCharacter");  // input 0 is "exec"
    CodeGen.emitNative("Vehicle.CancelHijack(" + uCharacter + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/cancelhijack", NativeVehicleCancelHijack);

  // Vehicle.StartTankHijackMotion -- SKIPPED: zero call sites and zero live-probe data -- the wiki's own
  // Signature column is a bare "--", meaning nothing at all is known about its arguments beyond the name.
  // Confirmed to exist (live pairs(Vehicle) dump) but there's no evidence-based shape to build a node from.

  // ============================================================
  // Native/Vehicle/StopTankHijackMotion -- Vehicle.StopTankHijackMotion(uVehicle). Used with a plain
  // vehicle guid in real scripts.
  // ============================================================
  function NativeVehicleStopTankHijackMotion() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
  }
  NativeVehicleStopTankHijackMotion.title = "Vehicle: Stop Tank Hijack Motion";
  NativeVehicleStopTankHijackMotion.desc = "Vehicle.StopTankHijackMotion(uVehicle)";
  NativeVehicleStopTankHijackMotion.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    CodeGen.emitNative("Vehicle.StopTankHijackMotion(" + uVehicle + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/stoptankhijackmotion", NativeVehicleStopTankHijackMotion);

  // ============================================================================================
  // VEHICLE -- Vehicle State & Physics
  // ============================================================================================

  // ============================================================
  // Native/Vehicle/IsFlying -- a PURE DATA node wrapping Vehicle.IsFlying(uVehicle) -> bool. Checked before
  // flight-specific hijack logic in the one observed call site. Distinct from Ess.Vehicle.isFlipped (flip
  // state, not flight state) -- not covered by that skip-listed node.
  // ============================================================
  function NativeVehicleIsFlying() {
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
    this.addOutput("isFlying", "boolean");
  }
  NativeVehicleIsFlying.title = "Vehicle: Is Flying";
  NativeVehicleIsFlying.desc = "Vehicle.IsFlying(uVehicle) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  NativeVehicleIsFlying.prototype.onExecute = function () {
    this.setOutputData(0, "Vehicle.IsFlying(" + this.properties.uVehicle + ")");
  };
  LiteGraph.registerNodeType("native/vehicle/isflying", NativeVehicleIsFlying);

  // Vehicle.IsFlipped(uVehicle) -- SKIPPED: this is exactly what Ess.Vehicle.isFlipped(uVeh) already wraps
  // (nodes-human-vehicle.js) -- no native equivalent needed.

  // Vehicle.SpinHeli -- SKIPPED: zero call sites and zero live-probe data, same "bare -- Signature column"
  // reasoning as StartTankHijackMotion above -- nothing evidence-based to build a node from.

  // ============================================================
  // Native/Vehicle/RestoreAmmo -- Vehicle.RestoreAmmo(uVehicle). Live-confirmed via WebSocket lua-bridge
  // probe (2026-07-22) as an EFFECT. Ess.Vehicle.repair(uVeh) already calls this together with
  // RestoreHealth for a combined full heal+rearm, but repair() is all-or-nothing -- this node lets a mod
  // rearm a vehicle WITHOUT also healing it, which Ess doesn't offer on its own.
  // ============================================================
  function NativeVehicleRestoreAmmo() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
  }
  NativeVehicleRestoreAmmo.title = "Vehicle: Restore Ammo";
  NativeVehicleRestoreAmmo.desc = "Vehicle.RestoreAmmo(uVehicle) -- ammo-only restore; see comment above for how this differs from Ess.Vehicle.repair";
  NativeVehicleRestoreAmmo.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    CodeGen.emitNative("Vehicle.RestoreAmmo(" + uVehicle + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/restoreammo", NativeVehicleRestoreAmmo);

  // ============================================================
  // Native/Vehicle/RestoreHealth -- Vehicle.RestoreHealth(uVehicle). Live-confirmed via WebSocket
  // lua-bridge probe (2026-07-22) as an EFFECT (observed 98.9 -> 100 health in the probe). Same
  // health-only-vs-repair() relationship as RestoreAmmo above, just the other half of the pair.
  // ============================================================
  function NativeVehicleRestoreHealth() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
  }
  NativeVehicleRestoreHealth.title = "Vehicle: Restore Health";
  NativeVehicleRestoreHealth.desc = "Vehicle.RestoreHealth(uVehicle) -- health-only restore; see comment above for how this differs from Ess.Vehicle.repair";
  NativeVehicleRestoreHealth.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    CodeGen.emitNative("Vehicle.RestoreHealth(" + uVehicle + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/restorehealth", NativeVehicleRestoreHealth);

  // ============================================================
  // Native/Vehicle/ClearControls -- Vehicle.ClearControls(uVehicle). Called alongside turret-disable logic
  // during hijack setup in the observed call site.
  // ============================================================
  function NativeVehicleClearControls() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uVehicle", "string");
    this.addProperty("uVehicle", "Ess.Player.character(0)");
    this.addWidget("text", "uVehicle", this.properties.uVehicle, function (v) { this.properties.uVehicle = v; }.bind(this));
  }
  NativeVehicleClearControls.title = "Vehicle: Clear Controls";
  NativeVehicleClearControls.desc = "Vehicle.ClearControls(uVehicle)";
  NativeVehicleClearControls.prototype.onAction = function () {
    var uVehicle = resolveRawInput(this, 1, "uVehicle");  // input 0 is "exec"
    CodeGen.emitNative("Vehicle.ClearControls(" + uVehicle + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/vehicle/clearcontrols", NativeVehicleClearControls);

  // ============================================================================================
  // HUMAN -- Weapons & Inventory
  // ============================================================================================

  // Human.EquipWeapon(uGuid, ...) -- SKIPPED: the top-level form's own signature is a bare variadic "...",
  // zero call sites found anywhere under this form, and the wiki's own Notes for modders section confirms
  // only the nested Human.Inventory.EquipWeapon form is actually used in real scripts (which is already
  // covered by Ess.Human.equipWeapon -- skipped separately below).

  // Human.Inventory.EquipWeapon(uGuid, uWeaponGuid) -- SKIPPED: this is exactly what
  // Ess.Human.equipWeapon(uChar, uWeapon) already wraps (nodes-human-vehicle.js) -- no native equivalent
  // needed.

  // Human.Inventory.DropWeapon(uCharGuid, uWeaponGuid) -- SKIPPED: this is exactly what
  // Ess.Human.dropWeapon(uChar, uWeapon) already wraps -- no native equivalent needed.

  // ============================================================
  // Native/Human/SetAllWeapons -- Human.Inventory.SetAllWeapons(uCharGuid, tWeaponGuids). tWeaponGuids is a
  // Lua table-literal of weapon guids (some call sites pass a single guid in its place instead of a table
  // -- the full accepted shapes aren't fully pinned down per the wiki), modeled as raw Lua-source TEXT
  // spliced in unquoted, same convention nodes-human-vehicle.js's enterSeatExcluding uses for its
  // excludeSeats table literal.
  // ============================================================
  function NativeHumanSetAllWeapons() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uCharGuid", "string");
    this.addProperty("uCharGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uCharGuid", this.properties.uCharGuid, function (v) { this.properties.uCharGuid = v; }.bind(this));
    this.addInput("tWeaponGuids", "string");
    this.addProperty("tWeaponGuids", "{ }");
    this.addWidget("text", "tWeaponGuids", this.properties.tWeaponGuids, function (v) { this.properties.tWeaponGuids = v; }.bind(this));
  }
  NativeHumanSetAllWeapons.title = "Human: Set All Weapons";
  NativeHumanSetAllWeapons.desc = "Human.Inventory.SetAllWeapons(uCharGuid, tWeaponGuids) -- tWeaponGuids is a Lua table literal of weapon guids, e.g. \"{ uPrimary, uGrenade }\"";
  NativeHumanSetAllWeapons.prototype.onAction = function () {
    var uCharGuid = resolveRawInput(this, 1, "uCharGuid");  // input 0 is "exec"
    var tWeaponGuids = resolveRawInput(this, 2, "tWeaponGuids");
    CodeGen.emitNative("Human.Inventory.SetAllWeapons(" + uCharGuid + ", " + tWeaponGuids + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/setallweapons", NativeHumanSetAllWeapons);

  // Human.Inventory.GetAllWeapons(uCharGuid [, bFlag]) -- SKIPPED: returns a TABLE of weapon guids, not a
  // single value -- this is the exact native call nodes-human-vehicle.js already gives its own skip
  // comment for (Ess.Human.allWeapons wraps this same function and is skipped there for the same reason).

  // Human.Inventory.GetPrimaryWeapon(uCharGuid) -- SKIPPED: this is exactly what
  // Ess.Human.primaryWeapon(uChar) already wraps -- no native equivalent needed.

  // Human.Inventory.GetSecondaryWeapon(uCharGuid) -- SKIPPED: this is exactly what
  // Ess.Human.secondaryWeapon(uChar) already wraps -- no native equivalent needed.

  // Human.Inventory.ReloadAll(uCharGuid, bFlag) -- SKIPPED: this is exactly what
  // Ess.Human.reloadAll(uChar) already wraps (Human.Inventory.ReloadAll(uChar, false)) -- no native
  // equivalent needed.

  // Human.Inventory.GetVehicleWeapon(uGuid, ...) -- SKIPPED: variadic "..." signature, zero call sites,
  // nothing evidence-based to build a node from.

  // ============================================================
  // Native/Human/DestroyAllWeapons -- Human.Inventory.DestroyAllWeapons(uGuid). No call sites found in the
  // decompiled corpus, but the signature is a single clearly-named guid argument -- low-risk enough to
  // include per this file's inclusion bar. Strips a character of every weapon at once; Ess only offers
  // dropping/disabling weapons individually or as a whole state toggle, not outright destruction.
  // ============================================================
  function NativeHumanDestroyAllWeapons() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
  }
  NativeHumanDestroyAllWeapons.title = "Human: Destroy All Weapons";
  NativeHumanDestroyAllWeapons.desc = "Human.Inventory.DestroyAllWeapons(uGuid) -- no call sites in the decompiled corpus, unconfirmed but low-risk single-guid signature";
  NativeHumanDestroyAllWeapons.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    CodeGen.emitNative("Human.Inventory.DestroyAllWeapons(" + uGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/destroyallweapons", NativeHumanDestroyAllWeapons);

  // ============================================================================================
  // HUMAN -- Actions & Animation (Ess.Human only wraps DoAction -- everything else here is new)
  // ============================================================================================

  // Human.DoAction(uGuid, sActionName) -- SKIPPED: this is exactly what Ess.Human.doAction(uChar,
  // sActionName) already wraps -- no native equivalent needed.

  // ============================================================
  // Native/Human/PlayRawAnimation -- Human.PlayRawAnimation(uGuid, sAnimName, bLoop, bFlag2, nBlendTime,
  // bFlag4). Confirmed with 6-7 positional arguments in real scripts; the exact meaning of bFlag2/bFlag4
  // beyond the animation name and loop flag is not confirmed, and an optional trailing 7th bFlag5 some
  // call sites pass is omitted here. Returns a success boolean, discarded (same treatment as every other
  // action node in this file that ignores an incidental return value).
  // ============================================================
  function NativeHumanPlayRawAnimation() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addProperty("sAnimName", "player_mattias_bare_technoviking");
    this.addWidget("text", "sAnimName", this.properties.sAnimName, function (v) { this.properties.sAnimName = v; }.bind(this));
    this.addProperty("bLoop", false);
    this.addWidget("toggle", "bLoop", this.properties.bLoop, function (v) { this.properties.bLoop = v; }.bind(this));
    this.addProperty("bFlag2", false);
    this.addWidget("toggle", "bFlag2", this.properties.bFlag2, function (v) { this.properties.bFlag2 = v; }.bind(this));
    this.addInput("nBlendTime", "number");
    this.addProperty("nBlendTime", 0);
    this.addWidget("number", "nBlendTime", this.properties.nBlendTime, function (v) { this.properties.nBlendTime = v; }.bind(this));
    this.addProperty("bFlag4", false);
    this.addWidget("toggle", "bFlag4", this.properties.bFlag4, function (v) { this.properties.bFlag4 = v; }.bind(this));
  }
  NativeHumanPlayRawAnimation.title = "Human: Play Raw Animation";
  NativeHumanPlayRawAnimation.desc = "Human.PlayRawAnimation(uGuid, sAnimName, bLoop, bFlag2, nBlendTime, bFlag4) -- bFlag2/bFlag4/nBlendTime meaning beyond loop is unconfirmed; return (success) discarded";
  NativeHumanPlayRawAnimation.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    var sAnimName = CodeGen.luaString(this.properties.sAnimName);
    var bLoop = this.properties.bLoop ? "true" : "false";
    var bFlag2 = this.properties.bFlag2 ? "true" : "false";
    var nBlendTime = CodeGen.resolveNumberInput(this, 2, "nBlendTime");
    var bFlag4 = this.properties.bFlag4 ? "true" : "false";
    CodeGen.emitNative("Human.PlayRawAnimation(" + uGuid + ", " + sAnimName + ", " + bLoop + ", " + bFlag2 + ", " + nBlendTime + ", " + bFlag4 + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/playrawanimation", NativeHumanPlayRawAnimation);

  // ============================================================
  // Native/Human/SetState -- Human.SetState(uGuid, sStateName, sAnimOrValue). Very common in real scripts.
  // Observed state names include "InVehicle" (paired with an animation name), "Upright" (paired with
  // "Idle"), and "Subdued" (paired with "Idle").
  // ============================================================
  function NativeHumanSetState() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addProperty("sStateName", "Upright");
    this.addWidget("text", "sStateName", this.properties.sStateName, function (v) { this.properties.sStateName = v; }.bind(this));
    this.addProperty("sAnimOrValue", "Idle");
    this.addWidget("text", "sAnimOrValue", this.properties.sAnimOrValue, function (v) { this.properties.sAnimOrValue = v; }.bind(this));
  }
  NativeHumanSetState.title = "Human: Set State";
  NativeHumanSetState.desc = "Human.SetState(uGuid, sStateName, sAnimOrValue) -- e.g. \"Upright\"/\"Idle\", \"Subdued\"/\"Idle\", \"InVehicle\"/<anim>";
  NativeHumanSetState.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    var sStateName = CodeGen.luaString(this.properties.sStateName);
    var sAnimOrValue = CodeGen.luaString(this.properties.sAnimOrValue);
    CodeGen.emitNative("Human.SetState(" + uGuid + ", " + sStateName + ", " + sAnimOrValue + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/setstate", NativeHumanSetState);

  // ============================================================
  // Native/Human/SetJostleEnabled -- Human.SetJostleEnabled(uGuid, bOn).
  // ============================================================
  function NativeHumanSetJostleEnabled() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addProperty("bOn", true);
    this.addWidget("toggle", "bOn", this.properties.bOn, function (v) { this.properties.bOn = v; }.bind(this));
  }
  NativeHumanSetJostleEnabled.title = "Human: Set Jostle Enabled";
  NativeHumanSetJostleEnabled.desc = "Human.SetJostleEnabled(uGuid, bOn)";
  NativeHumanSetJostleEnabled.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    var bOn = this.properties.bOn ? "true" : "false";
    CodeGen.emitNative("Human.SetJostleEnabled(" + uGuid + ", " + bOn + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/setjostleenabled", NativeHumanSetJostleEnabled);

  // Human.Emote(uGuid, ...) -- SKIPPED: variadic "..." signature, zero call sites, nothing evidence-based
  // to build a node from.

  // ============================================================================================
  // HUMAN -- State Queries
  // ============================================================================================

  // ============================================================
  // Native/Human/IsSwimming -- a PURE DATA node wrapping Human.IsSwimming(uGuid) -> bool.
  // ============================================================
  function NativeHumanIsSwimming() {
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addOutput("isSwimming", "boolean");
  }
  NativeHumanIsSwimming.title = "Human: Is Swimming";
  NativeHumanIsSwimming.desc = "Human.IsSwimming(uGuid) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  NativeHumanIsSwimming.prototype.onExecute = function () {
    this.setOutputData(0, "Human.IsSwimming(" + this.properties.uGuid + ")");
  };
  LiteGraph.registerNodeType("native/human/isswimming", NativeHumanIsSwimming);

  // ============================================================
  // Native/Human/IsCarrying -- a PURE DATA node wrapping Human.IsCarrying(uGuid) -> bool. Always checked
  // immediately before a paired Human.Drop call at every real call site (see Drop below).
  // ============================================================
  function NativeHumanIsCarrying() {
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addOutput("isCarrying", "boolean");
  }
  NativeHumanIsCarrying.title = "Human: Is Carrying";
  NativeHumanIsCarrying.desc = "Human.IsCarrying(uGuid) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  NativeHumanIsCarrying.prototype.onExecute = function () {
    this.setOutputData(0, "Human.IsCarrying(" + this.properties.uGuid + ")");
  };
  LiteGraph.registerNodeType("native/human/iscarrying", NativeHumanIsCarrying);

  // ============================================================
  // Native/Human/IsGrappling -- a PURE DATA node wrapping Human.IsGrappling(uGuid) -> bool. Always checked
  // immediately before a paired Human.StopGrappling call at every real call site (see StopGrappling below).
  // ============================================================
  function NativeHumanIsGrappling() {
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addOutput("isGrappling", "boolean");
  }
  NativeHumanIsGrappling.title = "Human: Is Grappling";
  NativeHumanIsGrappling.desc = "Human.IsGrappling(uGuid) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  NativeHumanIsGrappling.prototype.onExecute = function () {
    this.setOutputData(0, "Human.IsGrappling(" + this.properties.uGuid + ")");
  };
  LiteGraph.registerNodeType("native/human/isgrappling", NativeHumanIsGrappling);

  // ============================================================================================
  // HUMAN -- Misc
  // ============================================================================================

  // ============================================================
  // Native/Human/Drop -- Human.Drop(uGuid, bFlag). Always called right after Human.IsCarrying returns true
  // at every real call site, dropping whatever the character is carrying.
  // ============================================================
  function NativeHumanDrop() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addProperty("bFlag", true);
    this.addWidget("toggle", "bFlag", this.properties.bFlag, function (v) { this.properties.bFlag = v; }.bind(this));
  }
  NativeHumanDrop.title = "Human: Drop";
  NativeHumanDrop.desc = "Human.Drop(uGuid, bFlag) -- drops whatever the character is currently carrying";
  NativeHumanDrop.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    var bFlag = this.properties.bFlag ? "true" : "false";
    CodeGen.emitNative("Human.Drop(" + uGuid + ", " + bFlag + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/drop", NativeHumanDrop);

  // ============================================================
  // Native/Human/StopGrappling -- Human.StopGrappling(uGuid). Always called right after Human.IsGrappling
  // returns true at every real call site.
  // ============================================================
  function NativeHumanStopGrappling() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
  }
  NativeHumanStopGrappling.title = "Human: Stop Grappling";
  NativeHumanStopGrappling.desc = "Human.StopGrappling(uGuid)";
  NativeHumanStopGrappling.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    CodeGen.emitNative("Human.StopGrappling(" + uGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/stopgrappling", NativeHumanStopGrappling);

  // Human.Knockdown(uGuid, nDuration) -- SKIPPED: this is exactly what Ess.Human.knockdown(uChar,
  // nDuration) already wraps -- no native equivalent needed.

  // ============================================================
  // Native/Human/SetPreemptiveRagdoll -- Human.SetPreemptiveRagdoll(uGuid). Always used in hijack setup/
  // failure paths alongside Knockdown and ForceExitSeatNoSnap in the observed call sites.
  // ============================================================
  function NativeHumanSetPreemptiveRagdoll() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
  }
  NativeHumanSetPreemptiveRagdoll.title = "Human: Set Preemptive Ragdoll";
  NativeHumanSetPreemptiveRagdoll.desc = "Human.SetPreemptiveRagdoll(uGuid)";
  NativeHumanSetPreemptiveRagdoll.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    CodeGen.emitNative("Human.SetPreemptiveRagdoll(" + uGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/setpreemptiveragdoll", NativeHumanSetPreemptiveRagdoll);

  // ============================================================
  // Native/Human/ForceExitSeatNoSnap -- Human.ForceExitSeatNoSnap(uGuid). Forces a character out of a
  // vehicle seat without the normal snap-to-ground/exit animation -- distinct from Ess.Vehicle.exit, which
  // always plays the normal exit.
  // ============================================================
  function NativeHumanForceExitSeatNoSnap() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
  }
  NativeHumanForceExitSeatNoSnap.title = "Human: Force Exit Seat (No Snap)";
  NativeHumanForceExitSeatNoSnap.desc = "Human.ForceExitSeatNoSnap(uGuid) -- forces exit from a vehicle seat without the normal snap-to-ground/exit animation";
  NativeHumanForceExitSeatNoSnap.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    CodeGen.emitNative("Human.ForceExitSeatNoSnap(" + uGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/forceexitseatnosnap", NativeHumanForceExitSeatNoSnap);

  // ============================================================
  // Native/Human/PersistTransform -- Human.PersistTransform(uGuid).
  // ============================================================
  function NativeHumanPersistTransform() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
  }
  NativeHumanPersistTransform.title = "Human: Persist Transform";
  NativeHumanPersistTransform.desc = "Human.PersistTransform(uGuid)";
  NativeHumanPersistTransform.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    CodeGen.emitNative("Human.PersistTransform(" + uGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/persisttransform", NativeHumanPersistTransform);

  // ============================================================
  // Native/Human/Scrub -- Human.Scrub(uGuid). Confirmed in one real call site immediately following a
  // Human.Drop/Human.SetState("Upright","Idle") cleanup sequence -- likely resets/clears transient
  // character state, but the exact effect is not confirmed.
  // ============================================================
  function NativeHumanScrub() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
  }
  NativeHumanScrub.title = "Human: Scrub";
  NativeHumanScrub.desc = "Human.Scrub(uGuid) -- likely resets/clears transient character state, exact effect not confirmed";
  NativeHumanScrub.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    CodeGen.emitNative("Human.Scrub(" + uGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/scrub", NativeHumanScrub);

  // ============================================================
  // Native/Human/SetAllowCorpseCleanup -- Human.SetAllowCorpseCleanup(uGuid, bAllow). Returns the previous
  // state (bPrev per one call site's Debug.Printf capture), discarded here -- same treatment as every other
  // action node in this file that ignores an incidental return value.
  // ============================================================
  function NativeHumanSetAllowCorpseCleanup() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addProperty("bAllow", true);
    this.addWidget("toggle", "bAllow", this.properties.bAllow, function (v) { this.properties.bAllow = v; }.bind(this));
  }
  NativeHumanSetAllowCorpseCleanup.title = "Human: Set Allow Corpse Cleanup";
  NativeHumanSetAllowCorpseCleanup.desc = "Human.SetAllowCorpseCleanup(uGuid, bAllow) -- return (previous state) discarded";
  NativeHumanSetAllowCorpseCleanup.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    var bAllow = this.properties.bAllow ? "true" : "false";
    CodeGen.emitNative("Human.SetAllowCorpseCleanup(" + uGuid + ", " + bAllow + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/setallowcorpsecleanup", NativeHumanSetAllowCorpseCleanup);

  // ============================================================
  // Native/Human/SetFireLock -- Human.SetFireLock(uGuid, bLocked). Used to prevent/allow weapon firing
  // during a scripted sequence (e.g. a shooting-gallery minigame) -- a lower-level primitive distinct from
  // Ess.Human.disableWeapons/enableWeapons, which are skipped separately below.
  // ============================================================
  function NativeHumanSetFireLock() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("uGuid", "string");
    this.addProperty("uGuid", "Ess.Player.character(0)");
    this.addWidget("text", "uGuid", this.properties.uGuid, function (v) { this.properties.uGuid = v; }.bind(this));
    this.addProperty("bLocked", false);
    this.addWidget("toggle", "bLocked", this.properties.bLocked, function (v) { this.properties.bLocked = v; }.bind(this));
  }
  NativeHumanSetFireLock.title = "Human: Set Fire Lock";
  NativeHumanSetFireLock.desc = "Human.SetFireLock(uGuid, bLocked) -- prevents/allows weapon firing";
  NativeHumanSetFireLock.prototype.onAction = function () {
    var uGuid = resolveRawInput(this, 1, "uGuid");  // input 0 is "exec"
    var bLocked = this.properties.bLocked ? "true" : "false";
    CodeGen.emitNative("Human.SetFireLock(" + uGuid + ", " + bLocked + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/human/setfirelock", NativeHumanSetFireLock);

  // Human.DisableWeapons(uGuid) -- SKIPPED: this is exactly what Ess.Human.disableWeapons(uChar) already
  // wraps -- no native equivalent needed.

  // Human.EnableWeapons(uGuid) -- SKIPPED: this is exactly what Ess.Human.enableWeapons(uChar) already
  // wraps -- no native equivalent needed.
})();
