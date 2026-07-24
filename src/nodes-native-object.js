/* nodes-native-object.js -- NATIVE Object namespace node types, the first batch in the "native/" tier
 * (see codegen.js's Native-tier header comment for what makes these different from every Ess node in
 * this repo: their distinct on-canvas color, centralized in palette.js's colorize(), and
 * CodeGen.emitNative wrapping action lines in a defensive pcall). These wrap BARE engine calls straight
 * off the Object namespace -- Object.SetName, not
 * Ess.Object.setName -- for real engine capability Ess's own framework doesn't cover yet: animation
 * playback, winch/cargo, attachment, hibernation tuning, and a handful of Position/Health/Physics/Labels
 * entries the Ess tier never wrapped.
 *
 * Signature source of truth: the wiki reference page at docs/mercs2-luacd/wiki/namespaces/object.md (a
 * live pairs(Object) dump, 87 confirmed-real function names -- confirmed arguments only where the wiki
 * shows a real call site or a live WebSocket lua-bridge probe result; everything else is flagged
 * "unconfirmed" in this file's own node .desc strings, matching the wiki's own confidence notes verbatim
 * in spirit).
 *
 * DUPLICATE AVOIDANCE: every function already wrapped by src/nodes-object.js's Ess.Object.* nodes (addLabel,
 * removeLabel, hasLabel, alive, valid, damage, heal, kill, remove, revive, health, maxHealth, setHealth,
 * invincible, setInvincible, visible, setVisible, setPos, yaw, setYaw, distance, displayName, faceObject,
 * faceToward, snapToGround, disablePhysics, enablePhysics, heightAboveGround, impulse, playerControlled,
 * speed, speedSq, vehicleOf, spawn) is skipped here on purpose -- no native equivalent for those.
 *
 * SKIPPED ENTIRELY (not modeled as nodes, one line each):
 *   - GetAttachedObjects -- returns a table, doesn't fit this model's one-Lua-value-per-slot getters.
 *   - AddQualityRef / RemoveQualityRef -- AddQualityRef's return is a handle that RemoveQualityRef then
 *     consumes as its *only* arg (not a uGuid) -- a paired resource-handle lifecycle, not a fixed-shape call.
 *   - SetInfiniteAmmo -- ambiguous overlap with the already-covered Ess.Human.setInfiniteAmmo.
 *   - Remove -- duplicate of the already-covered Ess.Object.remove.
 *   - ApplyAngularImpulse / QueueAcceleration / BeginQueuedAcceleration -- the wiki's own signature for each
 *     is a bare "..." beyond the presumed leading uGuid; no real argument shape to build a node around.
 *   - GetPosition / SetPosition / GetYaw / SetYaw / GetDistanceFrom / GetHeightAboveTerrain /
 *     GetHardpointPosition / TransformLocalToWorld / GetHealth / SetHealth / GetMaxHealth / Kill / Revive /
 *     GetInvincible / SetInvincible / GetMass / GetVelocity / GetVelocityVector / GetVelocitySquared /
 *     ApplyImpulse / DisablePhysics / EnablePhysics / IsVisible / SetVisible / IsAlive / IsValid /
 *     IsPlayerControlled / AddLabel / RemoveLabel / HasLabel -- each either duplicates an existing Ess.Object
 *     node's coverage or is a multi-value getter (x, y, z with no single primary component) excluded by the
 *     same "one Lua value per output slot" rule nodes-object.js's own header documents for its skips.
 *
 * GUID INPUTS: same convention as nodes-object.js -- a "guid" here is a STRING data input carrying a Lua
 * SOURCE EXPRESSION, not a real string to quote (resolved via the local resolveRawInput helper below,
 * spliced unquoted). Every REQUIRED guid defaults to "Ess.Player.character(0)", this repo's universal
 * required-guid placeholder -- it works for every wrapped call here because a type mismatch just makes the
 * pcall wrapper no-op rather than crash. Plain (non-guid) strings -- an anim name, a channel, a label, a
 * hardpoint name -- are widget-only text properties wrapped with CodeGen.luaString, never wired data inputs,
 * matching nodes-object.js's sLabel/sReason treatment.
 *
 * MULTI-RETURN HANDLING: Attach returns bResult, uAttachedGuid; Detach and SetName each return one boolean.
 * All three are modeled as plain ACTION nodes that discard every return value, the same "fire and let the
 * return go" treatment nodes-object.js's own damage/spawn/snapToGround nodes already give their discarded
 * returns -- not skipped, just not wired to an output slot.
 */
