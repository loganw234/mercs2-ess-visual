/* nodes-object.js -- Ess.Object node types (the direct Ess.Object namespace only; Human/Vehicle and
 * Hud/Sound are covered in sibling files from a parallel pass). Same three-part shape as nodes.js's header
 * describes: action nodes take an "exec" ACTION input (always slot 0) and fire a "then" EVENT output via
 * triggerSlot(0); pure-data getter nodes have no exec pins at all and use onExecute + setOutputData to emit
 * a fragment of LUA SOURCE TEXT -- the call expression itself, never a computed value (see codegen.js
 * header for why nothing in this graph ever computes a real runtime value).
 *
 * Signature source of truth: mercs2-lua-essentials/src/11_object.lua -- every node below was checked
 * against that file's real function bodies, not guessed from the name.
 *
 * GUID INPUTS: a "guid" here (a target object) is modeled as a STRING data input whose value is Lua SOURCE
 * TEXT, not a real string to quote -- same convention as nodes-markers-camera.js and nodes-utility.js's
 * resolveRawInput helper (copied below, intentionally duplicated per this repo's per-file convention, not
 * centralized in codegen.js). A REQUIRED guid (the wrapped function has no meaningful nil-safe behavior)
 * defaults to the placeholder "Ess.Player.character(0)", matching every other required-guid node in this
 * repo. The one guid in this batch that the Lua source itself proves is nil-safe -- vehicleOf's uChar has an
 * explicit `if not uChar then return nil end` guard -- defaults instead to the literal unquoted "nil" (see
 * its node below), the same treatment nodes-utility.js gives Impulse.speedBoost's optional uGuid.
 *
 * MULTI-VALUE GETTERS SKIPPED: pos, velocity, size, and localToWorld each return more than one value with
 * no single obviously-primary one -- this node model is one Lua value per output slot (see PlayerCharacter /
 * DebugIsOn in nodes-player.js, the established "single-return getters only" convention for pure-data
 * nodes), so none of the four get a node here. Each has a one-line skip comment in place below, in this
 * file's Transform / Motion sections, next to the related getters that DID make the cut.
 */
