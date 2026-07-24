/* nodes-markers-camera.js -- Mark/Camera/Sound/UI-confirm node types, following the same three-part shape
 * as nodes.js (exec/then action pins, addInput+addProperty+addWidget for values, onAction emits one line
 * of Lua then triggers the chain onward). See nodes.js's header comment for the general pattern; this file
 * only adds what's specific to the nodes below.
 *
 * GUID INPUTS: a "guid" here (a marker/camera target) is modeled as a STRING data input, but its value is
 * never a real string to be quoted -- it's Lua SOURCE TEXT, exactly like Random Number's "value" output in
 * nodes.js (see codegen.js's header note: nothing in this graph computes a real runtime value, every data
 * wire carries a fragment of generated Lua). So a guid input is resolved and spliced straight into the
 * emitted call, NEVER passed through CodeGen.luaString -- that would wrap a variable/function-call
 * expression like `Ess.Player.character(0)` in quotes and turn it into a broken string literal instead of
 * the expression it's meant to be. resolveRawInput below is a local, string-flavored twin of
 * CodeGen.resolveNumberInput (same "wired wins, else property" logic) kept here rather than added to
 * codegen.js since this file isn't meant to touch it.
 */
(function () {
  "use strict";

  // Resolve a node's input slot exactly like CodeGen.resolveNumberInput does (wired value wins, else the
  // property default) but without any numeric assumption -- used for guid EXPRESSION inputs (spliced raw)
  // and as the pre-quote step for plain string inputs (caller applies CodeGen.luaString itself).
  function resolveRawInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  // ============================================================
  // Ess/mark/enemy -- Ess.Easy.Mark.enemy(guid)
  // ============================================================
  function MarkEnemy() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("handle", "string");
  }
  MarkEnemy.title = "Mark Enemy";
  MarkEnemy.desc = "Ess.Easy.Mark.enemy(guid) -- radar+PDA, no world icon -> handle";
  MarkEnemy.prototype.onAction = function () {
    // "guid" is a Lua EXPRESSION, not a quoted string (see file header) -- the default
    // "Ess.Player.character(0)" is just a placeholder to keep the generated call valid out of the box; a
    // real use case would wire in an actual enemy's guid instead (e.g. from wherever this graph ends up
    // tracking spawned/targeted objects).
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var varName = CodeGen.newLocal("mark");
    CodeGen.emitCapture(varName, "Ess.Easy.Mark.enemy(" + guid + ")");
    this.setOutputData(1, varName);   // "handle" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/mark/enemy", MarkEnemy);

  // ============================================================
  // Ess/mark/objective -- Ess.Easy.Mark.objective(guid)
  // ============================================================
  function MarkObjective() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("handle", "string");
  }
  MarkObjective.title = "Mark Objective";
  MarkObjective.desc = "Ess.Easy.Mark.objective(guid) -- radar+PDA+world icon -> handle";
  MarkObjective.prototype.onAction = function () {
    // Same expression-not-string-literal convention as MarkEnemy above -- placeholder default guid, a real
    // use case would wire in an actual objective's guid.
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var varName = CodeGen.newLocal("mark");
    CodeGen.emitCapture(varName, "Ess.Easy.Mark.objective(" + guid + ")");
    this.setOutputData(1, varName);   // "handle" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/mark/objective", MarkObjective);

  // ============================================================
  // Ess/mark/zone -- Ess.Easy.Mark.zone(x, y, z, r)
  // ============================================================
  function MarkZone() {
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
    this.addProperty("r", 5);
    this.addWidget("number", "r", this.properties.r, function (v) { this.properties.r = v; }.bind(this));
    this.addOutput("handle", "string");
  }
  MarkZone.title = "Mark Zone";
  MarkZone.desc = "Ess.Easy.Mark.zone(x, y, z, r) -- world ring only, ground-disc 'go here' marker -> handle";
  MarkZone.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");  // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var r = CodeGen.resolveNumberInput(this, 4, "r");
    var varName = CodeGen.newLocal("mark");
    CodeGen.emitCapture(varName, "Ess.Easy.Mark.zone(" + x + ", " + y + ", " + z + ", " + r + ")");
    this.setOutputData(1, varName);   // "handle" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/mark/zone", MarkZone);

  // ============================================================
  // Ess/camera/watch -- Ess.Easy.Camera.watch(guid, opts)
  //
  // Real signature (51_camera.lua) takes a big OPTIONAL opts table: at, height, look, bone, chase, angle,
  // dist, chaseHeight, smooth, smoothFactor, i -- every field has a confirmed sane default (plain call with
  // no opts gives a static locked-off tracking shot; opts.chase=true switches to a fixed-angle follow).
  // Since opts is fully optional, this node simplifies to the no-opts default shot -- Ess.Easy.Camera.watch
  // (guid) with nothing else -- rather than exposing the whole opts surface.
  // ============================================================
  function CameraWatch() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("stop", "string");
  }
  CameraWatch.title = "Camera Watch";
  CameraWatch.desc = "Ess.Easy.Camera.watch(guid) -- default locked-off tracking shot (opts table omitted) -> stop";
  CameraWatch.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var varName = CodeGen.newLocal("watch");
    CodeGen.emitCapture(varName, "Ess.Easy.Camera.watch(" + guid + ")");
    this.setOutputData(1, varName);   // "stop" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/camera/watch", CameraWatch);

  // ============================================================
  // Ess/camera/orbit -- Ess.Easy.Camera.orbit(guid, opts)
  //
  // Real signature (51_camera.lua) also takes an optional opts table: radius (12), height (4), speed (40),
  // startAngle (0), look, bone, smooth, smoothFactor, i. Unlike watch, radius/speed are simple positional-
  // ish numeric knobs worth exposing directly -- they're spliced into a small `{ radius = .., speed = .. }`
  // table literal, letting every other opts field fall back to its Lua-side default.
  // ============================================================
  function CameraOrbit() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("radius", "number");
    this.addProperty("radius", 12);
    this.addWidget("number", "radius", this.properties.radius, function (v) { this.properties.radius = v; }.bind(this));
    this.addInput("speed", "number");
    this.addProperty("speed", 40);
    this.addWidget("number", "speed", this.properties.speed, function (v) { this.properties.speed = v; }.bind(this));
    this.addOutput("stop", "string");
  }
  CameraOrbit.title = "Camera Orbit";
  CameraOrbit.desc = "Ess.Easy.Camera.orbit(guid, { radius = r, speed = s }) -> stop";
  CameraOrbit.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var radius = CodeGen.resolveNumberInput(this, 2, "radius");
    var speed = CodeGen.resolveNumberInput(this, 3, "speed");
    var varName = CodeGen.newLocal("orbit");
    CodeGen.emitCapture(varName, "Ess.Easy.Camera.orbit(" + guid + ", { radius = " + radius + ", speed = " + speed + " })");
    this.setOutputData(1, varName);   // "stop" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/camera/orbit", CameraOrbit);

  // ============================================================
  // Ess/sound/play -- Ess.Easy.Sound.play(cue)
  // ============================================================
  function SoundPlay() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("cue", "string");
    this.addProperty("cue", "UI_Confirm");
    this.addWidget("text", "cue", this.properties.cue, function (v) { this.properties.cue = v; }.bind(this));
  }
  SoundPlay.title = "Play Sound";
  SoundPlay.desc = "Ess.Easy.Sound.play(cue) -- plain UI one-shot cue, no guid/opts";
  SoundPlay.prototype.onAction = function () {
    // Unlike "guid" above, a sound cue name is real user text, not a Lua expression -- resolve wired-or-
    // property same as any other input, then safely quote it (never raw-concatenate, per codegen.js).
    var cue = resolveRawInput(this, 1, "cue");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Sound.play(" + CodeGen.luaString(cue) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/sound/play", SoundPlay);

  // ============================================================
  // Ess/ui/confirm -- Ess.Easy.Confirm(text, onYes, onNo)
  //
  // onYes/onNo are Lua CALLBACKS -- modeled as raw Lua-source TEXT properties, the same "data is Lua
  // source text" convention guids/points/factions lists already use throughout this repo (see codegen.js
  // header), spliced in as literal function bodies rather than represented as separate visually-wired exec
  // branches. An earlier version of this node instead gave itself two EVENT outputs ("yes"/"no") that both
  // fired immediately during compile -- that produced Lua where the REAL onYes/onNo were empty no-ops
  // while anything wired after "yes"/"no" in the graph ran unconditionally at Confirm-call time, not when
  // the dialog was actually answered. Less visual, but this way the generated code actually does what the
  // node shows. onNo is optional in the real function (default: do nothing) -- blank here emits `nil`.
  // ============================================================
  function ConfirmPrompt() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("text", "Are you sure?");
    this.addWidget("text", "text", this.properties.text, function (v) { this.properties.text = v; }.bind(this));
    this.addProperty("onYes", "function() end");
    this.addWidget("text", "onYes", this.properties.onYes, function (v) { this.properties.onYes = v; }.bind(this));
    this.addProperty("onNo", "");
    this.addWidget("text", "onNo (blank = none)", this.properties.onNo, function (v) { this.properties.onNo = v; }.bind(this));
  }
  ConfirmPrompt.title = "Confirm Prompt";
  ConfirmPrompt.desc = "Ess.Easy.Confirm(text, onYes, onNo) -- onYes/onNo are raw Lua function-literal text, not wired branches";
  ConfirmPrompt.prototype.onAction = function () {
    var onNo = (this.properties.onNo && this.properties.onNo.trim()) ? this.properties.onNo : "nil";
    CodeGen.emit("Ess.Easy.Confirm(" + CodeGen.luaString(this.properties.text) + ", " + this.properties.onYes + ", " + onNo + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/ui/confirm", ConfirmPrompt);

  // ============================================================
  // Ess/Camera/FadeOut -- Ess.Easy.Camera.fadeOut(). No args -- full-screen fade to black.
  // ============================================================
  function CameraFadeOut() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  CameraFadeOut.title = "Camera Fade Out";
  CameraFadeOut.desc = "Ess.Easy.Camera.fadeOut()";
  CameraFadeOut.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Camera.fadeOut()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/camera/fadeout", CameraFadeOut);

  // ============================================================
  // Ess/Camera/FadeIn -- Ess.Easy.Camera.fadeIn(). No args -- full-screen fade back in from black.
  // ============================================================
  function CameraFadeIn() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  CameraFadeIn.title = "Camera Fade In";
  CameraFadeIn.desc = "Ess.Easy.Camera.fadeIn()";
  CameraFadeIn.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Camera.fadeIn()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/camera/fadein", CameraFadeIn);

  // ============================================================
  // Ess/Camera/Shake -- Ess.Easy.Camera.shake(i) -- zero-config screen shake for player i.
  // ============================================================
  function CameraShake() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("i", "number");
    this.addProperty("i", 0);
    this.addWidget("number", "i", this.properties.i, function (v) { this.properties.i = v; }.bind(this));
  }
  CameraShake.title = "Camera Shake";
  CameraShake.desc = "Ess.Easy.Camera.shake(i)";
  CameraShake.prototype.onAction = function () {
    var i = CodeGen.resolveNumberInput(this, 1, "i");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Camera.shake(" + i + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/camera/shake", CameraShake);

  // ============================================================
  // Ess/Camera/Fov -- Ess.Camera.fov(i, nAngle, nDuration) -- Core tier, verified against
  // mercs2-lua-essentials/src/51_camera.lua. `i` here is a literal player-slot INDEX (0 = local player),
  // NOT a camera guid -- Graphics.Camera is a genuinely different native table than top-level Camera
  // despite the shared name (see that file's own header for the confirmed cross-namespace footgun).
  // ============================================================
  function CameraFov() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("i", "number");
    this.addProperty("i", 0);
    this.addWidget("number", "i", this.properties.i, function (v) { this.properties.i = v; }.bind(this));
    this.addInput("nAngle", "number");
    this.addProperty("nAngle", 30);
    this.addWidget("number", "nAngle", this.properties.nAngle, function (v) { this.properties.nAngle = v; }.bind(this));
    this.addInput("nDuration", "number");
    this.addProperty("nDuration", 1);
    this.addWidget("number", "nDuration", this.properties.nDuration, function (v) { this.properties.nDuration = v; }.bind(this));
  }
  CameraFov.title = "Camera FOV";
  CameraFov.desc = "Ess.Camera.fov(i, nAngle, nDuration) -- i is a player index, not a camera guid";
  CameraFov.prototype.onAction = function () {
    var i = CodeGen.resolveNumberInput(this, 1, "i");  // input 0 is "exec"
    var nAngle = CodeGen.resolveNumberInput(this, 2, "nAngle");
    var nDuration = CodeGen.resolveNumberInput(this, 3, "nDuration");
    CodeGen.emit("Ess.Camera.fov(" + i + ", " + nAngle + ", " + nDuration + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/camera/fov", CameraFov);

  // ============================================================
  // Ess/Camera/RestoreFov -- Ess.Camera.restoreFov(i, nDuration) -- blends the FOV back to normal.
  // ============================================================
  function CameraRestoreFov() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("i", "number");
    this.addProperty("i", 0);
    this.addWidget("number", "i", this.properties.i, function (v) { this.properties.i = v; }.bind(this));
    this.addInput("nDuration", "number");
    this.addProperty("nDuration", 1);
    this.addWidget("number", "nDuration", this.properties.nDuration, function (v) { this.properties.nDuration = v; }.bind(this));
  }
  CameraRestoreFov.title = "Camera Restore FOV";
  CameraRestoreFov.desc = "Ess.Camera.restoreFov(i, nDuration)";
  CameraRestoreFov.prototype.onAction = function () {
    var i = CodeGen.resolveNumberInput(this, 1, "i");  // input 0 is "exec"
    var nDuration = CodeGen.resolveNumberInput(this, 2, "nDuration");
    CodeGen.emit("Ess.Camera.restoreFov(" + i + ", " + nDuration + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/camera/restorefov", CameraRestoreFov);

  // ============================================================
  // Ess/Camera/PanicRevert -- Ess.Camera.panicRevert(). No args -- force-releases EVERY active cinematic
  // camera takeover, the always-works escape hatch (safe to fire blind, even with no cinematic active).
  // ============================================================
  function CameraPanicRevert() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  CameraPanicRevert.title = "Camera Panic Revert";
  CameraPanicRevert.desc = "Ess.Camera.panicRevert() -- force-release every active cinematic camera takeover";
  CameraPanicRevert.prototype.onAction = function () {
    CodeGen.emit("Ess.Camera.panicRevert()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/camera/panicrevert", CameraPanicRevert);
})();