(function () {
  "use strict";

  // Resolve a node's input slot exactly like CodeGen.resolveNumberInput does (wired value wins, else the
  // property default) but without any numeric assumption -- used for guid EXPRESSION inputs (spliced raw).
  // Same local twin every other nodes-*.js file in this repo keeps (see nodes-object.js's header for why
  // this isn't shared centrally through codegen.js).
  function resolveRawInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  // ============================================================
  // Position & Transform
  // ============================================================

  // native/object/setpositiontoobject -- Object.SetPositionToObject(uGuid, uTargetGuid, sHardpoint).
  function NativeObjectSetPositionToObject() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("target", "string");
    this.addProperty("target", "Ess.Player.character(0)");
    this.addWidget("text", "target", this.properties.target, function (v) { this.properties.target = v; }.bind(this));
    this.addProperty("sHardpoint", "HP_root");
    this.addWidget("text", "sHardpoint", this.properties.sHardpoint, function (v) { this.properties.sHardpoint = v; }.bind(this));
  }
  NativeObjectSetPositionToObject.title = "Set Position To Object";
  NativeObjectSetPositionToObject.desc = "Object.SetPositionToObject(uGuid, uTargetGuid, sHardpoint) -- unconfirmed, no call sites in the decompiled corpus (signature inferred only by analogy to the confirmed SetTransformToObject)";
  NativeObjectSetPositionToObject.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var target = resolveRawInput(this, 2, "target");
    var sHardpoint = CodeGen.luaString(this.properties.sHardpoint);
    CodeGen.emitNative("Object.SetPositionToObject(" + guid + ", " + target + ", " + sHardpoint + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/setpositiontoobject", NativeObjectSetPositionToObject);

  // native/object/settransformtoobject -- Object.SetTransformToObject(uGuid, uTargetGuid, sHardpoint).
  function NativeObjectSetTransformToObject() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("target", "string");
    this.addProperty("target", "Ess.Player.character(0)");
    this.addWidget("text", "target", this.properties.target, function (v) { this.properties.target = v; }.bind(this));
    this.addProperty("sHardpoint", "HP_root");
    this.addWidget("text", "sHardpoint", this.properties.sHardpoint, function (v) { this.properties.sHardpoint = v; }.bind(this));
  }
  NativeObjectSetTransformToObject.title = "Set Transform To Object";
  NativeObjectSetTransformToObject.desc = "Object.SetTransformToObject(uGuid, uTargetGuid, sHardpoint) -- confirmed in real scripts, both with and without the trailing hardpoint name";
  NativeObjectSetTransformToObject.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var target = resolveRawInput(this, 2, "target");
    var sHardpoint = CodeGen.luaString(this.properties.sHardpoint);
    CodeGen.emitNative("Object.SetTransformToObject(" + guid + ", " + target + ", " + sHardpoint + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/settransformtoobject", NativeObjectSetTransformToObject);

  // native/object/gethardpointyaw -- a PURE DATA node wrapping Object.GetHardpointYaw(uGuid, sHardpointName).
  function NativeObjectGetHardpointYaw() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sHardpointName", "HP_Turret");
    this.addWidget("text", "sHardpointName", this.properties.sHardpointName, function (v) { this.properties.sHardpointName = v; }.bind(this));
    this.addOutput("yaw", "number");
  }
  NativeObjectGetHardpointYaw.title = "Get Hardpoint Yaw";
  NativeObjectGetHardpointYaw.desc = "Object.GetHardpointYaw(uGuid, sHardpointName) -- live-probe confirmed, returns degrees; still no call sites in the decompiled corpus";
  NativeObjectGetHardpointYaw.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    var sHardpointName = CodeGen.luaString(this.properties.sHardpointName);
    this.setOutputData(0, "Object.GetHardpointYaw(" + guid + ", " + sHardpointName + ")");
  };
  LiteGraph.registerNodeType("native/object/gethardpointyaw", NativeObjectGetHardpointYaw);

  // native/object/gethardpointpitch -- a PURE DATA node wrapping Object.GetHardpointPitch(uGuid, sHardpointName).
  function NativeObjectGetHardpointPitch() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sHardpointName", "HP_Turret");
    this.addWidget("text", "sHardpointName", this.properties.sHardpointName, function (v) { this.properties.sHardpointName = v; }.bind(this));
    this.addOutput("pitch", "number");
  }
  NativeObjectGetHardpointPitch.title = "Get Hardpoint Pitch";
  NativeObjectGetHardpointPitch.desc = "Object.GetHardpointPitch(uGuid, sHardpointName) -- live-probe confirmed, returns degrees; still no call sites in the decompiled corpus";
  NativeObjectGetHardpointPitch.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    var sHardpointName = CodeGen.luaString(this.properties.sHardpointName);
    this.setOutputData(0, "Object.GetHardpointPitch(" + guid + ", " + sHardpointName + ")");
  };
  LiteGraph.registerNodeType("native/object/gethardpointpitch", NativeObjectGetHardpointPitch);

  // native/object/insideboundary -- a PURE DATA node wrapping Object.InsideBoundary(uGuid, uZoneGuid, bIgnoreY).
  function NativeObjectInsideBoundary() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("zoneGuid", "string");
    this.addProperty("zoneGuid", "Ess.Player.character(0)");
    this.addWidget("text", "zoneGuid", this.properties.zoneGuid, function (v) { this.properties.zoneGuid = v; }.bind(this));
    this.addProperty("bIgnoreY", false);
    this.addWidget("toggle", "bIgnoreY", this.properties.bIgnoreY, function (v) { this.properties.bIgnoreY = v; }.bind(this));
    this.addOutput("inside", "boolean");
  }
  NativeObjectInsideBoundary.title = "Inside Boundary";
  NativeObjectInsideBoundary.desc = "Object.InsideBoundary(uGuid, uZoneGuid, bIgnoreY) -- confirmed in real scripts, e.g. checking a character against a named region guid";
  NativeObjectInsideBoundary.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    var zoneGuid = resolveRawInput(this, 1, "zoneGuid");
    var bIgnoreY = this.properties.bIgnoreY ? "true" : "false";
    this.setOutputData(0, "Object.InsideBoundary(" + guid + ", " + zoneGuid + ", " + bIgnoreY + ")");
  };
  LiteGraph.registerNodeType("native/object/insideboundary", NativeObjectInsideBoundary);

  // native/object/outsideboundary -- a PURE DATA node wrapping Object.OutsideBoundary(uGuid, uZoneGuid). No
  // bIgnoreY on this one -- the wiki's confirmed real call site only ever passes 2 args, unlike InsideBoundary.
  function NativeObjectOutsideBoundary() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("zoneGuid", "string");
    this.addProperty("zoneGuid", "Ess.Player.character(0)");
    this.addWidget("text", "zoneGuid", this.properties.zoneGuid, function (v) { this.properties.zoneGuid = v; }.bind(this));
    this.addOutput("outside", "boolean");
  }
  NativeObjectOutsideBoundary.title = "Outside Boundary";
  NativeObjectOutsideBoundary.desc = "Object.OutsideBoundary(uGuid, uZoneGuid) -- confirmed in real scripts";
  NativeObjectOutsideBoundary.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    var zoneGuid = resolveRawInput(this, 1, "zoneGuid");
    this.setOutputData(0, "Object.OutsideBoundary(" + guid + ", " + zoneGuid + ")");
  };
  LiteGraph.registerNodeType("native/object/outsideboundary", NativeObjectOutsideBoundary);

  // ============================================================
  // Health & Damage
  // ============================================================

  // native/object/getnodehealth -- a PURE DATA node wrapping Object.GetNodeHealth(uGuid, sNodeName).
  function NativeObjectGetNodeHealth() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sNodeName", "Engine");
    this.addWidget("text", "sNodeName", this.properties.sNodeName, function (v) { this.properties.sNodeName = v; }.bind(this));
    this.addOutput("health", "number");
  }
  NativeObjectGetNodeHealth.title = "Get Node Health";
  NativeObjectGetNodeHealth.desc = "Object.GetNodeHealth(uGuid, sNodeName) -- confirmed in real scripts, for destructible sub-parts";
  NativeObjectGetNodeHealth.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    var sNodeName = CodeGen.luaString(this.properties.sNodeName);
    this.setOutputData(0, "Object.GetNodeHealth(" + guid + ", " + sNodeName + ")");
  };
  LiteGraph.registerNodeType("native/object/getnodehealth", NativeObjectGetNodeHealth);

  // native/object/setunkillable -- Object.SetUnkillable(uGuid, bUnkillable, sReason), same shape as the
  // already-covered Ess.Object.setInvincible.
  function NativeObjectSetUnkillable() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bUnkillable", true);
    this.addWidget("toggle", "bUnkillable", this.properties.bUnkillable, function (v) { this.properties.bUnkillable = v; }.bind(this));
    this.addProperty("sReason", "Support");
    this.addWidget("text", "sReason", this.properties.sReason, function (v) { this.properties.sReason = v; }.bind(this));
  }
  NativeObjectSetUnkillable.title = "Set Unkillable";
  NativeObjectSetUnkillable.desc = "Object.SetUnkillable(uGuid, bUnkillable, sReason) -- confirmed in real scripts, same shape as SetInvincible";
  NativeObjectSetUnkillable.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var bUnkillable = this.properties.bUnkillable ? "true" : "false";
    var sReason = CodeGen.luaString(this.properties.sReason);
    CodeGen.emitNative("Object.SetUnkillable(" + guid + ", " + bUnkillable + ", " + sReason + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/setunkillable", NativeObjectSetUnkillable);

  // native/object/getcashvalue -- a PURE DATA node wrapping Object.GetCashValue(uGuid).
  function NativeObjectGetCashValue() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("cashValue", "number");
  }
  NativeObjectGetCashValue.title = "Get Cash Value";
  NativeObjectGetCashValue.desc = "Object.GetCashValue(uGuid) -- confirmed in real scripts, e.g. a collectible's cash reward";
  NativeObjectGetCashValue.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.GetCashValue(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/getcashvalue", NativeObjectGetCashValue);

  // ============================================================
  // Physics & Impulses
  // ============================================================

  // native/object/getphysicstype -- a PURE DATA node wrapping Object.GetPhysicsType(uGuid). Output typed as
  // "string" only as a UI hint -- the return TYPE itself is unconfirmed (could just as easily be a number),
  // see the desc below.
  function NativeObjectGetPhysicsType() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("physicsType", "string");
  }
  NativeObjectGetPhysicsType.title = "Get Physics Type";
  NativeObjectGetPhysicsType.desc = "Object.GetPhysicsType(uGuid) -- unconfirmed, no call sites in the decompiled corpus; even the return type is unknown, treat the output as opaque debug info only";
  NativeObjectGetPhysicsType.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.GetPhysicsType(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/getphysicstype", NativeObjectGetPhysicsType);

  // native/object/setmass -- Object.SetMass(uGuid, nMass).
  function NativeObjectSetMass() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nMass", "number");
    this.addProperty("nMass", 100);
    this.addWidget("number", "nMass", this.properties.nMass, function (v) { this.properties.nMass = v; }.bind(this));
  }
  NativeObjectSetMass.title = "Set Mass";
  NativeObjectSetMass.desc = "Object.SetMass(uGuid, nMass) -- unconfirmed, no call sites in the decompiled corpus";
  NativeObjectSetMass.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var nMass = CodeGen.resolveNumberInput(this, 2, "nMass");
    CodeGen.emitNative("Object.SetMass(" + guid + ", " + nMass + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/setmass", NativeObjectSetMass);

  // native/object/applypointimpulse -- Object.ApplyPointImpulse(uGuid, nX, nY, nZ, nPX, nPY, nPZ, bFlag).
  // Confirmed with 6 numeric args + trailing boolean in real scripts; exact meaning of each component past
  // "impulse vector + application-point offset" is unconfirmed per the wiki's own note.
  function NativeObjectApplyPointImpulse() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nX", "number");
    this.addProperty("nX", 0);
    this.addWidget("number", "nX", this.properties.nX, function (v) { this.properties.nX = v; }.bind(this));
    this.addInput("nY", "number");
    this.addProperty("nY", 1000);
    this.addWidget("number", "nY", this.properties.nY, function (v) { this.properties.nY = v; }.bind(this));
    this.addInput("nZ", "number");
    this.addProperty("nZ", 0);
    this.addWidget("number", "nZ", this.properties.nZ, function (v) { this.properties.nZ = v; }.bind(this));
    this.addInput("nPX", "number");
    this.addProperty("nPX", 0);
    this.addWidget("number", "nPX", this.properties.nPX, function (v) { this.properties.nPX = v; }.bind(this));
    this.addInput("nPY", "number");
    this.addProperty("nPY", 0);
    this.addWidget("number", "nPY", this.properties.nPY, function (v) { this.properties.nPY = v; }.bind(this));
    this.addInput("nPZ", "number");
    this.addProperty("nPZ", 0);
    this.addWidget("number", "nPZ", this.properties.nPZ, function (v) { this.properties.nPZ = v; }.bind(this));
    this.addProperty("bFlag", true);
    this.addWidget("toggle", "bFlag", this.properties.bFlag, function (v) { this.properties.bFlag = v; }.bind(this));
  }
  NativeObjectApplyPointImpulse.title = "Apply Point Impulse";
  NativeObjectApplyPointImpulse.desc = "Object.ApplyPointImpulse(uGuid, nX, nY, nZ, nPX, nPY, nPZ, bFlag) -- confirmed in real scripts; impulse vector + application-point offset, exact meaning of each component unconfirmed";
  NativeObjectApplyPointImpulse.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var nX = CodeGen.resolveNumberInput(this, 2, "nX");
    var nY = CodeGen.resolveNumberInput(this, 3, "nY");
    var nZ = CodeGen.resolveNumberInput(this, 4, "nZ");
    var nPX = CodeGen.resolveNumberInput(this, 5, "nPX");
    var nPY = CodeGen.resolveNumberInput(this, 6, "nPY");
    var nPZ = CodeGen.resolveNumberInput(this, 7, "nPZ");
    var bFlag = this.properties.bFlag ? "true" : "false";
    CodeGen.emitNative("Object.ApplyPointImpulse(" + guid + ", " + nX + ", " + nY + ", " + nZ + ", " + nPX + ", " + nPY + ", " + nPZ + ", " + bFlag + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/applypointimpulse", NativeObjectApplyPointImpulse);

  // ============================================================
  // Animation
  // ============================================================

  // native/object/playanimation -- Object.PlayAnimation(uGuid, sAnimName, bLoop, sChannel, nBlendTime, bFlag).
  function NativeObjectPlayAnimation() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sAnimName", "idle");
    this.addWidget("text", "sAnimName", this.properties.sAnimName, function (v) { this.properties.sAnimName = v; }.bind(this));
    this.addProperty("bLoop", false);
    this.addWidget("toggle", "bLoop", this.properties.bLoop, function (v) { this.properties.bLoop = v; }.bind(this));
    this.addProperty("sChannel", "main");
    this.addWidget("text", "sChannel", this.properties.sChannel, function (v) { this.properties.sChannel = v; }.bind(this));
    this.addInput("nBlendTime", "number");
    this.addProperty("nBlendTime", 0.25);
    this.addWidget("number", "nBlendTime", this.properties.nBlendTime, function (v) { this.properties.nBlendTime = v; }.bind(this));
    this.addProperty("bFlag", true);
    this.addWidget("toggle", "bFlag", this.properties.bFlag, function (v) { this.properties.bFlag = v; }.bind(this));
  }
  NativeObjectPlayAnimation.title = "Play Animation";
  NativeObjectPlayAnimation.desc = "Object.PlayAnimation(uGuid, sAnimName, bLoop, sChannel, nBlendTime, bFlag) -- confirmed with all 6 args in real scripts";
  NativeObjectPlayAnimation.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sAnimName = CodeGen.luaString(this.properties.sAnimName);
    var bLoop = this.properties.bLoop ? "true" : "false";
    var sChannel = CodeGen.luaString(this.properties.sChannel);
    var nBlendTime = CodeGen.resolveNumberInput(this, 2, "nBlendTime");
    var bFlag = this.properties.bFlag ? "true" : "false";
    CodeGen.emitNative("Object.PlayAnimation(" + guid + ", " + sAnimName + ", " + bLoop + ", " + sChannel + ", " + nBlendTime + ", " + bFlag + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/playanimation", NativeObjectPlayAnimation);

  // native/object/stopanimation -- Object.StopAnimation(uGuid, sAnimName).
  function NativeObjectStopAnimation() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sAnimName", "");
    this.addWidget("text", "sAnimName", this.properties.sAnimName, function (v) { this.properties.sAnimName = v; }.bind(this));
  }
  NativeObjectStopAnimation.title = "Stop Animation";
  NativeObjectStopAnimation.desc = "Object.StopAnimation(uGuid, sAnimName) -- unconfirmed, no call sites in the decompiled corpus";
  NativeObjectStopAnimation.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sAnimName = CodeGen.luaString(this.properties.sAnimName);
    CodeGen.emitNative("Object.StopAnimation(" + guid + ", " + sAnimName + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/stopanimation", NativeObjectStopAnimation);

  // native/object/stopanimationchannel -- Object.StopAnimationChannel(uGuid, sChannel).
  function NativeObjectStopAnimationChannel() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sChannel", "hijack");
    this.addWidget("text", "sChannel", this.properties.sChannel, function (v) { this.properties.sChannel = v; }.bind(this));
  }
  NativeObjectStopAnimationChannel.title = "Stop Animation Channel";
  NativeObjectStopAnimationChannel.desc = "Object.StopAnimationChannel(uGuid, sChannel) -- confirmed in real scripts, matches the channel argument seen in PlayAnimation";
  NativeObjectStopAnimationChannel.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sChannel = CodeGen.luaString(this.properties.sChannel);
    CodeGen.emitNative("Object.StopAnimationChannel(" + guid + ", " + sChannel + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/stopanimationchannel", NativeObjectStopAnimationChannel);

  // native/object/stopallanimation -- Object.StopAllAnimation(uGuid).
  function NativeObjectStopAllAnimation() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  NativeObjectStopAllAnimation.title = "Stop All Animation";
  NativeObjectStopAllAnimation.desc = "Object.StopAllAnimation(uGuid) -- confirmed in real scripts";
  NativeObjectStopAllAnimation.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emitNative("Object.StopAllAnimation(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/stopallanimation", NativeObjectStopAllAnimation);

  // native/object/playmaterialanimation -- Object.PlayMaterialAnimation(uGuid, sAnimName, bLoop).
  function NativeObjectPlayMaterialAnimation() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sAnimName", "global_gpsjammer_anim");
    this.addWidget("text", "sAnimName", this.properties.sAnimName, function (v) { this.properties.sAnimName = v; }.bind(this));
    this.addProperty("bLoop", true);
    this.addWidget("toggle", "bLoop", this.properties.bLoop, function (v) { this.properties.bLoop = v; }.bind(this));
  }
  NativeObjectPlayMaterialAnimation.title = "Play Material Animation";
  NativeObjectPlayMaterialAnimation.desc = "Object.PlayMaterialAnimation(uGuid, sAnimName, bLoop) -- confirmed in real scripts";
  NativeObjectPlayMaterialAnimation.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sAnimName = CodeGen.luaString(this.properties.sAnimName);
    var bLoop = this.properties.bLoop ? "true" : "false";
    CodeGen.emitNative("Object.PlayMaterialAnimation(" + guid + ", " + sAnimName + ", " + bLoop + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/playmaterialanimation", NativeObjectPlayMaterialAnimation);

  // native/object/stopmaterialanimation -- Object.StopMaterialAnimation(uGuid, sAnimName).
  function NativeObjectStopMaterialAnimation() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sAnimName", "global_weapon_beacon");
    this.addWidget("text", "sAnimName", this.properties.sAnimName, function (v) { this.properties.sAnimName = v; }.bind(this));
  }
  NativeObjectStopMaterialAnimation.title = "Stop Material Animation";
  NativeObjectStopMaterialAnimation.desc = "Object.StopMaterialAnimation(uGuid, sAnimName) -- confirmed in real scripts";
  NativeObjectStopMaterialAnimation.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sAnimName = CodeGen.luaString(this.properties.sAnimName);
    CodeGen.emitNative("Object.StopMaterialAnimation(" + guid + ", " + sAnimName + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/stopmaterialanimation", NativeObjectStopMaterialAnimation);

  // ============================================================
  // Winch & Cargo
  // ============================================================

  // native/object/haswinch -- a PURE DATA node wrapping Object.HasWinch(uGuid).
  function NativeObjectHasWinch() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("hasWinch", "boolean");
  }
  NativeObjectHasWinch.title = "Has Winch";
  NativeObjectHasWinch.desc = "Object.HasWinch(uGuid) -- live-probe confirmed boolean; still no call sites in the decompiled corpus";
  NativeObjectHasWinch.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.HasWinch(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/haswinch", NativeObjectHasWinch);

  // native/object/getwinchstate -- a PURE DATA node wrapping Object.GetWinchState(uGuid). Returns nil on a
  // non-winch object (confirmed, not a bug); the shape on a real winch object is inferred (presumably a
  // string state like SetWinchState's "deployed"), not confirmed.
  function NativeObjectGetWinchState() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("state", "string");
  }
  NativeObjectGetWinchState.title = "Get Winch State";
  NativeObjectGetWinchState.desc = "Object.GetWinchState(uGuid) -- live-probe confirmed nil on non-winch objects; return shape on a real winch object is inferred (presumably a string state), not confirmed";
  NativeObjectGetWinchState.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.GetWinchState(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/getwinchstate", NativeObjectGetWinchState);

  // native/object/setwinchstate -- Object.SetWinchState(uGuid, sState).
  function NativeObjectSetWinchState() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sState", "deployed");
    this.addWidget("text", "sState", this.properties.sState, function (v) { this.properties.sState = v; }.bind(this));
  }
  NativeObjectSetWinchState.title = "Set Winch State";
  NativeObjectSetWinchState.desc = "Object.SetWinchState(uGuid, sState) -- confirmed in real scripts, always seen with the state 'deployed'";
  NativeObjectSetWinchState.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sState = CodeGen.luaString(this.properties.sState);
    CodeGen.emitNative("Object.SetWinchState(" + guid + ", " + sState + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/setwinchstate", NativeObjectSetWinchState);

  // native/object/attachcargotowinch -- Object.AttachCargoToWinch(uCargo, uHeli). Cargo guid first, then the
  // winching vehicle guid -- confirmed argument order.
  function NativeObjectAttachCargoToWinch() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("cargoGuid", "string");
    this.addProperty("cargoGuid", "Ess.Player.character(0)");
    this.addWidget("text", "cargoGuid", this.properties.cargoGuid, function (v) { this.properties.cargoGuid = v; }.bind(this));
    this.addInput("heliGuid", "string");
    this.addProperty("heliGuid", "Ess.Player.character(0)");
    this.addWidget("text", "heliGuid", this.properties.heliGuid, function (v) { this.properties.heliGuid = v; }.bind(this));
  }
  NativeObjectAttachCargoToWinch.title = "Attach Cargo To Winch";
  NativeObjectAttachCargoToWinch.desc = "Object.AttachCargoToWinch(uCargo, uHeli) -- confirmed in real scripts, cargo guid first then the winching vehicle guid";
  NativeObjectAttachCargoToWinch.prototype.onAction = function () {
    var cargoGuid = resolveRawInput(this, 1, "cargoGuid");   // input 0 is "exec"
    var heliGuid = resolveRawInput(this, 2, "heliGuid");
    CodeGen.emitNative("Object.AttachCargoToWinch(" + cargoGuid + ", " + heliGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/attachcargotowinch", NativeObjectAttachCargoToWinch);

  // native/object/detachcargofromwinch -- Object.DetachCargoFromWinch(uHeli), the winching vehicle guid only.
  function NativeObjectDetachCargoFromWinch() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("heliGuid", "string");
    this.addProperty("heliGuid", "Ess.Player.character(0)");
    this.addWidget("text", "heliGuid", this.properties.heliGuid, function (v) { this.properties.heliGuid = v; }.bind(this));
  }
  NativeObjectDetachCargoFromWinch.title = "Detach Cargo From Winch";
  NativeObjectDetachCargoFromWinch.desc = "Object.DetachCargoFromWinch(uHeli) -- confirmed in real scripts, takes the winching vehicle guid";
  NativeObjectDetachCargoFromWinch.prototype.onAction = function () {
    var heliGuid = resolveRawInput(this, 1, "heliGuid");   // input 0 is "exec"
    CodeGen.emitNative("Object.DetachCargoFromWinch(" + heliGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/detachcargofromwinch", NativeObjectDetachCargoFromWinch);

  // native/object/iswinched -- a PURE DATA node wrapping Object.IsWinched(uGuid).
  function NativeObjectIsWinched() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("isWinched", "boolean");
  }
  NativeObjectIsWinched.title = "Is Winched";
  NativeObjectIsWinched.desc = "Object.IsWinched(uGuid) -- confirmed in real scripts";
  NativeObjectIsWinched.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.IsWinched(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/iswinched", NativeObjectIsWinched);

  // native/object/iswinching -- a PURE DATA node wrapping Object.IsWinching(uGuid). Returns nil on a
  // non-winch object (confirmed, not a bug); presumed boolean on a real winch object per the Is* naming
  // convention every other confirmed boolean getter on this namespace follows.
  function NativeObjectIsWinching() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("isWinching", "boolean");
  }
  NativeObjectIsWinching.title = "Is Winching";
  NativeObjectIsWinching.desc = "Object.IsWinching(uGuid) -- live-probe confirmed returns nil on non-winch objects (expected, not a bug); presumed boolean on a real winch object";
  NativeObjectIsWinching.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.IsWinching(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/iswinching", NativeObjectIsWinching);

  // ============================================================
  // Attachment
  // ============================================================

  // native/object/attach -- Object.Attach(uParentGuid, sHardpoint, uChildGuid) -> bResult, uAttachedGuid.
  // Confirmed in real scripts. bResult is discarded (same "let it go" treatment nodes-object.js's own
  // damage/spawn/snapToGround nodes already give their discarded returns, see this file's own header
  // comment), but uAttachedGuid is a real, useful handle -- captured as the "guid" output. NOT via
  // CodeGen.emitNativeCapture: that helper only destructures a single value out of pcall
  // (`local okVar, varName = pcall(...)`), which here would grab the boring bResult and silently drop
  // uAttachedGuid. Instead this hand-writes a 3-value pcall capture that mirrors emitNativeCapture's own
  // "nil on failure" shape (see codegen.js's emitNativeCapture).
  function NativeObjectAttach() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("parentGuid", "string");
    this.addProperty("parentGuid", "Ess.Player.character(0)");
    this.addWidget("text", "parentGuid", this.properties.parentGuid, function (v) { this.properties.parentGuid = v; }.bind(this));
    this.addProperty("sHardpoint", "HP_root");
    this.addWidget("text", "sHardpoint", this.properties.sHardpoint, function (v) { this.properties.sHardpoint = v; }.bind(this));
    this.addInput("childGuid", "string");
    this.addProperty("childGuid", "Ess.Player.character(0)");
    this.addWidget("text", "childGuid", this.properties.childGuid, function (v) { this.properties.childGuid = v; }.bind(this));
    this.addOutput("guid", "string");
  }
  NativeObjectAttach.title = "Attach";
  NativeObjectAttach.desc = "Object.Attach(uParentGuid, sHardpoint, uChildGuid) -- confirmed in real scripts, bResult discarded -> guid";
  NativeObjectAttach.prototype.onAction = function () {
    var parentGuid = resolveRawInput(this, 1, "parentGuid");   // input 0 is "exec"
    var sHardpoint = CodeGen.luaString(this.properties.sHardpoint);
    var childGuid = resolveRawInput(this, 2, "childGuid");
    var expr = "Object.Attach(" + parentGuid + ", " + sHardpoint + ", " + childGuid + ")";
    var okVar = CodeGen.newLocal("ok");
    var guidVar = CodeGen.newLocal("attach");
    CodeGen.emit("local " + okVar + ", _, " + guidVar + " = pcall(function() return " + expr + " end)");
    CodeGen.emit("if not " + okVar + " then " + guidVar + " = nil end");
    this.setOutputData(1, guidVar);   // "guid" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/attach", NativeObjectAttach);

  // native/object/detach -- Object.Detach(uParentGuid, uChildOrAttachmentGuid) -> bResult, discarded here.
  function NativeObjectDetach() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("parentGuid", "string");
    this.addProperty("parentGuid", "Ess.Player.character(0)");
    this.addWidget("text", "parentGuid", this.properties.parentGuid, function (v) { this.properties.parentGuid = v; }.bind(this));
    this.addInput("childOrAttachmentGuid", "string");
    this.addProperty("childOrAttachmentGuid", "Ess.Player.character(0)");
    this.addWidget("text", "childOrAttachmentGuid", this.properties.childOrAttachmentGuid, function (v) { this.properties.childOrAttachmentGuid = v; }.bind(this));
  }
  NativeObjectDetach.title = "Detach";
  NativeObjectDetach.desc = "Object.Detach(uParentGuid, uChildOrAttachmentGuid) -- confirmed in real scripts, returns bResult, discarded here";
  NativeObjectDetach.prototype.onAction = function () {
    var parentGuid = resolveRawInput(this, 1, "parentGuid");   // input 0 is "exec"
    var childOrAttachmentGuid = resolveRawInput(this, 2, "childOrAttachmentGuid");
    CodeGen.emitNative("Object.Detach(" + parentGuid + ", " + childOrAttachmentGuid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/detach", NativeObjectDetach);

  // native/object/isattached -- a PURE DATA node wrapping Object.IsAttached(uGuidA, uGuidB).
  function NativeObjectIsAttached() {
    this.addInput("guidA", "string");
    this.addProperty("guidA", "Ess.Player.character(0)");
    this.addWidget("text", "guidA", this.properties.guidA, function (v) { this.properties.guidA = v; }.bind(this));
    this.addInput("guidB", "string");
    this.addProperty("guidB", "Ess.Player.character(0)");
    this.addWidget("text", "guidB", this.properties.guidB, function (v) { this.properties.guidB = v; }.bind(this));
    this.addOutput("isAttached", "boolean");
  }
  NativeObjectIsAttached.title = "Is Attached";
  NativeObjectIsAttached.desc = "Object.IsAttached(uGuidA, uGuidB) -- confirmed in real scripts";
  NativeObjectIsAttached.prototype.onExecute = function () {
    var guidA = resolveRawInput(this, 0, "guidA");
    var guidB = resolveRawInput(this, 1, "guidB");
    this.setOutputData(0, "Object.IsAttached(" + guidA + ", " + guidB + ")");
  };
  LiteGraph.registerNodeType("native/object/isattached", NativeObjectIsAttached);

  // native/object/getparent -- a PURE DATA node wrapping Object.GetParent(uGuid).
  function NativeObjectGetParent() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("parent", "string");
  }
  NativeObjectGetParent.title = "Get Parent";
  NativeObjectGetParent.desc = "Object.GetParent(uGuid) -- confirmed in real scripts, very common for walking an attachment/ownership chain";
  NativeObjectGetParent.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.GetParent(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/getparent", NativeObjectGetParent);

  // ============================================================
  // Labels & Metadata
  // ============================================================

  // native/object/getname -- a PURE DATA node wrapping Object.GetName(uGuid). Internal/debug name, distinct
  // from the localized display name (GetLocalizedName below).
  function NativeObjectGetName() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("name", "string");
  }
  NativeObjectGetName.title = "Get Name";
  NativeObjectGetName.desc = "Object.GetName(uGuid) -- confirmed in real scripts, internal/debug name (contrast with GetLocalizedName)";
  NativeObjectGetName.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.GetName(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/getname", NativeObjectGetName);

  // native/object/setname -- Object.SetName(uGuid, sName) -> bSuccess, discarded here.
  function NativeObjectSetName() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sName", "MyObject");
    this.addWidget("text", "sName", this.properties.sName, function (v) { this.properties.sName = v; }.bind(this));
  }
  NativeObjectSetName.title = "Set Name";
  NativeObjectSetName.desc = "Object.SetName(uGuid, sName) -- confirmed in real scripts, returns a success boolean, discarded here";
  NativeObjectSetName.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sName = CodeGen.luaString(this.properties.sName);
    CodeGen.emitNative("Object.SetName(" + guid + ", " + sName + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/setname", NativeObjectSetName);

  // native/object/getlocalizedname -- a PURE DATA node wrapping Object.GetLocalizedName(uGuid, bFlag). Very
  // common in real scripts for HUD/display text; the trailing boolean is seen at one call site but its
  // meaning is unconfirmed, so bFlag defaults false to approximate the common no-flag call.
  function NativeObjectGetLocalizedName() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bFlag", false);
    this.addWidget("toggle", "bFlag", this.properties.bFlag, function (v) { this.properties.bFlag = v; }.bind(this));
    this.addOutput("localizedName", "string");
  }
  NativeObjectGetLocalizedName.title = "Get Localized Name";
  NativeObjectGetLocalizedName.desc = "Object.GetLocalizedName(uGuid, bFlag) -- very common in real scripts for HUD/display text; the trailing boolean's meaning is unconfirmed";
  NativeObjectGetLocalizedName.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    var bFlag = this.properties.bFlag ? "true" : "false";
    this.setOutputData(0, "Object.GetLocalizedName(" + guid + ", " + bFlag + ")");
  };
  LiteGraph.registerNodeType("native/object/getlocalizedname", NativeObjectGetLocalizedName);

  // native/object/getmodelname -- a PURE DATA node wrapping Object.GetModelName(uGuid). Live-probe confirmed
  // gotcha: returns userdata (an opaque model name-hash handle), NOT a real string, despite the "string"
  // output slot here -- that slot type is only a UI hint, same as every guid-carrying "string" slot in this
  // repo. Don't expect string concatenation or string.* calls to work on this node's output.
  function NativeObjectGetModelName() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("modelName", "string");
  }
  NativeObjectGetModelName.title = "Get Model Name";
  NativeObjectGetModelName.desc = "Object.GetModelName(uGuid) -- live-probe confirmed to return userdata (an opaque model name-hash handle), NOT a real string despite the output slot -- don't expect string ops to work on it";
  NativeObjectGetModelName.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.GetModelName(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/getmodelname", NativeObjectGetModelName);

  // native/object/setmodelname -- Object.SetModelName(uGuid, sModelName).
  function NativeObjectSetModelName() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sModelName", "Veyron");
    this.addWidget("text", "sModelName", this.properties.sModelName, function (v) { this.properties.sModelName = v; }.bind(this));
  }
  NativeObjectSetModelName.title = "Set Model Name";
  NativeObjectSetModelName.desc = "Object.SetModelName(uGuid, sModelName) -- confirmed in real scripts";
  NativeObjectSetModelName.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sModelName = CodeGen.luaString(this.properties.sModelName);
    CodeGen.emitNative("Object.SetModelName(" + guid + ", " + sModelName + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/setmodelname", NativeObjectSetModelName);

  // native/object/areequal -- a PURE DATA node wrapping Object.AreEqual(uGuidA, uGuidB).
  function NativeObjectAreEqual() {
    this.addInput("guidA", "string");
    this.addProperty("guidA", "Ess.Player.character(0)");
    this.addWidget("text", "guidA", this.properties.guidA, function (v) { this.properties.guidA = v; }.bind(this));
    this.addInput("guidB", "string");
    this.addProperty("guidB", "Ess.Player.character(0)");
    this.addWidget("text", "guidB", this.properties.guidB, function (v) { this.properties.guidB = v; }.bind(this));
    this.addOutput("areEqual", "boolean");
  }
  NativeObjectAreEqual.title = "Are Equal";
  NativeObjectAreEqual.desc = "Object.AreEqual(uGuidA, uGuidB) -- live-probe confirmed boolean; still no call sites in the decompiled corpus";
  NativeObjectAreEqual.prototype.onExecute = function () {
    var guidA = resolveRawInput(this, 0, "guidA");
    var guidB = resolveRawInput(this, 1, "guidB");
    this.setOutputData(0, "Object.AreEqual(" + guidA + ", " + guidB + ")");
  };
  LiteGraph.registerNodeType("native/object/areequal", NativeObjectAreEqual);

  // ============================================================
  // Visibility & State
  // ============================================================

  // native/object/isawake -- a PURE DATA node wrapping Object.IsAwake(uGuid).
  function NativeObjectIsAwake() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("isAwake", "boolean");
  }
  NativeObjectIsAwake.title = "Is Awake";
  NativeObjectIsAwake.desc = "Object.IsAwake(uGuid) -- confirmed in real scripts, related to the hibernation/streaming system";
  NativeObjectIsAwake.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.IsAwake(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/isawake", NativeObjectIsAwake);

  // native/object/ishibernated -- a PURE DATA node wrapping Object.IsHibernated(uGuid).
  function NativeObjectIsHibernated() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("isHibernated", "boolean");
  }
  NativeObjectIsHibernated.title = "Is Hibernated";
  NativeObjectIsHibernated.desc = "Object.IsHibernated(uGuid) -- confirmed in real scripts";
  NativeObjectIsHibernated.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.IsHibernated(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/ishibernated", NativeObjectIsHibernated);

  // native/object/gethibernationdistance -- a PURE DATA node wrapping Object.GetHibernationDistance(uGuid).
  function NativeObjectGetHibernationDistance() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("distance", "number");
  }
  NativeObjectGetHibernationDistance.title = "Get Hibernation Distance";
  NativeObjectGetHibernationDistance.desc = "Object.GetHibernationDistance(uGuid) -- confirmed in real scripts";
  NativeObjectGetHibernationDistance.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.GetHibernationDistance(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/gethibernationdistance", NativeObjectGetHibernationDistance);

  // native/object/sethibernationdistance -- Object.SetHibernationDistance(uGuid, nDistance). Unconfirmed, no
  // call sites -- presumed pair of the confirmed GetHibernationDistance / RevertHibernationDistance.
  function NativeObjectSetHibernationDistance() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nDistance", "number");
    this.addProperty("nDistance", 100);
    this.addWidget("number", "nDistance", this.properties.nDistance, function (v) { this.properties.nDistance = v; }.bind(this));
  }
  NativeObjectSetHibernationDistance.title = "Set Hibernation Distance";
  NativeObjectSetHibernationDistance.desc = "Object.SetHibernationDistance(uGuid, nDistance) -- unconfirmed, no call sites in the decompiled corpus; presumed pair of the confirmed GetHibernationDistance/RevertHibernationDistance";
  NativeObjectSetHibernationDistance.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var nDistance = CodeGen.resolveNumberInput(this, 2, "nDistance");
    CodeGen.emitNative("Object.SetHibernationDistance(" + guid + ", " + nDistance + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/sethibernationdistance", NativeObjectSetHibernationDistance);

  // native/object/reverthibernationdistance -- Object.RevertHibernationDistance(uGuid). Unconfirmed, no call
  // sites in the decompiled corpus.
  function NativeObjectRevertHibernationDistance() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  NativeObjectRevertHibernationDistance.title = "Revert Hibernation Distance";
  NativeObjectRevertHibernationDistance.desc = "Object.RevertHibernationDistance(uGuid) -- unconfirmed, no call sites in the decompiled corpus";
  NativeObjectRevertHibernationDistance.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emitNative("Object.RevertHibernationDistance(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/reverthibernationdistance", NativeObjectRevertHibernationDistance);

  // native/object/istemplate -- a PURE DATA node wrapping Object.IsTemplate(uGuid).
  function NativeObjectIsTemplate() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("isTemplate", "boolean");
  }
  NativeObjectIsTemplate.title = "Is Template";
  NativeObjectIsTemplate.desc = "Object.IsTemplate(uGuid) -- confirmed in real scripts";
  NativeObjectIsTemplate.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.IsTemplate(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/istemplate", NativeObjectIsTemplate);

  // native/object/isdisguised -- a PURE DATA node wrapping Object.IsDisguised(uGuid).
  function NativeObjectIsDisguised() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("isDisguised", "boolean");
  }
  NativeObjectIsDisguised.title = "Is Disguised";
  NativeObjectIsDisguised.desc = "Object.IsDisguised(uGuid) -- confirmed in real scripts";
  NativeObjectIsDisguised.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.IsDisguised(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/isdisguised", NativeObjectIsDisguised);

  // native/object/inseat -- a PURE DATA node wrapping Object.InSeat(uGuid) -> uVehicleGuid, treated as a
  // vehicle handle at real call sites.
  function NativeObjectInSeat() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("vehicle", "string");
  }
  NativeObjectInSeat.title = "In Seat";
  NativeObjectInSeat.desc = "Object.InSeat(uGuid) -- confirmed in real scripts, return value treated as a vehicle handle at the call site";
  NativeObjectInSeat.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.InSeat(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/inseat", NativeObjectInSeat);

  // native/object/invehicle -- a PURE DATA node wrapping Object.InVehicle(uGuid) -> uVehicleGuid.
  function NativeObjectInVehicle() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("vehicle", "string");
  }
  NativeObjectInVehicle.title = "In Vehicle";
  NativeObjectInVehicle.desc = "Object.InVehicle(uGuid) -- confirmed in real scripts";
  NativeObjectInVehicle.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Object.InVehicle(" + guid + ")");
  };
  LiteGraph.registerNodeType("native/object/invehicle", NativeObjectInVehicle);

  // native/object/fadeout -- Object.FadeOut(uGuid, nDuration, bFlag).
  function NativeObjectFadeOut() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nDuration", "number");
    this.addProperty("nDuration", 0.2);
    this.addWidget("number", "nDuration", this.properties.nDuration, function (v) { this.properties.nDuration = v; }.bind(this));
    this.addProperty("bFlag", true);
    this.addWidget("toggle", "bFlag", this.properties.bFlag, function (v) { this.properties.bFlag = v; }.bind(this));
  }
  NativeObjectFadeOut.title = "Fade Out";
  NativeObjectFadeOut.desc = "Object.FadeOut(uGuid, nDuration, bFlag) -- confirmed with all 3 args in real scripts";
  NativeObjectFadeOut.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var nDuration = CodeGen.resolveNumberInput(this, 2, "nDuration");
    var bFlag = this.properties.bFlag ? "true" : "false";
    CodeGen.emitNative("Object.FadeOut(" + guid + ", " + nDuration + ", " + bFlag + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/fadeout", NativeObjectFadeOut);

  // ============================================================
  // Object Lifecycle
  // ============================================================

  // native/object/addtodisposer -- Object.AddToDisposer(uGuid, sCategory).
  function NativeObjectAddToDisposer() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sCategory", "Vehicle");
    this.addWidget("text", "sCategory", this.properties.sCategory, function (v) { this.properties.sCategory = v; }.bind(this));
  }
  NativeObjectAddToDisposer.title = "Add To Disposer";
  NativeObjectAddToDisposer.desc = "Object.AddToDisposer(uGuid, sCategory) -- confirmed in real scripts";
  NativeObjectAddToDisposer.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sCategory = CodeGen.luaString(this.properties.sCategory);
    CodeGen.emitNative("Object.AddToDisposer(" + guid + ", " + sCategory + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/addtodisposer", NativeObjectAddToDisposer);

  // native/object/removefromdisposer -- Object.RemoveFromDisposer(uGuid). Unconfirmed, no call sites --
  // presumed counterpart to the confirmed AddToDisposer.
  function NativeObjectRemoveFromDisposer() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  NativeObjectRemoveFromDisposer.title = "Remove From Disposer";
  NativeObjectRemoveFromDisposer.desc = "Object.RemoveFromDisposer(uGuid) -- unconfirmed, no call sites in the decompiled corpus; presumed counterpart to the confirmed AddToDisposer";
  NativeObjectRemoveFromDisposer.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emitNative("Object.RemoveFromDisposer(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/removefromdisposer", NativeObjectRemoveFromDisposer);

  // native/object/opengate -- Object.OpenGate(uGuid).
  function NativeObjectOpenGate() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  NativeObjectOpenGate.title = "Open Gate";
  NativeObjectOpenGate.desc = "Object.OpenGate(uGuid) -- confirmed in real scripts";
  NativeObjectOpenGate.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emitNative("Object.OpenGate(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/opengate", NativeObjectOpenGate);

  // native/object/closegate -- Object.CloseGate(uGuid). Always paired with OpenGate in the same modules.
  function NativeObjectCloseGate() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  NativeObjectCloseGate.title = "Close Gate";
  NativeObjectCloseGate.desc = "Object.CloseGate(uGuid) -- confirmed in real scripts, always paired with OpenGate in the same modules";
  NativeObjectCloseGate.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emitNative("Object.CloseGate(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/object/closegate", NativeObjectCloseGate);
})();