(function () {
  "use strict";

  // Resolve a node's input slot exactly like CodeGen.resolveNumberInput does (wired value wins, else the
  // property default) but without any numeric assumption -- used for guid EXPRESSION inputs (spliced raw)
  // and as the pre-quote step for plain string inputs (caller applies CodeGen.luaString itself). Same local
  // twin every other nodes-*.js file in this repo keeps (see nodes-markers-camera.js's header for why this
  // isn't shared centrally through codegen.js).
  function resolveRawInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  // ============================================================
  // Transform
  // ============================================================

  // Ess.Object.pos(uGuid) -> x, y, z | nil -- SKIPPED: 3-value return, no single primary value to put on
  // one output slot (see file header). setPos below still gets a node (it's a plain action, no return).

  // Ess/object/setpos -- Ess.Object.setPos(uGuid, x, y, z). Teleports an OBJECT (not the player -- the real
  // function's own doc comment flags SetPosition as unreliable on freshly-spawned/AI humans; solid for
  // props/vehicles and for placing a just-spawned object).
  function ObjectSetPos() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
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
  ObjectSetPos.title = "Set Position";
  ObjectSetPos.desc = "Ess.Object.setPos(uGuid, x, y, z)";
  ObjectSetPos.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var x = CodeGen.resolveNumberInput(this, 2, "x");
    var y = CodeGen.resolveNumberInput(this, 3, "y");
    var z = CodeGen.resolveNumberInput(this, 4, "z");
    CodeGen.emit("Ess.Object.setPos(" + guid + ", " + x + ", " + y + ", " + z + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/setpos", ObjectSetPos);

  // Ess/object/yaw -- a PURE DATA node wrapping Ess.Object.yaw(uGuid) -> n | nil.
  function ObjectYaw() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("yaw", "number");
  }
  ObjectYaw.title = "Yaw";
  ObjectYaw.desc = "Ess.Object.yaw(uGuid) -- emits Lua source, not a resolved number (see codegen.js header)";
  ObjectYaw.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.yaw(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/yaw", ObjectYaw);

  // Ess/object/setyaw -- Ess.Object.setYaw(uGuid, n). Unit (deg vs rad) is unconfirmed on this engine per
  // the Lua source's own note -- read-modify-write a yaw from the Yaw getter above and it stays consistent
  // regardless of which unit it actually is.
  function ObjectSetYaw() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("n", "number");
    this.addProperty("n", 0);
    this.addWidget("number", "n", this.properties.n, function (v) { this.properties.n = v; }.bind(this));
  }
  ObjectSetYaw.title = "Set Yaw";
  ObjectSetYaw.desc = "Ess.Object.setYaw(uGuid, n)";
  ObjectSetYaw.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var n = CodeGen.resolveNumberInput(this, 2, "n");
    CodeGen.emit("Ess.Object.setYaw(" + guid + ", " + n + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/setyaw", ObjectSetYaw);

  // Ess/object/facetoward -- Ess.Object.faceToward(uGuid, x, y, z). Turns uGuid to face a world point
  // (ground-plane yaw only).
  function ObjectFaceToward() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
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
  ObjectFaceToward.title = "Face Toward";
  ObjectFaceToward.desc = "Ess.Object.faceToward(uGuid, x, y, z)";
  ObjectFaceToward.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var x = CodeGen.resolveNumberInput(this, 2, "x");
    var y = CodeGen.resolveNumberInput(this, 3, "y");
    var z = CodeGen.resolveNumberInput(this, 4, "z");
    CodeGen.emit("Ess.Object.faceToward(" + guid + ", " + x + ", " + y + ", " + z + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/facetoward", ObjectFaceToward);

  // Ess/object/faceobject -- Ess.Object.faceObject(uGuid, uTarget). Same as Face Toward but faces another
  // object's CURRENT position. Both guids default to the same player-character placeholder so the node
  // compiles standalone (facing yourself is a harmless no-op) -- wire in two distinct guids for real use.
  function ObjectFaceObject() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("target", "string");
    this.addProperty("target", "Ess.Player.character(0)");
    this.addWidget("text", "target", this.properties.target, function (v) { this.properties.target = v; }.bind(this));
  }
  ObjectFaceObject.title = "Face Object";
  ObjectFaceObject.desc = "Ess.Object.faceObject(uGuid, uTarget)";
  ObjectFaceObject.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var target = resolveRawInput(this, 2, "target");
    CodeGen.emit("Ess.Object.faceObject(" + guid + ", " + target + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/faceobject", ObjectFaceObject);

  // Ess/object/distance -- a PURE DATA node wrapping Ess.Object.distance(uGuidA, uGuidBOrX, yOrIgnoreY, z,
  // bIgnoreY) -> n | nil. The real function dispatches on the type of its 2nd arg: object-to-object form
  // (uGuidA, uGuidB, bIgnoreY) when it's not a number, or object-to-coordinates form (uGuidA, x, y, z,
  // bIgnoreY) when it is. This node models ONLY the object-to-object form -- the more common "how far is A
  // from B" case and the one that fits a fixed-shape node without a type-switching input. The coordinate
  // form isn't exposed as a separate node; it's a reasonable follow-up if this project wants it later.
  function ObjectDistance() {
    this.addInput("guidA", "string");
    this.addProperty("guidA", "Ess.Player.character(0)");
    this.addWidget("text", "guidA", this.properties.guidA, function (v) { this.properties.guidA = v; }.bind(this));
    this.addInput("guidB", "string");
    this.addProperty("guidB", "Ess.Player.character(0)");
    this.addWidget("text", "guidB", this.properties.guidB, function (v) { this.properties.guidB = v; }.bind(this));
    this.addProperty("bIgnoreY", false);
    this.addWidget("toggle", "bIgnoreY", this.properties.bIgnoreY, function (v) { this.properties.bIgnoreY = v; }.bind(this));
    this.addOutput("distance", "number");
  }
  ObjectDistance.title = "Distance";
  ObjectDistance.desc = "Ess.Object.distance(uGuidA, uGuidB, bIgnoreY) -- object-to-object form only, see comment above";
  ObjectDistance.prototype.onExecute = function () {
    var guidA = resolveRawInput(this, 0, "guidA");
    var guidB = resolveRawInput(this, 1, "guidB");
    var ignoreY = this.properties.bIgnoreY ? "true" : "false";
    this.setOutputData(0, "Ess.Object.distance(" + guidA + ", " + guidB + ", " + ignoreY + ")");
  };
  LiteGraph.registerNodeType("ess/object/distance", ObjectDistance);

  // ============================================================
  // Health & life
  // ============================================================

  // Ess/object/health -- a PURE DATA node wrapping Ess.Object.health(uGuid) -> n | nil.
  function ObjectHealth() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("health", "number");
  }
  ObjectHealth.title = "Health";
  ObjectHealth.desc = "Ess.Object.health(uGuid) -- emits Lua source, not a resolved number (see codegen.js header)";
  ObjectHealth.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.health(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/health", ObjectHealth);

  // Ess/object/sethealth -- Ess.Object.setHealth(uGuid, n).
  function ObjectSetHealth() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("n", "number");
    this.addProperty("n", 100);
    this.addWidget("number", "n", this.properties.n, function (v) { this.properties.n = v; }.bind(this));
  }
  ObjectSetHealth.title = "Set Health";
  ObjectSetHealth.desc = "Ess.Object.setHealth(uGuid, n)";
  ObjectSetHealth.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var n = CodeGen.resolveNumberInput(this, 2, "n");
    CodeGen.emit("Ess.Object.setHealth(" + guid + ", " + n + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/sethealth", ObjectSetHealth);

  // Ess/object/maxhealth -- a PURE DATA node wrapping Ess.Object.maxHealth(uGuid) -> n | nil.
  function ObjectMaxHealth() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("maxHealth", "number");
  }
  ObjectMaxHealth.title = "Max Health";
  ObjectMaxHealth.desc = "Ess.Object.maxHealth(uGuid) -- emits Lua source, not a resolved number (see codegen.js header)";
  ObjectMaxHealth.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.maxHealth(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/maxhealth", ObjectMaxHealth);

  // Ess/object/heal -- Ess.Object.heal(uGuid), no other args -- the confirmed "heal to full" idiom
  // (SetHealth(uGuid, GetMaxHealth(uGuid))).
  function ObjectHeal() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  ObjectHeal.title = "Heal";
  ObjectHeal.desc = "Ess.Object.heal(uGuid)";
  ObjectHeal.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emit("Ess.Object.heal(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/heal", ObjectHeal);

  // Ess/object/damage -- Ess.Object.damage(uGuid, nAmount) -> nNewHealth | nil. There is no native "damage"
  // call on this engine -- the wrapper reads health, subtracts, and Kill()s outright if the result would be
  // <= 0. "newHealth" output captures the returned new-health value via CodeGen.newLocal/emitCapture (see
  // codegen.js's header and nodes.js's Spawn Ahead, which gets the same treatment) so it can be wired into a
  // downstream action node instead of needing a separate Health getter afterward.
  function ObjectDamage() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nAmount", "number");
    this.addProperty("nAmount", 25);
    this.addWidget("number", "nAmount", this.properties.nAmount, function (v) { this.properties.nAmount = v; }.bind(this));
    this.addOutput("newHealth", "string");
  }
  ObjectDamage.title = "Damage";
  ObjectDamage.desc = "Ess.Object.damage(uGuid, nAmount) -> newHealth";
  ObjectDamage.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var nAmount = CodeGen.resolveNumberInput(this, 2, "nAmount");
    var varName = CodeGen.newLocal("newHealth");
    CodeGen.emitCapture(varName, "Ess.Object.damage(" + guid + ", " + nAmount + ")");
    this.setOutputData(1, varName);   // "newHealth" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/damage", ObjectDamage);

  // Ess/object/kill -- Ess.Object.kill(uGuid). One-way: destroys, leaves a corpse/wreck (distinct from
  // Remove below, which deletes the object outright). CONFIRMED not instantaneous -- Alive still reads true
  // for a moment after Kill.
  function ObjectKill() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  ObjectKill.title = "Kill";
  ObjectKill.desc = "Ess.Object.kill(uGuid)";
  ObjectKill.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emit("Ess.Object.kill(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/kill", ObjectKill);

  // Ess/object/remove -- Ess.Object.remove(uGuid). Deletes the object outright (no corpse/wreck left) --
  // distinct verb from Kill above.
  function ObjectRemove() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  ObjectRemove.title = "Remove";
  ObjectRemove.desc = "Ess.Object.remove(uGuid)";
  ObjectRemove.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emit("Ess.Object.remove(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/remove", ObjectRemove);

  // Ess/object/revive -- Ess.Object.revive(uGuid, nDelay). nDelay is optional Lua-side (a bare call omits
  // it entirely), but 0 is truthy in Lua so always passing a numeric 0 default here takes the same
  // "call with the delay arg" branch as any other value and revives immediately -- functionally equivalent,
  // and keeps this node's shape uniform with every other 2-arg action here.
  function ObjectRevive() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nDelay", "number");
    this.addProperty("nDelay", 0);
    this.addWidget("number", "nDelay", this.properties.nDelay, function (v) { this.properties.nDelay = v; }.bind(this));
  }
  ObjectRevive.title = "Revive";
  ObjectRevive.desc = "Ess.Object.revive(uGuid, nDelay)";
  ObjectRevive.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var nDelay = CodeGen.resolveNumberInput(this, 2, "nDelay");
    CodeGen.emit("Ess.Object.revive(" + guid + ", " + nDelay + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/revive", ObjectRevive);

  // Ess/object/alive -- a PURE DATA node wrapping Ess.Object.alive(uGuid) -> bool.
  function ObjectAlive() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("alive", "boolean");
  }
  ObjectAlive.title = "Alive";
  ObjectAlive.desc = "Ess.Object.alive(uGuid) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  ObjectAlive.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.alive(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/alive", ObjectAlive);

  // Ess/object/valid -- a PURE DATA node wrapping Ess.Object.valid(uGuid) -> bool.
  function ObjectValid() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("valid", "boolean");
  }
  ObjectValid.title = "Valid";
  ObjectValid.desc = "Ess.Object.valid(uGuid) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  ObjectValid.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.valid(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/valid", ObjectValid);

  // Ess/object/invincible -- a PURE DATA node wrapping Ess.Object.invincible(uGuid) -> bool, the getter for
  // Set Invincible below.
  function ObjectInvincible() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("invincible", "boolean");
  }
  ObjectInvincible.title = "Invincible";
  ObjectInvincible.desc = "Ess.Object.invincible(uGuid) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  ObjectInvincible.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.invincible(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/invincible", ObjectInvincible);

  // Ess/object/setinvincible -- Ess.Object.setInvincible(uGuid, bOn, sReason). sReason is REQUIRED by the
  // Lua wrapper itself (a blank/missing one is logged and silently replaced with "Ess") -- default text
  // here is "Ess" to match that same fallback, so the out-of-box call is already tagged and valid.
  function ObjectSetInvincible() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bOn", true);
    this.addWidget("toggle", "bOn", this.properties.bOn, function (v) { this.properties.bOn = v; }.bind(this));
    this.addProperty("sReason", "Ess");
    this.addWidget("text", "sReason", this.properties.sReason, function (v) { this.properties.sReason = v; }.bind(this));
  }
  ObjectSetInvincible.title = "Set Invincible";
  ObjectSetInvincible.desc = "Ess.Object.setInvincible(uGuid, bOn, sReason)";
  ObjectSetInvincible.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var bOn = this.properties.bOn ? "true" : "false";
    var sReason = CodeGen.luaString(this.properties.sReason);
    CodeGen.emit("Ess.Object.setInvincible(" + guid + ", " + bOn + ", " + sReason + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/setinvincible", ObjectSetInvincible);

  // ============================================================
  // Visibility, labels, identity
  // ============================================================

  // Ess/object/visible -- a PURE DATA node wrapping Ess.Object.visible(uGuid) -> bool.
  function ObjectVisible() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("visible", "boolean");
  }
  ObjectVisible.title = "Visible";
  ObjectVisible.desc = "Ess.Object.visible(uGuid) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  ObjectVisible.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.visible(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/visible", ObjectVisible);

  // Ess/object/setvisible -- Ess.Object.setVisible(uGuid, bOn).
  function ObjectSetVisible() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("bOn", true);
    this.addWidget("toggle", "bOn", this.properties.bOn, function (v) { this.properties.bOn = v; }.bind(this));
  }
  ObjectSetVisible.title = "Set Visible";
  ObjectSetVisible.desc = "Ess.Object.setVisible(uGuid, bOn)";
  ObjectSetVisible.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var bOn = this.properties.bOn ? "true" : "false";
    CodeGen.emit("Ess.Object.setVisible(" + guid + ", " + bOn + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/setvisible", ObjectSetVisible);

  // Ess/object/haslabel -- a PURE DATA node wrapping Ess.Object.hasLabel(uGuid, sLabel) -> bool. sLabel is
  // a plain user string (a free-form tag like "PMC"/"Disposable"/"garage" per the Lua source's own
  // examples), so it's a text widget quoted with CodeGen.luaString, not a second raw expression input.
  function ObjectHasLabel() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sLabel", "PMC");
    this.addWidget("text", "sLabel", this.properties.sLabel, function (v) { this.properties.sLabel = v; }.bind(this));
    this.addOutput("hasLabel", "boolean");
  }
  ObjectHasLabel.title = "Has Label";
  ObjectHasLabel.desc = "Ess.Object.hasLabel(uGuid, sLabel) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  ObjectHasLabel.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    var sLabel = CodeGen.luaString(this.properties.sLabel);
    this.setOutputData(0, "Ess.Object.hasLabel(" + guid + ", " + sLabel + ")");
  };
  LiteGraph.registerNodeType("ess/object/haslabel", ObjectHasLabel);

  // Ess/object/addlabel -- Ess.Object.addLabel(uGuid, sLabel).
  function ObjectAddLabel() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("sLabel", "PMC");
    this.addWidget("text", "sLabel", this.properties.sLabel, function (v) { this.properties.sLabel = v; }.bind(this));
    this.addInput("guid", "string");   // input 1 -- exec already took input 0
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  ObjectAddLabel.title = "Add Label";
  ObjectAddLabel.desc = "Ess.Object.addLabel(uGuid, sLabel)";
  ObjectAddLabel.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sLabel = CodeGen.luaString(this.properties.sLabel);
    CodeGen.emit("Ess.Object.addLabel(" + guid + ", " + sLabel + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/addlabel", ObjectAddLabel);

  // Ess/object/removelabel -- Ess.Object.removeLabel(uGuid, sLabel).
  function ObjectRemoveLabel() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("sLabel", "PMC");
    this.addWidget("text", "sLabel", this.properties.sLabel, function (v) { this.properties.sLabel = v; }.bind(this));
    this.addInput("guid", "string");   // input 1 -- exec already took input 0
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  ObjectRemoveLabel.title = "Remove Label";
  ObjectRemoveLabel.desc = "Ess.Object.removeLabel(uGuid, sLabel)";
  ObjectRemoveLabel.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var sLabel = CodeGen.luaString(this.properties.sLabel);
    CodeGen.emit("Ess.Object.removeLabel(" + guid + ", " + sLabel + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/removelabel", ObjectRemoveLabel);

  // Ess/object/displayname -- a PURE DATA node wrapping Ess.Object.displayName(uGuid) -> s. The localized,
  // human-readable name (Object.GetLocalizedName) -- distinct from Ess.Name(guid), which is the guid's HASH
  // string, a different concept not covered by this node.
  function ObjectDisplayName() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("displayName", "string");
  }
  ObjectDisplayName.title = "Display Name";
  ObjectDisplayName.desc = "Ess.Object.displayName(uGuid) -- emits Lua source, not a resolved string (see codegen.js header)";
  ObjectDisplayName.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.displayName(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/displayname", ObjectDisplayName);

  // Ess/object/playercontrolled -- a PURE DATA node wrapping Ess.Object.playerControlled(uGuid) -> bool.
  // LIVE DISCOVERY per the Lua source: the underlying native actually returns the controlling player's guid
  // (not a plain boolean) when true -- the wrapper coerces that to a real boolean, so this node's output is
  // still a faithful bool despite the engine quirk underneath.
  function ObjectPlayerControlled() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("playerControlled", "boolean");
  }
  ObjectPlayerControlled.title = "Player Controlled";
  ObjectPlayerControlled.desc = "Ess.Object.playerControlled(uGuid) -- emits Lua source, not a resolved boolean (see codegen.js header)";
  ObjectPlayerControlled.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.playerControlled(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/playercontrolled", ObjectPlayerControlled);

  // ============================================================
  // Physics
  // ============================================================

  // Ess/object/enablephysics -- Ess.Object.enablePhysics(uGuid).
  function ObjectEnablePhysics() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  ObjectEnablePhysics.title = "Enable Physics";
  ObjectEnablePhysics.desc = "Ess.Object.enablePhysics(uGuid)";
  ObjectEnablePhysics.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emit("Ess.Object.enablePhysics(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/enablephysics", ObjectEnablePhysics);

  // Ess/object/disablephysics -- Ess.Object.disablePhysics(uGuid).
  function ObjectDisablePhysics() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  ObjectDisablePhysics.title = "Disable Physics";
  ObjectDisablePhysics.desc = "Ess.Object.disablePhysics(uGuid)";
  ObjectDisablePhysics.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emit("Ess.Object.disablePhysics(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/disablephysics", ObjectDisablePhysics);

  // Ess/object/impulse -- Ess.Object.impulse(uGuid, x, y, z, bLocal) -- Object.ApplyImpulse, the confirmed
  // launch/knockback primitive. bLocal defaults true (impulse in the object's own space) matching the Lua
  // wrapper's own nil->true default. x/y/z default to 0/10000/0, echoing the confirmed real call-site shape
  // quoted in the Lua source's own comment (a big upward push, scaled by mass at real call sites).
  function ObjectImpulse() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("x", "number");
    this.addProperty("x", 0);
    this.addWidget("number", "x", this.properties.x, function (v) { this.properties.x = v; }.bind(this));
    this.addInput("y", "number");
    this.addProperty("y", 10000);
    this.addWidget("number", "y", this.properties.y, function (v) { this.properties.y = v; }.bind(this));
    this.addInput("z", "number");
    this.addProperty("z", 0);
    this.addWidget("number", "z", this.properties.z, function (v) { this.properties.z = v; }.bind(this));
    this.addProperty("bLocal", true);
    this.addWidget("toggle", "bLocal", this.properties.bLocal, function (v) { this.properties.bLocal = v; }.bind(this));
  }
  ObjectImpulse.title = "Impulse";
  ObjectImpulse.desc = "Ess.Object.impulse(uGuid, x, y, z, bLocal)";
  ObjectImpulse.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var x = CodeGen.resolveNumberInput(this, 2, "x");
    var y = CodeGen.resolveNumberInput(this, 3, "y");
    var z = CodeGen.resolveNumberInput(this, 4, "z");
    var bLocal = this.properties.bLocal ? "true" : "false";
    CodeGen.emit("Ess.Object.impulse(" + guid + ", " + x + ", " + y + ", " + z + ", " + bLocal + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/impulse", ObjectImpulse);

  // ============================================================
  // Motion & geometry
  // ============================================================

  // Ess.Object.velocity(uGuid) -> vx, vy, vz | nil -- SKIPPED: 3-value return, no single primary value (see
  // file header). Speed and Speed Squared below cover the common scalar-motion use cases instead.

  // Ess/object/speed -- a PURE DATA node wrapping Ess.Object.speed(uGuid) -> n | nil (scalar speed, one
  // sqrt over the velocity-squared read).
  function ObjectSpeed() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("speed", "number");
  }
  ObjectSpeed.title = "Speed";
  ObjectSpeed.desc = "Ess.Object.speed(uGuid) -- emits Lua source, not a resolved number (see codegen.js header)";
  ObjectSpeed.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.speed(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/speed", ObjectSpeed);

  // Ess/object/speedsq -- a PURE DATA node wrapping Ess.Object.speedSq(uGuid) -> n | nil -- the squared form
  // for threshold checks (no sqrt, cheapest read).
  function ObjectSpeedSq() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("speedSq", "number");
  }
  ObjectSpeedSq.title = "Speed Squared";
  ObjectSpeedSq.desc = "Ess.Object.speedSq(uGuid) -- emits Lua source, not a resolved number (see codegen.js header)";
  ObjectSpeedSq.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.speedSq(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/speedsq", ObjectSpeedSq);

  // Ess.Object.size(uGuid) -> ex, ey, ez | nil -- SKIPPED: 3-value bounding-box extents, no single primary
  // value (see file header).

  // Ess.Object.localToWorld(uGuid, lx, ly, lz) -> x, y, z | nil -- SKIPPED: 3-value return, no single
  // primary value (see file header).

  // Ess/object/heightaboveground -- a PURE DATA node wrapping Ess.Object.heightAboveGround(uGuid) -> n |
  // nil. CAVEAT from the Lua source: an exact-0 reading can be the engine's unstreamed-geometry placeholder
  // rather than real ground contact for a far-away/just-streamed object.
  function ObjectHeightAboveGround() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("height", "number");
  }
  ObjectHeightAboveGround.title = "Height Above Ground";
  ObjectHeightAboveGround.desc = "Ess.Object.heightAboveGround(uGuid) -- emits Lua source, not a resolved number (see codegen.js header)";
  ObjectHeightAboveGround.prototype.onExecute = function () {
    var guid = resolveRawInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Object.heightAboveGround(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/object/heightaboveground", ObjectHeightAboveGround);

  // Ess/object/snaptoground -- Ess.Object.snapToGround(uGuid, nOffset) -> ok. Drops (or lifts) the object
  // onto the terrain, optionally hovering nOffset units above it. "ok" output captures the returned flag via
  // CodeGen.newLocal/emitCapture (see codegen.js's header and nodes.js's Spawn Ahead, which gets the same
  // treatment) so a downstream node can branch on whether it actually landed instead of needing a separate
  // Height Above Ground / Position check.
  function ObjectSnapToGround() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("nOffset", "number");
    this.addProperty("nOffset", 0);
    this.addWidget("number", "nOffset", this.properties.nOffset, function (v) { this.properties.nOffset = v; }.bind(this));
    this.addOutput("ok", "string");
  }
  ObjectSnapToGround.title = "Snap To Ground";
  ObjectSnapToGround.desc = "Ess.Object.snapToGround(uGuid, nOffset) -> ok";
  ObjectSnapToGround.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");   // input 0 is "exec"
    var nOffset = CodeGen.resolveNumberInput(this, 2, "nOffset");
    var varName = CodeGen.newLocal("ok");
    CodeGen.emitCapture(varName, "Ess.Object.snapToGround(" + guid + ", " + nOffset + ")");
    this.setOutputData(1, varName);   // "ok" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/snaptoground", ObjectSnapToGround);

  // ============================================================
  // Spawn
  // ============================================================

  // Ess/object/spawn -- Ess.Object.spawn(sTemplate, x, y, z, yaw) -> uGuid | nil. The one CREATE verb in
  // this namespace (Pg.Spawn under the hood, with the blank-template crash guard built in). "guid" output
  // captures the returned guid via CodeGen.newLocal/emitCapture (see codegen.js's header and nodes.js's
  // Spawn Ahead, which gets the same treatment) so it can be wired into a downstream action node's guid
  // input -- "Veyron" is the same confirmed-valid template default Spawn Ahead uses, so the node compiles
  // standalone even with nothing wired to "guid".
  function ObjectSpawn() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("sTemplate", "Veyron");
    this.addWidget("text", "sTemplate", this.properties.sTemplate, function (v) { this.properties.sTemplate = v; }.bind(this));
    this.addInput("x", "number");   // input 1 -- exec already took input 0
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
    this.addOutput("guid", "string");
  }
  ObjectSpawn.title = "Spawn";
  ObjectSpawn.desc = "Ess.Object.spawn(sTemplate, x, y, z, yaw) -> guid";
  ObjectSpawn.prototype.onAction = function () {
    var sTemplate = CodeGen.luaString(this.properties.sTemplate);
    var x = CodeGen.resolveNumberInput(this, 1, "x");   // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var yaw = CodeGen.resolveNumberInput(this, 4, "yaw");
    var varName = CodeGen.newLocal("spawn");
    CodeGen.emitCapture(varName, "Ess.Object.spawn(" + sTemplate + ", " + x + ", " + y + ", " + z + ", " + yaw + ")");
    this.setOutputData(1, varName);   // "guid" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/object/spawn", ObjectSpawn);

  // ============================================================
  // Vehicle-entry
  // ============================================================

  // Ess/object/vehicleof -- a PURE DATA node wrapping Ess.Object.vehicleOf(uChar) -> uVehicleGuid | nil.
  // uChar defaults to the literal "nil" rather than the usual player-character placeholder: the Lua source
  // has an explicit `if not uChar then return nil end` guard, proving (not just assuming) that a nil guid is
  // valid, non-crashing input here -- the same treatment nodes-utility.js gives Impulse.speedBoost's
  // optional uGuid ("nil = auto"). A bare "nil" call just resolves to "no vehicle", which is still a fully
  // valid, runnable default; wire in a real character guid for a meaningful query.
  function ObjectVehicleOf() {
    this.addInput("uChar", "string");
    this.addProperty("uChar", "nil");
    this.addWidget("text", "uChar (nil = no vehicle)", this.properties.uChar, function (v) { this.properties.uChar = v; }.bind(this));
    this.addOutput("vehicle", "string");
  }
  ObjectVehicleOf.title = "Vehicle Of";
  ObjectVehicleOf.desc = "Ess.Object.vehicleOf(uChar) -- emits Lua source, not a resolved guid (see codegen.js header)";
  ObjectVehicleOf.prototype.onExecute = function () {
    var uChar = resolveRawInput(this, 0, "uChar");
    this.setOutputData(0, "Ess.Object.vehicleOf(" + uChar + ")");
  };
  LiteGraph.registerNodeType("ess/object/vehicleof", ObjectVehicleOf);
})();
