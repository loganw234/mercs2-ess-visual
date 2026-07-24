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
  }
  MarkEnemy.title = "Mark Enemy";
  MarkEnemy.desc = "Ess.Easy.Mark.enemy(guid) -- radar+PDA, no world icon";
  MarkEnemy.prototype.onAction = function () {
    // "guid" is a Lua EXPRESSION, not a quoted string (see file header) -- the default
    // "Ess.Player.character(0)" is just a placeholder to keep the generated call valid out of the box; a
    // real use case would wire in an actual enemy's guid instead (e.g. from wherever this graph ends up
    // tracking spawned/targeted objects).
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Mark.enemy(" + guid + ")");
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
  }
  MarkObjective.title = "Mark Objective";
  MarkObjective.desc = "Ess.Easy.Mark.objective(guid) -- radar+PDA+world icon";
  MarkObjective.prototype.onAction = function () {
    // Same expression-not-string-literal convention as MarkEnemy above -- placeholder default guid, a real
    // use case would wire in an actual objective's guid.
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Mark.objective(" + guid + ")");
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
  }
  MarkZone.title = "Mark Zone";
  MarkZone.desc = "Ess.Easy.Mark.zone(x, y, z, r) -- world ring only, ground-disc 'go here' marker";
  MarkZone.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");  // input 0 is "exec"
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    var r = CodeGen.resolveNumberInput(this, 4, "r");
    CodeGen.emit("Ess.Easy.Mark.zone(" + x + ", " + y + ", " + z + ", " + r + ")");
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
  }
  CameraWatch.title = "Camera Watch";
  CameraWatch.desc = "Ess.Easy.Camera.watch(guid) -- default locked-off tracking shot (opts table omitted)";
  CameraWatch.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Camera.watch(" + guid + ")");
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
  }
  CameraOrbit.title = "Camera Orbit";
  CameraOrbit.desc = "Ess.Easy.Camera.orbit(guid, { radius = r, speed = s })";
  CameraOrbit.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec"
    var radius = CodeGen.resolveNumberInput(this, 2, "radius");
    var speed = CodeGen.resolveNumberInput(this, 3, "speed");
    CodeGen.emit("Ess.Easy.Camera.orbit(" + guid + ", { radius = " + radius + ", speed = " + speed + " })");
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
  // Architecturally different from every other node in this file: TWO independent exec outputs ("yes" and
  // "no") instead of one "then", since litegraph nodes can have multiple independent EVENT outputs, each
  // triggered separately.
  //
  // Ess.Easy.Confirm's onYes/onNo are Lua CALLBACKS -- this node can't nest a downstream exec chain INSIDE
  // those callbacks with the current flat-statement compiler (compiler.js just collects a flat list of
  // emitted lines; it doesn't support nesting emitted code inside a generated closure yet). So: emit the
  // Confirm call with EMPTY inline callbacks for now, and separately trigger both output slots immediately
  // after, as a documented simplification -- NOT how it'll really behave in-game (both branches "fire" here
  // for previewing/compiling purposes, but only one runs when the real dialog is actually answered).
  // ============================================================
  function ConfirmPrompt() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("yes", LiteGraph.EVENT);
    this.addOutput("no", LiteGraph.EVENT);
    this.addProperty("text", "Are you sure?");
    this.addWidget("text", "text", this.properties.text, function (v) { this.properties.text = v; }.bind(this));
  }
  ConfirmPrompt.title = "Confirm Prompt";
  ConfirmPrompt.desc = "Ess.Easy.Confirm(text, onYes, onNo) -- yes/no branches not yet wired into callbacks, see comment above";
  ConfirmPrompt.prototype.onAction = function () {
    CodeGen.emit("Ess.Easy.Confirm(" + CodeGen.luaString(this.properties.text) + ", function() end, function() end)  -- TODO: yes/no branches not yet wired into the generated callbacks, see nodes-markers-camera.js");
    this.triggerSlot(0); // yes
    this.triggerSlot(1); // no
  };
  LiteGraph.registerNodeType("ess/ui/confirm", ConfirmPrompt);
})();
