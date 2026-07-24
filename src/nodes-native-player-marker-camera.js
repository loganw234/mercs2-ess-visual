/* nodes-native-player-marker-camera.js -- NATIVE Player, Marker, and Camera node types: bare engine calls
 * straight off the wiki namespace pages (player.md, marker.md, camera.md), not Ess wrappers. See
 * codegen.js's "Native tier" section (read that first) for what distinguishes a Native node from every Ess
 * node in this repo:
 *   1. this.color = CodeGen.NATIVE_COLOR; this.bgcolor = CodeGen.NATIVE_BGCOLOR; -- set in every
 *      constructor below, right after the addInput/addOutput calls.
 *   2. CodeGen.emitNative(line) instead of CodeGen.emit(line) for every action node -- wraps the emitted
 *      line in pcall(function() ... end). Pure-data getter nodes still use plain setOutputData -- nothing
 *      here computes a real runtime value, every data wire carries a fragment of generated Lua SOURCE
 *      TEXT (see codegen.js's header), so a getter never needs pcall protection at graph-build time.
 *
 * Registered under "native/player/...", "native/marker/...", and "native/camera/..." (all lowercase) --
 * the "native/" prefix (vs. "ess/") is what makes these structurally distinct; see palette.js and
 * compiler.js, neither of which needed changes for this file to work (isDataNode / trigger-walk logic is
 * type-string-agnostic).
 *
 * GUID/HANDLE INPUT CONVENTION (same idea as nodes-markers-camera.js -- resolveRawInput below is a local
 * copy of that file's helper, kept local rather than added to codegen.js):
 *   - uPlayerGuid params default to the literal expression "Player.GetLocalPlayer()" -- the wiki's own
 *     most basic player-guid getter, no Ess needed, semantically exact for a "uPlayerGuid" parameter.
 *   - uGuid / uCharacterGuid params default to "Ess.Player.character(0)", matching every other node's
 *     guid-input convention already established elsewhere in this repo (nodes-player.js, nodes-markers-
 *     camera.js).
 *   - uCameraGuid params default to "Ess.Player.camera(0)" -- Ess's own wrapper around Player.GetCamera,
 *     already used the same way by Camera FOV / Camera Restore FOV in nodes-markers-camera.js.
 *   - Marker HANDLES (uMarker, returned only by the Marker.Add family) and boundary guids (uBoundaryGuid)
 *     have no sensible default expression at all -- both default to the bare literal "nil" and say so in
 *     their .desc, matching this repo's existing onDone/onNo callback-text convention (Player Teleport,
 *     Confirm Prompt).
 *   - Every Marker Add-family node fires its call and DISCARDS the returned handle -- this compiler has no
 *     variable-binding mechanism to capture a node's return value and re-wire it into a later node (same
 *     established precedent as Ess.Object.spawn / Ess.Object.damage in nodes-object.js) -- each such
 *     node's .desc says so explicitly.
 *
 * SCOPE NOTES (player.md): sections NOT touched by this pass at all -- Player & Character Identity, Cash &
 * Fuel, Camera & Viewport, Vehicle Seat & Control -- out of scope for this file (either already covered by
 * nodes-player.js's Ess wrappers or left for a separate pass), so they are not itemized as individual
 * skips below. Costumes & Disguise / Satellite Scan / PDA Map Mode are covered in full; Boundaries, Input &
 * Control, and Misc are covered for everything not already wrapped by an existing Ess node. Functions with
 * a literal "(...)" placeholder signature in the wiki (zero call sites, zero known argument shape) are
 * skipped throughout, each with a one-line comment at its would-be spot.
 */
(function () {
  "use strict";

  // Resolve a node's input slot exactly like CodeGen.resolveNumberInput does (wired value wins, else the
  // property default) but without any numeric assumption -- used for guid/handle EXPRESSION inputs
  // (spliced raw, never quoted) and as the pre-quote step for plain string inputs.
  function resolveRawInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  // ============================================================================================
  // PLAYER -- Costumes & Disguise
  // ============================================================================================

  // Native/Player/GetAvailableCostumes -- Player.GetAvailableCostumes() -> n. Confirmed no-arg call
  // (wifpmcinterior.lua). Distinct from the resident/-module WifPmcInterior.GetAvailableCostumes() wrapper.
  function PlayerGetAvailableCostumes() {
    this.addOutput("n", "number");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetAvailableCostumes.title = "Get Available Costumes";
  PlayerGetAvailableCostumes.desc = "Player.GetAvailableCostumes() -- confirmed no-arg call";
  PlayerGetAvailableCostumes.prototype.onExecute = function () {
    this.setOutputData(0, "Player.GetAvailableCostumes()");
  };
  LiteGraph.registerNodeType("native/player/getavailablecostumes", PlayerGetAvailableCostumes);

  // Native/Player/SetAvailableCostumes -- Player.SetAvailableCostumes(n). Confirmed.
  function PlayerSetAvailableCostumes() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("n", "number");
    this.addProperty("n", 3);
    this.addWidget("number", "n", this.properties.n, function (v) { this.properties.n = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetAvailableCostumes.title = "Set Available Costumes";
  PlayerSetAvailableCostumes.desc = "Player.SetAvailableCostumes(n)";
  PlayerSetAvailableCostumes.prototype.onAction = function () {
    var n = CodeGen.resolveNumberInput(this, 1, "n");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetAvailableCostumes(" + n + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setavailablecostumes", PlayerSetAvailableCostumes);

  // Native/Player/GetProfileCostume -- Player.GetProfileCostume() -> n. Confirmed no-arg call.
  function PlayerGetProfileCostume() {
    this.addOutput("n", "number");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetProfileCostume.title = "Get Profile Costume";
  PlayerGetProfileCostume.desc = "Player.GetProfileCostume() -- confirmed no-arg call, current outfit index";
  PlayerGetProfileCostume.prototype.onExecute = function () {
    this.setOutputData(0, "Player.GetProfileCostume()");
  };
  LiteGraph.registerNodeType("native/player/getprofilecostume", PlayerGetProfileCostume);

  // Native/Player/SetProfileCostume -- Player.SetProfileCostume(iIndex). Confirmed; real call sites pass a
  // zero-based index (iIndex - 1) -- this node emits whatever number you give it, unadjusted.
  function PlayerSetProfileCostume() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("iIndex", "number");
    this.addProperty("iIndex", 0);
    this.addWidget("number", "iIndex", this.properties.iIndex, function (v) { this.properties.iIndex = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetProfileCostume.title = "Set Profile Costume";
  PlayerSetProfileCostume.desc = "Player.SetProfileCostume(iIndex) -- real call sites pass a zero-based index";
  PlayerSetProfileCostume.prototype.onAction = function () {
    var iIndex = CodeGen.resolveNumberInput(this, 1, "iIndex");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetProfileCostume(" + iIndex + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setprofilecostume", PlayerSetProfileCostume);

  // Native/Player/SetOutfit -- Player.SetOutfit(uGuid, sModelName). Confirmed (wardrobe code). No literal
  // confirmed model name exists in the wiki to default sModelName to -- left blank, fill in a real one.
  function PlayerSetOutfit() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sModelName", "");
    this.addWidget("text", "sModelName", this.properties.sModelName, function (v) { this.properties.sModelName = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetOutfit.title = "Set Outfit";
  PlayerSetOutfit.desc = "Player.SetOutfit(uGuid, sModelName) -- no confirmed example model name in the wiki, fill in a real one";
  PlayerSetOutfit.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var model = CodeGen.luaString(this.properties.sModelName);
    CodeGen.emitNative("Player.SetOutfit(" + guid + ", " + model + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setoutfit", PlayerSetOutfit);

  // Native/Player/GetProfileCharacter -- Player.GetProfileCharacter(idx) -> n. Live-confirmed via
  // WebSocket lua-bridge probe (2026-07-22); idx is the local-player-slot index (0 or 1, see player.md).
  function PlayerGetProfileCharacter() {
    this.addOutput("n", "number");
    this.addInput("idx", "number");
    this.addProperty("idx", 0);
    this.addWidget("number", "idx", this.properties.idx, function (v) { this.properties.idx = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetProfileCharacter.title = "Get Profile Character";
  PlayerGetProfileCharacter.desc = "Player.GetProfileCharacter(idx) -- idx is the local-player-slot index, live-confirmed";
  PlayerGetProfileCharacter.prototype.onExecute = function () {
    var idx = CodeGen.resolveNumberInput(this, 0, "idx");
    this.setOutputData(0, "Player.GetProfileCharacter(" + idx + ")");
  };
  LiteGraph.registerNodeType("native/player/getprofilecharacter", PlayerGetProfileCharacter);

  // Native/Player/GetProfileUpgrade -- Player.GetProfileUpgrade(idx) -> n. Live-confirmed, same idx family
  // as GetProfileCharacter above.
  function PlayerGetProfileUpgrade() {
    this.addOutput("n", "number");
    this.addInput("idx", "number");
    this.addProperty("idx", 0);
    this.addWidget("number", "idx", this.properties.idx, function (v) { this.properties.idx = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetProfileUpgrade.title = "Get Profile Upgrade";
  PlayerGetProfileUpgrade.desc = "Player.GetProfileUpgrade(idx) -- idx is the local-player-slot index, live-confirmed";
  PlayerGetProfileUpgrade.prototype.onExecute = function () {
    var idx = CodeGen.resolveNumberInput(this, 0, "idx");
    this.setOutputData(0, "Player.GetProfileUpgrade(" + idx + ")");
  };
  LiteGraph.registerNodeType("native/player/getprofileupgrade", PlayerGetProfileUpgrade);

  // SKIPPED: Player.SetProfileCharacter(...) / Player.SetProfileUpgrade(...) -- literal "(...)" signature
  // in the wiki, zero call sites, zero confirmed argument shape to build a widget around.

  // Native/Player/GetVehicleDisguise -- Player.GetVehicleDisguise() -> b. Confirmed no-arg boolean state.
  function PlayerGetVehicleDisguise() {
    this.addOutput("b", "boolean");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetVehicleDisguise.title = "Get Vehicle Disguise";
  PlayerGetVehicleDisguise.desc = "Player.GetVehicleDisguise() -- confirmed no-arg call";
  PlayerGetVehicleDisguise.prototype.onExecute = function () {
    this.setOutputData(0, "Player.GetVehicleDisguise()");
  };
  LiteGraph.registerNodeType("native/player/getvehicledisguise", PlayerGetVehicleDisguise);

  // Native/Player/SetVehicleDisguise -- Player.SetVehicleDisguise(bEnable). Confirmed (mrxmissionflow.lua).
  function PlayerSetVehicleDisguise() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetVehicleDisguise.title = "Set Vehicle Disguise";
  PlayerSetVehicleDisguise.desc = "Player.SetVehicleDisguise(bEnable)";
  PlayerSetVehicleDisguise.prototype.onAction = function () {
    CodeGen.emitNative("Player.SetVehicleDisguise(" + (this.properties.bEnable ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setvehicledisguise", PlayerSetVehicleDisguise);

  // Native/Player/GetVehicleDisguiseState -- Player.GetVehicleDisguiseState({Player = uGuid}) -> b.
  // Confirmed with a TABLE argument, not positional -- unusual for this namespace, this is real (see
  // player.md's Notes for modders). guid here is the disguised rider's uGuid (real call sites use uRider).
  function PlayerGetVehicleDisguiseState() {
    this.addOutput("b", "boolean");
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetVehicleDisguiseState.title = "Get Vehicle Disguise State";
  PlayerGetVehicleDisguiseState.desc = "Player.GetVehicleDisguiseState({Player = uGuid}) -- confirmed table-argument call";
  PlayerGetVehicleDisguiseState.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Player.GetVehicleDisguiseState({Player = " + guid + "})");
  };
  LiteGraph.registerNodeType("native/player/getvehicledisguisestate", PlayerGetVehicleDisguiseState);

  // Native/Player/VehicleDisguiseStart -- Player.VehicleDisguise({Player = uGuid, Callback = fCallback}).
  // Confirmed table-argument form. callback is raw Lua source text (function name/literal), default "nil".
  function PlayerVehicleDisguiseStart() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("callback", "nil");
    this.addWidget("text", "callback (nil = none)", this.properties.callback, function (v) { this.properties.callback = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerVehicleDisguiseStart.title = "Vehicle Disguise (Start)";
  PlayerVehicleDisguiseStart.desc = "Player.VehicleDisguise({Player = uGuid, Callback = fCallback}) -- confirmed table-argument form";
  PlayerVehicleDisguiseStart.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.VehicleDisguise({Player = " + guid + ", Callback = " + this.properties.callback + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/vehicledisguisestart", PlayerVehicleDisguiseStart);

  // Native/Player/VehicleDisguiseRemove -- Player.VehicleDisguise({Player = uGuid, Remove = true}). The
  // other confirmed table-argument form of the same function -- a separate node since the two shapes are
  // both individually confirmed and mutually exclusive (Callback vs Remove), not a single toggle guess.
  function PlayerVehicleDisguiseRemove() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerVehicleDisguiseRemove.title = "Vehicle Disguise (Remove)";
  PlayerVehicleDisguiseRemove.desc = "Player.VehicleDisguise({Player = uGuid, Remove = true}) -- confirmed table-argument form";
  PlayerVehicleDisguiseRemove.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.VehicleDisguise({Player = " + guid + ", Remove = true})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/vehicledisguiseremove", PlayerVehicleDisguiseRemove);

  // ============================================================================================
  // PLAYER -- Satellite Scan
  // ============================================================================================

  // Native/Player/SetSatelliteScanMode -- Player.SetSatelliteScanMode(uPlayerGuid, bEnable, nX, nY, nZ).
  // Confirmed ONLY in the disable form (bEnable = false, zeroed coordinates) -- the enable form's
  // coordinate meaning is unconfirmed. Node still exposes the full confirmed 5-arg shape.
  function PlayerSetSatelliteScanMode() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", false);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.addInput("nX", "number");
    this.addProperty("nX", 0);
    this.addWidget("number", "nX", this.properties.nX, function (v) { this.properties.nX = v; }.bind(this));
    this.addInput("nY", "number");
    this.addProperty("nY", 0);
    this.addWidget("number", "nY", this.properties.nY, function (v) { this.properties.nY = v; }.bind(this));
    this.addInput("nZ", "number");
    this.addProperty("nZ", 0);
    this.addWidget("number", "nZ", this.properties.nZ, function (v) { this.properties.nZ = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetSatelliteScanMode.title = "Set Satellite Scan Mode";
  PlayerSetSatelliteScanMode.desc = "Player.SetSatelliteScanMode(uPlayerGuid, bEnable, nX, nY, nZ) -- only the disable form (false, 0,0,0) is live-confirmed";
  PlayerSetSatelliteScanMode.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var nX = CodeGen.resolveNumberInput(this, 2, "nX");
    var nY = CodeGen.resolveNumberInput(this, 3, "nY");
    var nZ = CodeGen.resolveNumberInput(this, 4, "nZ");
    CodeGen.emitNative("Player.SetSatelliteScanMode(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ", " + nX + ", " + nY + ", " + nZ + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setsatellitescanmode", PlayerSetSatelliteScanMode);

  // SKIPPED: Player.SetupSatelliteScan(...) / AddSatelliteScanTarget(...) / SetSatelliteScanCallbacks(...)
  // / SetSatelliteScanPaused(...) -- all literal "(...)" signatures, zero call sites, zero confirmed shape.

  // ============================================================================================
  // PLAYER -- PDA Map Mode
  // ============================================================================================

  // Native/Player/SetPDAMapMode -- Player.SetPDAMapMode(uPlayerGuid, bEnable, nX, nY, nZ, nRadius,
  // nMinZoomDelta, nMaxZoomDelta, bUseMinigame). Confirmed with this full 9-arg shape (also confirmed
  // called as just (uGuid, false) to disable -- the trailing args are simply ignored/irrelevant then).
  function PlayerSetPDAMapMode() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.addInput("nX", "number");
    this.addProperty("nX", 0);
    this.addWidget("number", "nX", this.properties.nX, function (v) { this.properties.nX = v; }.bind(this));
    this.addInput("nY", "number");
    this.addProperty("nY", 0);
    this.addWidget("number", "nY", this.properties.nY, function (v) { this.properties.nY = v; }.bind(this));
    this.addInput("nZ", "number");
    this.addProperty("nZ", 0);
    this.addWidget("number", "nZ", this.properties.nZ, function (v) { this.properties.nZ = v; }.bind(this));
    this.addInput("nRadius", "number");
    this.addProperty("nRadius", 50);
    this.addWidget("number", "nRadius", this.properties.nRadius, function (v) { this.properties.nRadius = v; }.bind(this));
    this.addInput("nMinZoomDelta", "number");
    this.addProperty("nMinZoomDelta", 0);
    this.addWidget("number", "nMinZoomDelta", this.properties.nMinZoomDelta, function (v) { this.properties.nMinZoomDelta = v; }.bind(this));
    this.addInput("nMaxZoomDelta", "number");
    this.addProperty("nMaxZoomDelta", 0);
    this.addWidget("number", "nMaxZoomDelta", this.properties.nMaxZoomDelta, function (v) { this.properties.nMaxZoomDelta = v; }.bind(this));
    this.addProperty("bUseMinigame", false);
    this.addWidget("toggle", "bUseMinigame", this.properties.bUseMinigame, function (v) { this.properties.bUseMinigame = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetPDAMapMode.title = "Set PDA Map Mode";
  PlayerSetPDAMapMode.desc = "Player.SetPDAMapMode(uPlayerGuid, bEnable, nX, nY, nZ, nRadius, nMinZoomDelta, nMaxZoomDelta, bUseMinigame)";
  PlayerSetPDAMapMode.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var nX = CodeGen.resolveNumberInput(this, 2, "nX");
    var nY = CodeGen.resolveNumberInput(this, 3, "nY");
    var nZ = CodeGen.resolveNumberInput(this, 4, "nZ");
    var nRadius = CodeGen.resolveNumberInput(this, 5, "nRadius");
    var nMinZoomDelta = CodeGen.resolveNumberInput(this, 6, "nMinZoomDelta");
    var nMaxZoomDelta = CodeGen.resolveNumberInput(this, 7, "nMaxZoomDelta");
    CodeGen.emitNative("Player.SetPDAMapMode(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ", " +
      nX + ", " + nY + ", " + nZ + ", " + nRadius + ", " + nMinZoomDelta + ", " + nMaxZoomDelta + ", " +
      (this.properties.bUseMinigame ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setpdamapmode", PlayerSetPDAMapMode);

  // Native/Player/SetPDAMapModeCallback -- Player.SetPDAMapModeCallback(uPlayerGuid, bFlag, fCallback [,
  // tArgs]). Confirmed; optional trailing tArgs table omitted here (same "drop the partially-confirmed
  // optional table" simplification nodes-markers-camera.js's Camera Watch already uses for its opts table).
  function PlayerSetPDAMapModeCallback() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bFlag", true);
    this.addWidget("toggle", "bFlag", this.properties.bFlag, function (v) { this.properties.bFlag = v; }.bind(this));
    this.addProperty("callback", "nil");
    this.addWidget("text", "callback (nil = none)", this.properties.callback, function (v) { this.properties.callback = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetPDAMapModeCallback.title = "Set PDA Map Mode Callback";
  PlayerSetPDAMapModeCallback.desc = "Player.SetPDAMapModeCallback(uPlayerGuid, bFlag, fCallback) -- optional trailing tArgs table omitted";
  PlayerSetPDAMapModeCallback.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetPDAMapModeCallback(" + guid + ", " + (this.properties.bFlag ? "true" : "false") + ", " + this.properties.callback + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setpdamapmodecallback", PlayerSetPDAMapModeCallback);

  // Native/Player/SetPDAMapModeCancelCallback -- Player.SetPDAMapModeCancelCallback(uPlayerGuid,
  // fCallback). Confirmed.
  function PlayerSetPDAMapModeCancelCallback() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("callback", "nil");
    this.addWidget("text", "callback (nil = none)", this.properties.callback, function (v) { this.properties.callback = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetPDAMapModeCancelCallback.title = "Set PDA Map Mode Cancel Callback";
  PlayerSetPDAMapModeCancelCallback.desc = "Player.SetPDAMapModeCancelCallback(uPlayerGuid, fCallback)";
  PlayerSetPDAMapModeCancelCallback.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetPDAMapModeCancelCallback(" + guid + ", " + this.properties.callback + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setpdamapmodecancelcallback", PlayerSetPDAMapModeCancelCallback);

  // Native/Player/RequestPDAMapModeCancel -- Player.RequestPDAMapModeCancel(uPlayerGuid). Confirmed.
  function PlayerRequestPDAMapModeCancel() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerRequestPDAMapModeCancel.title = "Request PDA Map Mode Cancel";
  PlayerRequestPDAMapModeCancel.desc = "Player.RequestPDAMapModeCancel(uPlayerGuid)";
  PlayerRequestPDAMapModeCancel.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.RequestPDAMapModeCancel(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/requestpdamapmodecancel", PlayerRequestPDAMapModeCancel);

  // Native/Player/RequestPDAMapModeExit -- Player.RequestPDAMapModeExit(uPlayerGuid, fCallback [, tArgs]).
  // Confirmed; optional trailing tArgs omitted, same reasoning as SetPDAMapModeCallback above.
  function PlayerRequestPDAMapModeExit() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("callback", "nil");
    this.addWidget("text", "callback (nil = none)", this.properties.callback, function (v) { this.properties.callback = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerRequestPDAMapModeExit.title = "Request PDA Map Mode Exit";
  PlayerRequestPDAMapModeExit.desc = "Player.RequestPDAMapModeExit(uPlayerGuid, fCallback) -- optional trailing tArgs table omitted";
  PlayerRequestPDAMapModeExit.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.RequestPDAMapModeExit(" + guid + ", " + this.properties.callback + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/requestpdamapmodeexit", PlayerRequestPDAMapModeExit);

  // ============================================================================================
  // PLAYER -- Boundaries (Ess.Player.removeBoundaries() in nodes-player.js is a different, no-arg,
  // "every connected player" call -- everything below targets one explicit uPlayerGuid, no overlap)
  // ============================================================================================

  // Native/Player/AddBoundary -- Player.AddBoundary(uPlayerGuid, uBoundaryGuid). Confirmed. No sensible
  // default exists for an arbitrary boundary object's guid -- defaults to "nil", wire/type a real one in.
  function PlayerAddBoundary() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("boundaryGuid", "string");
    this.addProperty("boundaryGuid", "nil");
    this.addWidget("text", "boundaryGuid (nil = must wire in)", this.properties.boundaryGuid, function (v) { this.properties.boundaryGuid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerAddBoundary.title = "Add Boundary";
  PlayerAddBoundary.desc = "Player.AddBoundary(uPlayerGuid, uBoundaryGuid) -- boundaryGuid has no sensible default, wire/type a real one";
  PlayerAddBoundary.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var boundaryGuid = resolveRawInput(this, 2, "boundaryGuid");
    CodeGen.emitNative("Player.AddBoundary(" + guid + ", " + boundaryGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/addboundary", PlayerAddBoundary);

  // Native/Player/RemoveBoundary -- Player.RemoveBoundary(uPlayerGuid, uBoundaryGuid). Confirmed, same
  // two-guid shape as AddBoundary above.
  function PlayerRemoveBoundary() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("boundaryGuid", "string");
    this.addProperty("boundaryGuid", "nil");
    this.addWidget("text", "boundaryGuid (nil = must wire in)", this.properties.boundaryGuid, function (v) { this.properties.boundaryGuid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerRemoveBoundary.title = "Remove Boundary";
  PlayerRemoveBoundary.desc = "Player.RemoveBoundary(uPlayerGuid, uBoundaryGuid)";
  PlayerRemoveBoundary.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var boundaryGuid = resolveRawInput(this, 2, "boundaryGuid");
    CodeGen.emitNative("Player.RemoveBoundary(" + guid + ", " + boundaryGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/removeboundary", PlayerRemoveBoundary);

  // Native/Player/RemoveAllBoundary -- Player.RemoveAllBoundary(uPlayerGuid). Confirmed. Distinct from
  // Ess.Player.removeBoundaries() (no args, every connected player at once) -- this targets ONE guid.
  function PlayerRemoveAllBoundary() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerRemoveAllBoundary.title = "Remove All Boundary";
  PlayerRemoveAllBoundary.desc = "Player.RemoveAllBoundary(uPlayerGuid) -- targets one player, unlike Ess.Player.removeBoundaries()";
  PlayerRemoveAllBoundary.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.RemoveAllBoundary(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/removeallboundary", PlayerRemoveAllBoundary);

  // Native/Player/GetAllBoundaryGuid -- Player.GetAllBoundaryGuid(uPlayerGuid) -> t. Unconfirmed -- no call
  // sites, but the wiki gives a clear named-arg signature shared with the confirmed AddBoundary/
  // RemoveBoundary siblings above.
  function PlayerGetAllBoundaryGuid() {
    this.addOutput("t", "table");
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetAllBoundaryGuid.title = "Get All Boundary Guid";
  PlayerGetAllBoundaryGuid.desc = "Player.GetAllBoundaryGuid(uPlayerGuid) -- unconfirmed, no call sites in the decompiled corpus";
  PlayerGetAllBoundaryGuid.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Player.GetAllBoundaryGuid(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/player/getallboundaryguid", PlayerGetAllBoundaryGuid);

  // Native/Player/SetBoundaryCallback -- Player.SetBoundaryCallback(uPlayerGuid, fCallback). Confirmed.
  function PlayerSetBoundaryCallback() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("callback", "nil");
    this.addWidget("text", "callback (nil = none)", this.properties.callback, function (v) { this.properties.callback = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetBoundaryCallback.title = "Set Boundary Callback";
  PlayerSetBoundaryCallback.desc = "Player.SetBoundaryCallback(uPlayerGuid, fCallback)";
  PlayerSetBoundaryCallback.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetBoundaryCallback(" + guid + ", " + this.properties.callback + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setboundarycallback", PlayerSetBoundaryCallback);

  // Native/Player/SetOutBoundary -- Player.SetOutBoundary(uPlayerGuid, bState). Confirmed.
  function PlayerSetOutBoundary() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bState", true);
    this.addWidget("toggle", "bState", this.properties.bState, function (v) { this.properties.bState = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetOutBoundary.title = "Set Out Boundary";
  PlayerSetOutBoundary.desc = "Player.SetOutBoundary(uPlayerGuid, bState)";
  PlayerSetOutBoundary.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetOutBoundary(" + guid + ", " + (this.properties.bState ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setoutboundary", PlayerSetOutBoundary);

  // Native/Player/GetOutBoundary -- Player.GetOutBoundary(uPlayerGuid) -> b. Unconfirmed -- no call sites,
  // presumed getter counterpart to the confirmed SetOutBoundary above.
  function PlayerGetOutBoundary() {
    this.addOutput("b", "boolean");
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetOutBoundary.title = "Get Out Boundary";
  PlayerGetOutBoundary.desc = "Player.GetOutBoundary(uPlayerGuid) -- unconfirmed, presumed counterpart to SetOutBoundary";
  PlayerGetOutBoundary.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Player.GetOutBoundary(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/player/getoutboundary", PlayerGetOutBoundary);

  // Native/Player/IsPositionOutBoundary -- Player.IsPositionOutBoundary(uPlayerGuid, nX, nY, nZ) -> b.
  // Confirmed (PDA map code).
  function PlayerIsPositionOutBoundary() {
    this.addOutput("b", "boolean");
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nX", "number");
    this.addProperty("nX", 0);
    this.addWidget("number", "nX", this.properties.nX, function (v) { this.properties.nX = v; }.bind(this));
    this.addInput("nY", "number");
    this.addProperty("nY", 0);
    this.addWidget("number", "nY", this.properties.nY, function (v) { this.properties.nY = v; }.bind(this));
    this.addInput("nZ", "number");
    this.addProperty("nZ", 0);
    this.addWidget("number", "nZ", this.properties.nZ, function (v) { this.properties.nZ = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerIsPositionOutBoundary.title = "Is Position Out Boundary";
  PlayerIsPositionOutBoundary.desc = "Player.IsPositionOutBoundary(uPlayerGuid, nX, nY, nZ) -- confirmed (PDA map code)";
  PlayerIsPositionOutBoundary.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    var nX = CodeGen.resolveNumberInput(this, 1, "nX");
    var nY = CodeGen.resolveNumberInput(this, 2, "nY");
    var nZ = CodeGen.resolveNumberInput(this, 3, "nZ");
    this.setOutputData(0, "Player.IsPositionOutBoundary(" + guid + ", " + nX + ", " + nY + ", " + nZ + ")");
  };
  LiteGraph.registerNodeType("native/player/ispositionoutboundary", PlayerIsPositionOutBoundary);

  // Native/Player/IsBoundaryDeath -- Player.IsBoundaryDeath(uCharacterGuid) -> b. Confirmed.
  function PlayerIsBoundaryDeath() {
    this.addOutput("b", "boolean");
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerIsBoundaryDeath.title = "Is Boundary Death";
  PlayerIsBoundaryDeath.desc = "Player.IsBoundaryDeath(uCharacterGuid) -- confirmed";
  PlayerIsBoundaryDeath.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Player.IsBoundaryDeath(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/player/isboundarydeath", PlayerIsBoundaryDeath);

  // ============================================================================================
  // PLAYER -- Input & Control (Ess.Player.setInputEnabled already covers Player.SetInputEnabled -- skip)
  // ============================================================================================

  // Native/Player/SetAimMode -- Player.SetAimMode(uPlayerGuid, bEnable). Confirmed, very common.
  function PlayerSetAimMode() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetAimMode.title = "Set Aim Mode";
  PlayerSetAimMode.desc = "Player.SetAimMode(uPlayerGuid, bEnable)";
  PlayerSetAimMode.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetAimMode(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setaimmode", PlayerSetAimMode);

  // Native/Player/SetGrappleEnabled -- Player.SetGrappleEnabled(uGuid, bEnable). Confirmed
  // (mrxmissionflow.lua). Wiki labels the first arg "uGuid" (not "uPlayerGuid"), so this defaults to a
  // character-guid expression like every other plain uGuid input in this repo.
  function PlayerSetGrappleEnabled() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetGrappleEnabled.title = "Set Grapple Enabled";
  PlayerSetGrappleEnabled.desc = "Player.SetGrappleEnabled(uGuid, bEnable)";
  PlayerSetGrappleEnabled.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetGrappleEnabled(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setgrappleenabled", PlayerSetGrappleEnabled);

  // Native/Player/SetScopeEnabled -- Player.SetScopeEnabled(uPlayerGuid, bEnable). Confirmed.
  function PlayerSetScopeEnabled() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetScopeEnabled.title = "Set Scope Enabled";
  PlayerSetScopeEnabled.desc = "Player.SetScopeEnabled(uPlayerGuid, bEnable)";
  PlayerSetScopeEnabled.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetScopeEnabled(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setscopeenabled", PlayerSetScopeEnabled);

  // Native/Player/SetHealthClamp -- Player.SetHealthClamp(uPlayerGuid, bEnable). Confirmed (paired with
  // SetSurvivalMode in hero.lua).
  function PlayerSetHealthClamp() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetHealthClamp.title = "Set Health Clamp";
  PlayerSetHealthClamp.desc = "Player.SetHealthClamp(uPlayerGuid, bEnable)";
  PlayerSetHealthClamp.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetHealthClamp(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/sethealthclamp", PlayerSetHealthClamp);

  // SKIPPED: Player.SetVehicleControlsLock(...) -- literal "(...)" signature, zero call sites.

  // Native/Player/SetSeatMovementLocks -- Player.SetSeatMovementLocks(uPlayerGuid, bEnable). Confirmed.
  function PlayerSetSeatMovementLocks() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetSeatMovementLocks.title = "Set Seat Movement Locks";
  PlayerSetSeatMovementLocks.desc = "Player.SetSeatMovementLocks(uPlayerGuid, bEnable)";
  PlayerSetSeatMovementLocks.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetSeatMovementLocks(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setseatmovementlocks", PlayerSetSeatMovementLocks);

  // Native/Player/GetControlBindingType -- Player.GetControlBindingType(uPlayerGuid) -> s. Confirmed
  // (pause-screen control-scheme display).
  function PlayerGetControlBindingType() {
    this.addOutput("s", "string");
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetControlBindingType.title = "Get Control Binding Type";
  PlayerGetControlBindingType.desc = "Player.GetControlBindingType(uPlayerGuid) -- confirmed";
  PlayerGetControlBindingType.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Player.GetControlBindingType(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/player/getcontrolbindingtype", PlayerGetControlBindingType);

  // Native/Player/SetInPmc -- Player.SetInPmc(uPlayerGuid, bEnable). Confirmed (entering/leaving PMC hub).
  function PlayerSetInPmc() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetInPmc.title = "Set In Pmc";
  PlayerSetInPmc.desc = "Player.SetInPmc(uPlayerGuid, bEnable)";
  PlayerSetInPmc.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetInPmc(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setinpmc", PlayerSetInPmc);

  // Native/Player/SetSurvivalMode -- Player.SetSurvivalMode(uPlayerGuid, bEnable). Confirmed (paired with
  // SetHealthClamp in hero.lua).
  function PlayerSetSurvivalMode() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", true);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetSurvivalMode.title = "Set Survival Mode";
  PlayerSetSurvivalMode.desc = "Player.SetSurvivalMode(uPlayerGuid, bEnable)";
  PlayerSetSurvivalMode.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetSurvivalMode(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setsurvivalmode", PlayerSetSurvivalMode);

  // SKIPPED: Player.SetSurvivalModeCallback(...) / SetSwimmingSearchRadius(...) -- literal "(...)"
  // signatures, zero call sites.

  // Native/Player/InCinematicMode -- Player.InCinematicMode(uPlayerGuid) -> b. Confirmed.
  function PlayerInCinematicMode() {
    this.addOutput("b", "boolean");
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerInCinematicMode.title = "In Cinematic Mode";
  PlayerInCinematicMode.desc = "Player.InCinematicMode(uPlayerGuid) -- confirmed";
  PlayerInCinematicMode.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Player.InCinematicMode(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/player/incinematicmode", PlayerInCinematicMode);

  // Native/Player/SetCinematicMode -- Player.SetCinematicMode(uPlayerGuid, bEnable [, ...extra args]).
  // Confirmed simplest 2-arg form; richer forms with extra trailing camera/cinematic-attach args exist in
  // real scripts but their meaning varies by call site and is unconfirmed -- simplified to the 2-arg
  // baseline, same "drop the partially-confirmed extras" treatment used elsewhere in this file.
  function PlayerSetCinematicMode() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bEnable", false);
    this.addWidget("toggle", "bEnable", this.properties.bEnable, function (v) { this.properties.bEnable = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerSetCinematicMode.title = "Set Cinematic Mode";
  PlayerSetCinematicMode.desc = "Player.SetCinematicMode(uPlayerGuid, bEnable) -- confirmed 2-arg baseline; richer forms with unconfirmed extra args exist but are omitted";
  PlayerSetCinematicMode.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.SetCinematicMode(" + guid + ", " + (this.properties.bEnable ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/setcinematicmode", PlayerSetCinematicMode);

  // ============================================================================================
  // PLAYER -- Misc (GetTargetUnderReticle skipped here -- already wrapped by Ess.Player.targetUnderReticle
  // in nodes-player.js, this file doesn't re-add a raw duplicate of that same native call)
  // ============================================================================================

  // Native/Player/GetPlayerStart -- Player.GetPlayerStart() -> v. Confirmed no-arg call; the corpus shows
  // both a position-vector use and a direct string comparison against a named-location constant, so the
  // canonical return form is ambiguous -- still a single value either way, fits this repo's one-output model.
  function PlayerGetPlayerStart() {
    this.addOutput("v", "string");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetPlayerStart.title = "Get Player Start";
  PlayerGetPlayerStart.desc = "Player.GetPlayerStart() -- confirmed no-arg call; return may be a position vector OR a named-location string, form unconfirmed";
  PlayerGetPlayerStart.prototype.onExecute = function () {
    this.setOutputData(0, "Player.GetPlayerStart()");
  };
  LiteGraph.registerNodeType("native/player/getplayerstart", PlayerGetPlayerStart);

  // SKIPPED: Player.SetPlayerStart(...) / GetRetryPosition(...) / CheckSpawnPos(...) -- all literal "(...)"
  // signatures, zero call sites.

  // Native/Player/ClearPlayerDB -- Player.ClearPlayerDB(). Confirmed no-arg call (mrxplayer.lua).
  function PlayerClearPlayerDB() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerClearPlayerDB.title = "Clear Player DB";
  PlayerClearPlayerDB.desc = "Player.ClearPlayerDB()";
  PlayerClearPlayerDB.prototype.onAction = function () {
    CodeGen.emitNative("Player.ClearPlayerDB()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/clearplayerdb", PlayerClearPlayerDB);

  // Native/Player/ClearGPS -- Player.ClearGPS(uPlayerGuid). Confirmed.
  function PlayerClearGPS() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Player.GetLocalPlayer()");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerClearGPS.title = "Clear GPS";
  PlayerClearGPS.desc = "Player.ClearGPS(uPlayerGuid)";
  PlayerClearGPS.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Player.ClearGPS(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/player/cleargps", PlayerClearGPS);

  // Native/Player/GetAllTargetMarkerPos -- Player.GetAllTargetMarkerPos() -> t. Confirmed no-arg call
  // (mrxguipda.lua), returns a table.
  function PlayerGetAllTargetMarkerPos() {
    this.addOutput("t", "table");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  PlayerGetAllTargetMarkerPos.title = "Get All Target Marker Pos";
  PlayerGetAllTargetMarkerPos.desc = "Player.GetAllTargetMarkerPos() -- confirmed no-arg call, returns a table";
  PlayerGetAllTargetMarkerPos.prototype.onExecute = function () {
    this.setOutputData(0, "Player.GetAllTargetMarkerPos()");
  };
  LiteGraph.registerNodeType("native/player/getalltargetmarkerpos", PlayerGetAllTargetMarkerPos);

  // ============================================================================================
  // MARKER -- Ess.Mark.* (nodes-markers-camera.js) is a different, higher-level convenience system, not a
  // wrapper around this raw Marker.* namespace -- no overlap, everything below is fresh coverage.
  // ============================================================================================

  // Native/Marker/Add -- uMarker = Marker.Add(nOffsetX, nOffsetY, nOffsetZ, uGuid, nR, nG, nB, nRadius).
  // Confirmed (mrxtaskobjectivedeliver.lua). "handle" output captures the returned marker handle via
  // CodeGen.emitNativeCapture (see codegen.js's header) -- wire it into Marker Remove/Pulse/etc. downstream.
  function MarkerAdd() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("nOffsetX", "number");
    this.addProperty("nOffsetX", 0);
    this.addWidget("number", "nOffsetX", this.properties.nOffsetX, function (v) { this.properties.nOffsetX = v; }.bind(this));
    this.addInput("nOffsetY", "number");
    this.addProperty("nOffsetY", 2);
    this.addWidget("number", "nOffsetY", this.properties.nOffsetY, function (v) { this.properties.nOffsetY = v; }.bind(this));
    this.addInput("nOffsetZ", "number");
    this.addProperty("nOffsetZ", 0);
    this.addWidget("number", "nOffsetZ", this.properties.nOffsetZ, function (v) { this.properties.nOffsetZ = v; }.bind(this));
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nR", "number");
    this.addProperty("nR", 255);
    this.addWidget("number", "nR", this.properties.nR, function (v) { this.properties.nR = v; }.bind(this));
    this.addInput("nG", "number");
    this.addProperty("nG", 255);
    this.addWidget("number", "nG", this.properties.nG, function (v) { this.properties.nG = v; }.bind(this));
    this.addInput("nB", "number");
    this.addProperty("nB", 255);
    this.addWidget("number", "nB", this.properties.nB, function (v) { this.properties.nB = v; }.bind(this));
    this.addInput("nRadius", "number");
    this.addProperty("nRadius", 0.05);
    this.addWidget("number", "nRadius", this.properties.nRadius, function (v) { this.properties.nRadius = v; }.bind(this));
    this.addOutput("handle", "string");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerAdd.title = "Marker Add";
  MarkerAdd.desc = "Marker.Add(nOffsetX, nOffsetY, nOffsetZ, uGuid, nR, nG, nB, nRadius) -> handle";
  MarkerAdd.prototype.onAction = function () {
    var nOffsetX = CodeGen.resolveNumberInput(this, 1, "nOffsetX");  // input 0 is "exec"
    var nOffsetY = CodeGen.resolveNumberInput(this, 2, "nOffsetY");
    var nOffsetZ = CodeGen.resolveNumberInput(this, 3, "nOffsetZ");
    var guid = resolveRawInput(this, 4, "guid");
    var nR = CodeGen.resolveNumberInput(this, 5, "nR");
    var nG = CodeGen.resolveNumberInput(this, 6, "nG");
    var nB = CodeGen.resolveNumberInput(this, 7, "nB");
    var nRadius = CodeGen.resolveNumberInput(this, 8, "nRadius");
    var varName = CodeGen.newLocal("marker");
    CodeGen.emitNativeCapture(varName, "Marker.Add(" + nOffsetX + ", " + nOffsetY + ", " + nOffsetZ + ", " + guid + ", " + nR + ", " + nG + ", " + nB + ", " + nRadius + ")");
    this.setOutputData(1, varName);   // "handle" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/add", MarkerAdd);

  // Native/Marker/Add3D -- uMarker = Marker.Add3D(uGuid, sIconName, nR, nG, nB [, nWidth]). Confirmed core
  // 5-arg form (mrxtaskrace.lua); optional trailing nWidth only confirmed on one call site
  // ("global_airring") and omitted here for consistency with this file's "drop partially-confirmed
  // optional trailing args" convention. "handle" output captures the returned marker handle, see Marker Add.
  function MarkerAdd3D() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sIconName", "global_tripwirefinish");
    this.addWidget("text", "sIconName", this.properties.sIconName, function (v) { this.properties.sIconName = v; }.bind(this));
    this.addInput("nR", "number");
    this.addProperty("nR", 255);
    this.addWidget("number", "nR", this.properties.nR, function (v) { this.properties.nR = v; }.bind(this));
    this.addInput("nG", "number");
    this.addProperty("nG", 255);
    this.addWidget("number", "nG", this.properties.nG, function (v) { this.properties.nG = v; }.bind(this));
    this.addInput("nB", "number");
    this.addProperty("nB", 255);
    this.addWidget("number", "nB", this.properties.nB, function (v) { this.properties.nB = v; }.bind(this));
    this.addOutput("handle", "string");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerAdd3D.title = "Marker Add3D";
  MarkerAdd3D.desc = "Marker.Add3D(uGuid, sIconName, nR, nG, nB) -> handle -- optional trailing nWidth omitted";
  MarkerAdd3D.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var icon = CodeGen.luaString(this.properties.sIconName);
    var nR = CodeGen.resolveNumberInput(this, 2, "nR");
    var nG = CodeGen.resolveNumberInput(this, 3, "nG");
    var nB = CodeGen.resolveNumberInput(this, 4, "nB");
    var varName = CodeGen.newLocal("marker");
    CodeGen.emitNativeCapture(varName, "Marker.Add3D(" + guid + ", " + icon + ", " + nR + ", " + nG + ", " + nB + ")");
    this.setOutputData(1, varName);
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/add3d", MarkerAdd3D);

  // Native/Marker/AddBlip -- uMarker = Marker.AddBlip(uGuid, sTextureName, nSize, nR, nG, nB, nAlpha, ...).
  // Confirmed core 7-arg form (live-tested by the wiki's own Snippets page); real scripts sometimes pass
  // more trailing args with nil gaps that aren't individually confirmed -- simplified to the reliable
  // live-tested shape. No literal confirmed texture name exists in the wiki, sTextureName defaults blank.
  // "handle" output captures the returned marker handle, see Marker Add.
  function MarkerAddBlip() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sTextureName", "");
    this.addWidget("text", "sTextureName", this.properties.sTextureName, function (v) { this.properties.sTextureName = v; }.bind(this));
    this.addInput("nSize", "number");
    this.addProperty("nSize", 32);
    this.addWidget("number", "nSize", this.properties.nSize, function (v) { this.properties.nSize = v; }.bind(this));
    this.addInput("nR", "number");
    this.addProperty("nR", 255);
    this.addWidget("number", "nR", this.properties.nR, function (v) { this.properties.nR = v; }.bind(this));
    this.addInput("nG", "number");
    this.addProperty("nG", 255);
    this.addWidget("number", "nG", this.properties.nG, function (v) { this.properties.nG = v; }.bind(this));
    this.addInput("nB", "number");
    this.addProperty("nB", 255);
    this.addWidget("number", "nB", this.properties.nB, function (v) { this.properties.nB = v; }.bind(this));
    this.addInput("nAlpha", "number");
    this.addProperty("nAlpha", 255);
    this.addWidget("number", "nAlpha", this.properties.nAlpha, function (v) { this.properties.nAlpha = v; }.bind(this));
    this.addOutput("handle", "string");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerAddBlip.title = "Marker Add Blip";
  MarkerAddBlip.desc = "Marker.AddBlip(uGuid, sTextureName, nSize, nR, nG, nB, nAlpha) -> handle -- live-tested core form";
  MarkerAddBlip.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var texture = CodeGen.luaString(this.properties.sTextureName);
    var nSize = CodeGen.resolveNumberInput(this, 2, "nSize");
    var nR = CodeGen.resolveNumberInput(this, 3, "nR");
    var nG = CodeGen.resolveNumberInput(this, 4, "nG");
    var nB = CodeGen.resolveNumberInput(this, 5, "nB");
    var nAlpha = CodeGen.resolveNumberInput(this, 6, "nAlpha");
    var varName = CodeGen.newLocal("marker");
    CodeGen.emitNativeCapture(varName, "Marker.AddBlip(" + guid + ", " + texture + ", " + nSize + ", " + nR + ", " + nG + ", " + nB + ", " + nAlpha + ")");
    this.setOutputData(1, varName);
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/addblip", MarkerAddBlip);

  // Native/Marker/AddDisc -- uMarker = Marker.AddDisc(uGuidOrLocation, nRadius, nR, nG, nB, nThickness).
  // Confirmed; the first arg accepts either a uGuid expression OR a location-vector expression -- both are
  // just raw Lua expression text via this same "guid" input, so either form works out of the box. "handle"
  // output captures the returned marker handle, see Marker Add.
  function MarkerAddDisc() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guidOrLoc", "string");
    this.addProperty("guidOrLoc", "Ess.Player.character(0)");
    this.addWidget("text", "guidOrLoc", this.properties.guidOrLoc, function (v) { this.properties.guidOrLoc = v; }.bind(this));
    this.addInput("nRadius", "number");
    this.addProperty("nRadius", 0.5);
    this.addWidget("number", "nRadius", this.properties.nRadius, function (v) { this.properties.nRadius = v; }.bind(this));
    this.addInput("nR", "number");
    this.addProperty("nR", 255);
    this.addWidget("number", "nR", this.properties.nR, function (v) { this.properties.nR = v; }.bind(this));
    this.addInput("nG", "number");
    this.addProperty("nG", 200);
    this.addWidget("number", "nG", this.properties.nG, function (v) { this.properties.nG = v; }.bind(this));
    this.addInput("nB", "number");
    this.addProperty("nB", 0);
    this.addWidget("number", "nB", this.properties.nB, function (v) { this.properties.nB = v; }.bind(this));
    this.addInput("nThickness", "number");
    this.addProperty("nThickness", 0.25);
    this.addWidget("number", "nThickness", this.properties.nThickness, function (v) { this.properties.nThickness = v; }.bind(this));
    this.addOutput("handle", "string");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerAddDisc.title = "Marker Add Disc";
  MarkerAddDisc.desc = "Marker.AddDisc(uGuidOrLocation, nRadius, nR, nG, nB, nThickness) -> handle -- first arg accepts a uGuid or a location-vector expression";
  MarkerAddDisc.prototype.onAction = function () {
    var guidOrLoc = resolveRawInput(this, 1, "guidOrLoc");  // input 0 is "exec"
    var nRadius = CodeGen.resolveNumberInput(this, 2, "nRadius");
    var nR = CodeGen.resolveNumberInput(this, 3, "nR");
    var nG = CodeGen.resolveNumberInput(this, 4, "nG");
    var nB = CodeGen.resolveNumberInput(this, 5, "nB");
    var nThickness = CodeGen.resolveNumberInput(this, 6, "nThickness");
    var varName = CodeGen.newLocal("marker");
    CodeGen.emitNativeCapture(varName, "Marker.AddDisc(" + guidOrLoc + ", " + nRadius + ", " + nR + ", " + nG + ", " + nB + ", " + nThickness + ")");
    this.setOutputData(1, varName);
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/adddisc", MarkerAddDisc);

  // Native/Marker/AddTripwire -- uMarker = Marker.AddTripwire(nX, nY, nZ, nWidth, nYaw, nR, nG, nB).
  // Confirmed (mrxtaskrace.lua, race-gate finish lines). "handle" output captures the returned marker
  // handle, see Marker Add.
  function MarkerAddTripwire() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("nX", "number");
    this.addProperty("nX", 0);
    this.addWidget("number", "nX", this.properties.nX, function (v) { this.properties.nX = v; }.bind(this));
    this.addInput("nY", "number");
    this.addProperty("nY", 0);
    this.addWidget("number", "nY", this.properties.nY, function (v) { this.properties.nY = v; }.bind(this));
    this.addInput("nZ", "number");
    this.addProperty("nZ", 0);
    this.addWidget("number", "nZ", this.properties.nZ, function (v) { this.properties.nZ = v; }.bind(this));
    this.addInput("nWidth", "number");
    this.addProperty("nWidth", 2);
    this.addWidget("number", "nWidth", this.properties.nWidth, function (v) { this.properties.nWidth = v; }.bind(this));
    this.addInput("nYaw", "number");
    this.addProperty("nYaw", 0);
    this.addWidget("number", "nYaw", this.properties.nYaw, function (v) { this.properties.nYaw = v; }.bind(this));
    this.addInput("nR", "number");
    this.addProperty("nR", 255);
    this.addWidget("number", "nR", this.properties.nR, function (v) { this.properties.nR = v; }.bind(this));
    this.addInput("nG", "number");
    this.addProperty("nG", 255);
    this.addWidget("number", "nG", this.properties.nG, function (v) { this.properties.nG = v; }.bind(this));
    this.addInput("nB", "number");
    this.addProperty("nB", 255);
    this.addWidget("number", "nB", this.properties.nB, function (v) { this.properties.nB = v; }.bind(this));
    this.addOutput("handle", "string");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerAddTripwire.title = "Marker Add Tripwire";
  MarkerAddTripwire.desc = "Marker.AddTripwire(nX, nY, nZ, nWidth, nYaw, nR, nG, nB) -> handle";
  MarkerAddTripwire.prototype.onAction = function () {
    var nX = CodeGen.resolveNumberInput(this, 1, "nX");  // input 0 is "exec"
    var nY = CodeGen.resolveNumberInput(this, 2, "nY");
    var nZ = CodeGen.resolveNumberInput(this, 3, "nZ");
    var nWidth = CodeGen.resolveNumberInput(this, 4, "nWidth");
    var nYaw = CodeGen.resolveNumberInput(this, 5, "nYaw");
    var nR = CodeGen.resolveNumberInput(this, 6, "nR");
    var nG = CodeGen.resolveNumberInput(this, 7, "nG");
    var nB = CodeGen.resolveNumberInput(this, 8, "nB");
    var varName = CodeGen.newLocal("marker");
    CodeGen.emitNativeCapture(varName, "Marker.AddTripwire(" + nX + ", " + nY + ", " + nZ + ", " + nWidth + ", " + nYaw + ", " + nR + ", " + nG + ", " + nB + ")");
    this.setOutputData(1, varName);
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/addtripwire", MarkerAddTripwire);

  // Native/Marker/Pulse -- Marker.Pulse(uGuid, nR, nG, nB). Confirmed (mrxfactionmanager.lua, munitions.lua)
  // -- takes the target OBJECT's uGuid, NOT a marker handle (per marker.md's Notes for modders). Paired
  // with Halt Pulse below.
  function MarkerPulse() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nR", "number");
    this.addProperty("nR", 0);
    this.addWidget("number", "nR", this.properties.nR, function (v) { this.properties.nR = v; }.bind(this));
    this.addInput("nG", "number");
    this.addProperty("nG", 255);
    this.addWidget("number", "nG", this.properties.nG, function (v) { this.properties.nG = v; }.bind(this));
    this.addInput("nB", "number");
    this.addProperty("nB", 0);
    this.addWidget("number", "nB", this.properties.nB, function (v) { this.properties.nB = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerPulse.title = "Marker Pulse";
  MarkerPulse.desc = "Marker.Pulse(uGuid, nR, nG, nB) -- uGuid is the target object's guid, NOT a marker handle";
  MarkerPulse.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var nR = CodeGen.resolveNumberInput(this, 2, "nR");
    var nG = CodeGen.resolveNumberInput(this, 3, "nG");
    var nB = CodeGen.resolveNumberInput(this, 4, "nB");
    CodeGen.emitNative("Marker.Pulse(" + guid + ", " + nR + ", " + nG + ", " + nB + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/pulse", MarkerPulse);

  // Native/Marker/HaltPulse -- Marker.HaltPulse(uGuid). Confirmed (mrxfactionmanager.lua) -- same uGuid
  // (not marker handle) as Pulse above, stops a previously-started Pulse.
  function MarkerHaltPulse() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerHaltPulse.title = "Marker Halt Pulse";
  MarkerHaltPulse.desc = "Marker.HaltPulse(uGuid) -- uGuid is the target object's guid, NOT a marker handle";
  MarkerHaltPulse.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emitNative("Marker.HaltPulse(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/haltpulse", MarkerHaltPulse);

  // Native/Marker/Remove -- Marker.Remove(uMarker). Extremely common in real scripts. Takes a marker
  // HANDLE previously returned by one of the Add* functions -- this compiler can't capture that return
  // value, so there's no sensible default expression here; wire in or hand-type whatever expression your
  // own script logic uses to track the handle (e.g. a global your OnLoad script sets).
  function MarkerRemove() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("handle", "string");
    this.addProperty("handle", "nil");
    this.addWidget("text", "handle (nil = must wire in)", this.properties.handle, function (v) { this.properties.handle = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerRemove.title = "Marker Remove";
  MarkerRemove.desc = "Marker.Remove(uMarker) -- marker HANDLE, not a uGuid; this compiler can't auto-capture an Add* return value, wire/type a real handle expression in";
  MarkerRemove.prototype.onAction = function () {
    var handle = resolveRawInput(this, 1, "handle");  // input 0 is "exec"
    CodeGen.emitNative("Marker.Remove(" + handle + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/remove", MarkerRemove);

  // Native/Marker/SetColor -- Marker.SetColor(uMarker, nR, nG, nB). Unconfirmed -- no call sites, signature
  // inferred by analogy to the confirmed RGB triples on Add*/Pulse above. Marker HANDLE input, not a uGuid.
  function MarkerSetColor() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("handle", "string");
    this.addProperty("handle", "nil");
    this.addWidget("text", "handle (nil = must wire in)", this.properties.handle, function (v) { this.properties.handle = v; }.bind(this));
    this.addInput("nR", "number");
    this.addProperty("nR", 255);
    this.addWidget("number", "nR", this.properties.nR, function (v) { this.properties.nR = v; }.bind(this));
    this.addInput("nG", "number");
    this.addProperty("nG", 255);
    this.addWidget("number", "nG", this.properties.nG, function (v) { this.properties.nG = v; }.bind(this));
    this.addInput("nB", "number");
    this.addProperty("nB", 255);
    this.addWidget("number", "nB", this.properties.nB, function (v) { this.properties.nB = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerSetColor.title = "Marker Set Color";
  MarkerSetColor.desc = "Marker.SetColor(uMarker, nR, nG, nB) -- unconfirmed, no call sites in the decompiled corpus; marker HANDLE input, not a uGuid";
  MarkerSetColor.prototype.onAction = function () {
    var handle = resolveRawInput(this, 1, "handle");  // input 0 is "exec"
    var nR = CodeGen.resolveNumberInput(this, 2, "nR");
    var nG = CodeGen.resolveNumberInput(this, 3, "nG");
    var nB = CodeGen.resolveNumberInput(this, 4, "nB");
    CodeGen.emitNative("Marker.SetColor(" + handle + ", " + nR + ", " + nG + ", " + nB + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/setcolor", MarkerSetColor);

  // Native/Marker/SetFollowGuid -- Marker.SetFollowGuid(uMarker, uGuid). Unconfirmed -- no call sites; name
  // suggests re-attaching an existing marker to follow a different object. Marker HANDLE plus a uGuid.
  function MarkerSetFollowGuid() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("handle", "string");
    this.addProperty("handle", "nil");
    this.addWidget("text", "handle (nil = must wire in)", this.properties.handle, function (v) { this.properties.handle = v; }.bind(this));
    this.addInput("targetGuid", "string");
    this.addProperty("targetGuid", "Ess.Player.character(0)");
    this.addWidget("text", "targetGuid", this.properties.targetGuid, function (v) { this.properties.targetGuid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerSetFollowGuid.title = "Marker Set Follow Guid";
  MarkerSetFollowGuid.desc = "Marker.SetFollowGuid(uMarker, uGuid) -- unconfirmed, no call sites in the decompiled corpus";
  MarkerSetFollowGuid.prototype.onAction = function () {
    var handle = resolveRawInput(this, 1, "handle");  // input 0 is "exec"
    var targetGuid = resolveRawInput(this, 2, "targetGuid");
    CodeGen.emitNative("Marker.SetFollowGuid(" + handle + ", " + targetGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/setfollowguid", MarkerSetFollowGuid);

  // SKIPPED: Marker.SetGroupedBlipLimit(...) -- literal "(...)" signature in the wiki (unlike SetColor/
  // SetFollowGuid/SetLocation/SetScale, which at least have named-arg signatures despite being
  // unconfirmed) -- genuinely unknown arity, no safe default to build a widget around.

  // Native/Marker/SetLocation -- Marker.SetLocation(uMarker, nX, nY, nZ). Unconfirmed -- no call sites;
  // name suggests moving an existing marker to new world coordinates. Marker HANDLE input, not a uGuid.
  function MarkerSetLocation() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("handle", "string");
    this.addProperty("handle", "nil");
    this.addWidget("text", "handle (nil = must wire in)", this.properties.handle, function (v) { this.properties.handle = v; }.bind(this));
    this.addInput("nX", "number");
    this.addProperty("nX", 0);
    this.addWidget("number", "nX", this.properties.nX, function (v) { this.properties.nX = v; }.bind(this));
    this.addInput("nY", "number");
    this.addProperty("nY", 0);
    this.addWidget("number", "nY", this.properties.nY, function (v) { this.properties.nY = v; }.bind(this));
    this.addInput("nZ", "number");
    this.addProperty("nZ", 0);
    this.addWidget("number", "nZ", this.properties.nZ, function (v) { this.properties.nZ = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerSetLocation.title = "Marker Set Location";
  MarkerSetLocation.desc = "Marker.SetLocation(uMarker, nX, nY, nZ) -- unconfirmed, no call sites in the decompiled corpus; marker HANDLE input, not a uGuid";
  MarkerSetLocation.prototype.onAction = function () {
    var handle = resolveRawInput(this, 1, "handle");  // input 0 is "exec"
    var nX = CodeGen.resolveNumberInput(this, 2, "nX");
    var nY = CodeGen.resolveNumberInput(this, 3, "nY");
    var nZ = CodeGen.resolveNumberInput(this, 4, "nZ");
    CodeGen.emitNative("Marker.SetLocation(" + handle + ", " + nX + ", " + nY + ", " + nZ + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/setlocation", MarkerSetLocation);

  // Native/Marker/SetScale -- Marker.SetScale(uMarker, nScale). Unconfirmed -- no call sites. Marker HANDLE
  // input, not a uGuid.
  function MarkerSetScale() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("handle", "string");
    this.addProperty("handle", "nil");
    this.addWidget("text", "handle (nil = must wire in)", this.properties.handle, function (v) { this.properties.handle = v; }.bind(this));
    this.addInput("nScale", "number");
    this.addProperty("nScale", 1);
    this.addWidget("number", "nScale", this.properties.nScale, function (v) { this.properties.nScale = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  MarkerSetScale.title = "Marker Set Scale";
  MarkerSetScale.desc = "Marker.SetScale(uMarker, nScale) -- unconfirmed, no call sites in the decompiled corpus; marker HANDLE input, not a uGuid";
  MarkerSetScale.prototype.onAction = function () {
    var handle = resolveRawInput(this, 1, "handle");  // input 0 is "exec"
    var nScale = CodeGen.resolveNumberInput(this, 2, "nScale");
    CodeGen.emitNative("Marker.SetScale(" + handle + ", " + nScale + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/marker/setscale", MarkerSetScale);

  // ============================================================================================
  // CAMERA -- top-level Camera.*, obtained via Player.GetCamera/Ess.Player.camera, NOT Graphics.Camera (a
  // separate, unrelated sub-table under Graphics for near/far-plane and FOV/LOD params -- see camera.md's
  // header). SetPosition/SetLookAt/Blend/Hold/Shake are already covered in spirit by
  // Ess.Camera.placeCamera/lookAtPoint/lookAtObject/blend/hold/shake in nodes-markers-camera.js -- skipped
  // here. Only the genuinely-new candidates below.
  // ============================================================================================

  // Native/Camera/SetShot -- Camera.SetShot(uCameraGuid, sShotName, uBaseActor, uTargetActor [, bFlag]).
  // Confirmed (resident/mrxbriefing.lua:1911, cinematic-briefing system alongside Blend/Hold). Optional
  // trailing bFlag omitted, same "drop the unconfirmed trailing bool" convention used throughout this file.
  function CameraSetShot() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("camGuid", "string");
    this.addProperty("camGuid", "Ess.Player.camera(0)");
    this.addWidget("text", "camGuid", this.properties.camGuid, function (v) { this.properties.camGuid = v; }.bind(this));
    this.addProperty("sShotName", "");
    this.addWidget("text", "sShotName", this.properties.sShotName, function (v) { this.properties.sShotName = v; }.bind(this));
    this.addInput("baseActor", "string");
    this.addProperty("baseActor", "Ess.Player.character(0)");
    this.addWidget("text", "baseActor", this.properties.baseActor, function (v) { this.properties.baseActor = v; }.bind(this));
    this.addInput("targetActor", "string");
    this.addProperty("targetActor", "Ess.Player.character(0)");
    this.addWidget("text", "targetActor", this.properties.targetActor, function (v) { this.properties.targetActor = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  CameraSetShot.title = "Camera Set Shot";
  CameraSetShot.desc = "Camera.SetShot(uCameraGuid, sShotName, uBaseActor, uTargetActor) -- confirmed 4-arg form; optional trailing bFlag omitted";
  CameraSetShot.prototype.onAction = function () {
    var camGuid = resolveRawInput(this, 1, "camGuid");  // input 0 is "exec"
    var shotName = CodeGen.luaString(this.properties.sShotName);
    var baseActor = resolveRawInput(this, 2, "baseActor");
    var targetActor = resolveRawInput(this, 3, "targetActor");
    CodeGen.emitNative("Camera.SetShot(" + camGuid + ", " + shotName + ", " + baseActor + ", " + targetActor + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/camera/setshot", CameraSetShot);

  // Native/Camera/SetPitch -- Camera.SetPitch(uCameraGuid, nPitch). Confirmed (resident/mrxutil.lua:370,
  // paired with Camera.SetYaw during a teleport-recovery sequence -- SetYaw itself is already effectively
  // reachable via the confirmed-orientation family, not duplicated here since it wasn't in this pass's
  // candidate list).
  function CameraSetPitch() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("camGuid", "string");
    this.addProperty("camGuid", "Ess.Player.camera(0)");
    this.addWidget("text", "camGuid", this.properties.camGuid, function (v) { this.properties.camGuid = v; }.bind(this));
    this.addInput("nPitch", "number");
    this.addProperty("nPitch", 0.3);
    this.addWidget("number", "nPitch", this.properties.nPitch, function (v) { this.properties.nPitch = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  CameraSetPitch.title = "Camera Set Pitch";
  CameraSetPitch.desc = "Camera.SetPitch(uCameraGuid, nPitch)";
  CameraSetPitch.prototype.onAction = function () {
    var camGuid = resolveRawInput(this, 1, "camGuid");  // input 0 is "exec"
    var nPitch = CodeGen.resolveNumberInput(this, 2, "nPitch");
    CodeGen.emitNative("Camera.SetPitch(" + camGuid + ", " + nPitch + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/camera/setpitch", CameraSetPitch);

  // Native/Camera/GetPitch -- Camera.GetPitch(uCameraGuid) -> nPitch. Unconfirmed -- no call sites, presumed
  // counterpart to the confirmed SetPitch above.
  function CameraGetPitch() {
    this.addOutput("nPitch", "number");
    this.addInput("camGuid", "string");
    this.addProperty("camGuid", "Ess.Player.camera(0)");
    this.addWidget("text", "camGuid", this.properties.camGuid, function (v) { this.properties.camGuid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  CameraGetPitch.title = "Camera Get Pitch";
  CameraGetPitch.desc = "Camera.GetPitch(uCameraGuid) -- unconfirmed, no call sites in the decompiled corpus; presumed counterpart to SetPitch";
  CameraGetPitch.prototype.onExecute = function () {
    var camGuid = resolveRawInput(this, 0, "camGuid");
    this.setOutputData(0, "Camera.GetPitch(" + camGuid + ")");
  };
  LiteGraph.registerNodeType("native/camera/getpitch", CameraGetPitch);

  // Native/Camera/StopBlending -- Camera.StopBlending(uCameraGuid). Confirmed (vz/vzacon001.lua:138) -- the
  // only confirmed call site defensively checks the function exists first ("if uCam and Camera.StopBlending
  // then"), worth keeping in mind if this ever errors on an older build.
  function CameraStopBlending() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("camGuid", "string");
    this.addProperty("camGuid", "Ess.Player.camera(0)");
    this.addWidget("text", "camGuid", this.properties.camGuid, function (v) { this.properties.camGuid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  CameraStopBlending.title = "Camera Stop Blending";
  CameraStopBlending.desc = "Camera.StopBlending(uCameraGuid) -- confirmed, only call site guards for the function's existence first";
  CameraStopBlending.prototype.onAction = function () {
    var camGuid = resolveRawInput(this, 1, "camGuid");  // input 0 is "exec"
    CodeGen.emitNative("Camera.StopBlending(" + camGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/camera/stopblending", CameraStopBlending);

  // Native/Camera/GetFOV -- Camera.GetFOV(uCameraGuid) -> nFOV. Unconfirmed -- no call sites. This is the
  // separate top-level Camera.* FOV getter, DISTINCT from Graphics.Camera.SetFovParams (a different
  // sub-table already effectively reachable via Ess.Camera.fov/restoreFov in nodes-markers-camera.js) --
  // camera.md is explicit these two FOV surfaces are unrelated aside from the shared name.
  function CameraGetFOV() {
    this.addOutput("nFOV", "number");
    this.addInput("camGuid", "string");
    this.addProperty("camGuid", "Ess.Player.camera(0)");
    this.addWidget("text", "camGuid", this.properties.camGuid, function (v) { this.properties.camGuid = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  CameraGetFOV.title = "Camera Get FOV (native)";
  CameraGetFOV.desc = "Camera.GetFOV(uCameraGuid) -- unconfirmed, no call sites; the separate top-level Camera.* FOV pair, NOT Graphics.Camera.SetFovParams (already covered by Ess.Camera.fov)";
  CameraGetFOV.prototype.onExecute = function () {
    var camGuid = resolveRawInput(this, 0, "camGuid");
    this.setOutputData(0, "Camera.GetFOV(" + camGuid + ")");
  };
  LiteGraph.registerNodeType("native/camera/getfov", CameraGetFOV);

  // Native/Camera/SetFOV -- Camera.SetFOV(uCameraGuid, nFOV). Unconfirmed -- no call sites; same
  // Camera.* vs. Graphics.Camera distinction as GetFOV above. camera.md flags this as needing a dedicated
  // live-probe pass with an active cinematic running, not yet attempted as of the wiki's latest pass.
  function CameraSetFOV() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("camGuid", "string");
    this.addProperty("camGuid", "Ess.Player.camera(0)");
    this.addWidget("text", "camGuid", this.properties.camGuid, function (v) { this.properties.camGuid = v; }.bind(this));
    this.addInput("nFOV", "number");
    this.addProperty("nFOV", 30);
    this.addWidget("number", "nFOV", this.properties.nFOV, function (v) { this.properties.nFOV = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  CameraSetFOV.title = "Camera Set FOV (native)";
  CameraSetFOV.desc = "Camera.SetFOV(uCameraGuid, nFOV) -- unconfirmed, no call sites; the separate top-level Camera.* FOV pair, NOT Graphics.Camera.SetFovParams (already covered by Ess.Camera.fov)";
  CameraSetFOV.prototype.onAction = function () {
    var camGuid = resolveRawInput(this, 1, "camGuid");  // input 0 is "exec"
    var nFOV = CodeGen.resolveNumberInput(this, 2, "nFOV");
    CodeGen.emitNative("Camera.SetFOV(" + camGuid + ", " + nFOV + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/camera/setfov", CameraSetFOV);
})();
