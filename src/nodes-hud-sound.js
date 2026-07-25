/* nodes-hud-sound.js -- Ess.Hud.<name> and Ess.Sound.<name> node types (native HUD popups/banners/objective
 * tray, plus the raw one-shot sound-effect and ambience layer). Same three-part shape as nodes.js's header
 * comment describes (exec/then action pins, addInput+addProperty+addWidget for values, onAction emits one
 * line of Lua then triggers the chain onward). This file only adds what's specific to the nodes below.
 *
 * Signatures verified directly against mercs2-lua-essentials source:
 *   src/57_hud.lua    -- Ess.Hud.banner / hint / hideHint / objective / radio
 *   src/56_sound.lua  -- Ess.Sound.cue / stop / ambience / stopAmbience / volume
 *
 * GUID-STYLE / RAW EXPRESSION INPUTS: Sound.cue and Sound.stop take an optional target-object guid where
 * nil (or 0) is itself a meaningful, CONFIRMED value (a plain UI/HUD one-shot with no world position -- see
 * 56_sound.lua's own header comment). That's modeled the same way nodes-markers-camera.js models a guid: a
 * "string" data input carrying a Lua SOURCE EXPRESSION, never a real quoted string, resolved with the same
 * local resolveRawInput(node, slotIndex, propName) helper copied below (wired value wins, else the property
 * text, spliced UNQUOTED). Default is the literal unquoted text "nil" since that's a real, valid, CONFIRMED
 * argument here -- not a placeholder standing in for a required value.
 *
 * PLAIN STRING PARAMETERS (a HUD message, a hint/objective id, a sound cue name, a stream name): also
 * resolved through resolveRawInput (so they can be wired from another data node, same as the "cue" input on
 * ess/sound/play in nodes-markers-camera.js) but then wrapped with CodeGen.luaString(...) before being
 * spliced into the emitted line -- these are real user-facing text, never a Lua expression.
 *
 * BOOLEAN PARAMETERS (Hud.hint/hideHint's bBroadcast): plain toggle widgets, no data input -- same
 * convention nodes-world.js uses for Ess.Easy.World.noPursuit/Ess.Easy.Fun.fanfare, emitting the literal
 * Lua token "true"/"false" rather than a wired boolean data slot.
 */
(function () {
  "use strict";

  // Local alias for CodeGen.resolveInput -- "whatever's wired in, else the node's own property".
  // This file (and eight others) used to carry its own byte-identical copy of that function, on the
  // theory that CodeGen's was number-specific; it never was -- the two were the same four lines under
  // two names. See codegen.js's resolveInput for the naming history. Kept as a local name only so the
  // call sites below stay short and unchanged.
  var resolveRawInput = CodeGen.resolveInput;

  // ============================================================
  // Ess/Hud/Banner -- Ess.Hud.banner(sMsg). Clean, icon-free, centered text banner.
  // ============================================================
  function HudBanner() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("message", "string");
    this.addProperty("message", "Objective Complete");
    this.addWidget("text", "message", this.properties.message, function (v) { this.properties.message = v; }.bind(this));
  }
  HudBanner.title = "Hud: Banner";
  HudBanner.desc = "Ess.Hud.banner(sMsg) -- icon-free centered text banner";
  HudBanner.prototype.onAction = function () {
    var message = resolveRawInput(this, 1, "message");  // input 0 is "exec"
    CodeGen.emit("Ess.Hud.banner(" + CodeGen.luaString(message) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/hud/banner", HudBanner);

  // ============================================================
  // Ess/Hud/Hint -- Ess.Hud.hint(sMsg, sId, bBroadcast). Native tutorial-style hint popup (icon+sound),
  // stays up until Ess.Hud.hideHint is called with a MATCHING sId. bBroadcast defaults to false here
  // (local-only) -- the safer choice per 57_hud.lua's header, since the native's own default-to-broadcast
  // co-op behavior is unconfirmed/untested.
  // ============================================================
  function HudHint() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("message", "string");
    this.addProperty("message", "Reach the extraction point to continue.");
    this.addWidget("text", "message", this.properties.message, function (v) { this.properties.message = v; }.bind(this));
    this.addInput("id", "string");
    this.addProperty("id", "hint1");
    this.addWidget("text", "id", this.properties.id, function (v) { this.properties.id = v; }.bind(this));
    this.addProperty("broadcast", false);
    this.addWidget("toggle", "broadcast", this.properties.broadcast, function (v) { this.properties.broadcast = v; }.bind(this));
  }
  HudHint.title = "Hud: Hint";
  HudHint.desc = "Ess.Hud.hint(sMsg, sId, bBroadcast) -- stays up until Hud: Hide Hint is called with a matching id";
  HudHint.prototype.onAction = function () {
    var message = resolveRawInput(this, 1, "message");  // input 0 is "exec"
    var id = resolveRawInput(this, 2, "id");
    var broadcast = this.properties.broadcast ? "true" : "false";
    CodeGen.emit("Ess.Hud.hint(" + CodeGen.luaString(message) + ", " + CodeGen.luaString(id) + ", " + broadcast + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/hud/hint", HudHint);

  // ============================================================
  // Ess/Hud/HideHint -- Ess.Hud.hideHint(sId, bBroadcast). "id" default matches Hud: Hint's own default
  // ("hint1") so the two nodes pair correctly out of the box if dropped with no edits.
  // ============================================================
  function HudHideHint() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("id", "string");
    this.addProperty("id", "hint1");
    this.addWidget("text", "id", this.properties.id, function (v) { this.properties.id = v; }.bind(this));
    this.addProperty("broadcast", false);
    this.addWidget("toggle", "broadcast", this.properties.broadcast, function (v) { this.properties.broadcast = v; }.bind(this));
  }
  HudHideHint.title = "Hud: Hide Hint";
  HudHideHint.desc = "Ess.Hud.hideHint(sId, bBroadcast) -- a different or missing id does NOT clear an active hint";
  HudHideHint.prototype.onAction = function () {
    var id = resolveRawInput(this, 1, "id");  // input 0 is "exec"
    var broadcast = this.properties.broadcast ? "true" : "false";
    CodeGen.emit("Ess.Hud.hideHint(" + CodeGen.luaString(id) + ", " + broadcast + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/hud/hidehint", HudHideHint);

  // ============================================================
  // Ess/Hud/Objective -- Ess.Hud.objective(sText, nSlot). Sets the persistent objective-tray line; nSlot
  // defaults to 1 (the "current objective" line) both here and Lua-side. The real function clears the slot
  // when sText is nil -- modeled here as "blank text widget = clear", same blank-means-omit convention
  // nodes-markers-camera.js's Confirm Prompt uses for its optional onNo.
  // ============================================================
  function HudObjective() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("text", "string");
    this.addProperty("text", "Reach the extraction point");
    this.addWidget("text", "text (blank = clear)", this.properties.text, function (v) { this.properties.text = v; }.bind(this));
    this.addInput("slot", "number");
    this.addProperty("slot", 1);
    this.addWidget("number", "slot", this.properties.slot, function (v) { this.properties.slot = v; }.bind(this));
  }
  HudObjective.title = "Hud: Objective";
  HudObjective.desc = "Ess.Hud.objective(sText, nSlot) -- nSlot 1 = current objective line; blank sText clears the slot";
  HudObjective.prototype.onAction = function () {
    var text = resolveRawInput(this, 1, "text");  // input 0 is "exec"
    var slot = CodeGen.resolveNumberInput(this, 2, "slot");
    var sText = (text && String(text).trim()) ? CodeGen.luaString(text) : "nil";
    CodeGen.emit("Ess.Hud.objective(" + sText + ", " + slot + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/hud/objective", HudObjective);

  // ============================================================
  // Ess/Hud/Radio -- Ess.Hud.radio(sText, nHold). Transient "radio chatter" subtitle (objective-tray slot
  // 3) that auto-clears after nHold seconds (default 5, matching the Lua-side default).
  // ============================================================
  function HudRadio() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("text", "string");
    this.addProperty("text", "Command, we've got movement on your six.");
    this.addWidget("text", "text", this.properties.text, function (v) { this.properties.text = v; }.bind(this));
    this.addInput("hold", "number");
    this.addProperty("hold", 5);
    this.addWidget("number", "hold", this.properties.hold, function (v) { this.properties.hold = v; }.bind(this));
  }
  HudRadio.title = "Hud: Radio";
  HudRadio.desc = "Ess.Hud.radio(sText, nHold) -- transient radio-chatter subtitle, auto-clears after nHold seconds";
  HudRadio.prototype.onAction = function () {
    var text = resolveRawInput(this, 1, "text");  // input 0 is "exec"
    var hold = CodeGen.resolveNumberInput(this, 2, "hold");
    CodeGen.emit("Ess.Hud.radio(" + CodeGen.luaString(text) + ", " + hold + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/hud/radio", HudRadio);

  // ============================================================
  // Ess/Sound/Cue -- Ess.Sound.cue(uGuidOrNil, sCueName). The full-signature version of the sound layer --
  // distinct from the existing "Play Sound" node (ess/sound/play in nodes-markers-camera.js), which wraps
  // this same call with a hardcoded nil guid. Here the guid is exposed: nil/0 (default) is a CONFIRMED valid
  // plain UI/HUD one-shot with no world position; a real object guid attaches the sound to that object.
  // ============================================================
  function SoundCue() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "nil");
    this.addWidget("text", "guid (nil = UI one-shot)", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("cue", "string");
    this.addProperty("cue", "UI_Confirm");
    this.addWidget("text", "cue", this.properties.cue, function (v) { this.properties.cue = v; }.bind(this));
  }
  SoundCue.title = "Sound: Cue";
  SoundCue.desc = "Ess.Sound.cue(uGuidOrNil, sCueName) -- nil/0 guid = UI one-shot; a real guid attaches the sound to that object";
  SoundCue.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec" -- guid is a Lua EXPRESSION, spliced raw
    var cue = resolveRawInput(this, 2, "cue");
    CodeGen.emit("Ess.Sound.cue(" + guid + ", " + CodeGen.luaString(cue) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/sound/cue", SoundCue);

  // ============================================================
  // Ess/Sound/Stop -- Ess.Sound.stop(uGuidOrNil, sCueName). Must be called with the SAME (guid, cue) pair a
  // prior Sound: Cue call used, per 56_sound.lua's own header comment.
  // ============================================================
  function SoundStop() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "nil");
    this.addWidget("text", "guid (nil = UI one-shot)", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("cue", "string");
    this.addProperty("cue", "UI_Confirm");
    this.addWidget("text", "cue", this.properties.cue, function (v) { this.properties.cue = v; }.bind(this));
  }
  SoundStop.title = "Sound: Stop";
  SoundStop.desc = "Ess.Sound.stop(uGuidOrNil, sCueName) -- must match the (guid, cue) pair a prior Sound: Cue call used";
  SoundStop.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec" -- guid is a Lua EXPRESSION, spliced raw
    var cue = resolveRawInput(this, 2, "cue");
    CodeGen.emit("Ess.Sound.stop(" + guid + ", " + CodeGen.luaString(cue) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/sound/stop", SoundStop);

  // ============================================================
  // Ess/Sound/Ambience -- Ess.Sound.ambience(sStreamName). Sound.CueAmbience.
  // ============================================================
  function SoundAmbience() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("stream", "string");
    this.addProperty("stream", "AMB_City");
    this.addWidget("text", "stream", this.properties.stream, function (v) { this.properties.stream = v; }.bind(this));
  }
  SoundAmbience.title = "Sound: Ambience";
  SoundAmbience.desc = "Ess.Sound.ambience(sStreamName)";
  SoundAmbience.prototype.onAction = function () {
    var stream = resolveRawInput(this, 1, "stream");  // input 0 is "exec"
    CodeGen.emit("Ess.Sound.ambience(" + CodeGen.luaString(stream) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/sound/ambience", SoundAmbience);

  // ============================================================
  // Ess/Sound/StopAmbience -- Ess.Sound.stopAmbience(sStreamName). Sound.StopAmbience.
  // ============================================================
  function SoundStopAmbience() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("stream", "string");
    this.addProperty("stream", "AMB_City");
    this.addWidget("text", "stream", this.properties.stream, function (v) { this.properties.stream = v; }.bind(this));
  }
  SoundStopAmbience.title = "Sound: Stop Ambience";
  SoundStopAmbience.desc = "Ess.Sound.stopAmbience(sStreamName)";
  SoundStopAmbience.prototype.onAction = function () {
    var stream = resolveRawInput(this, 1, "stream");  // input 0 is "exec"
    CodeGen.emit("Ess.Sound.stopAmbience(" + CodeGen.luaString(stream) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/sound/stopambience", SoundStopAmbience);

  // ============================================================
  // Ess/Sound/Volume -- Ess.Sound.volume(nLevel, nFadeTime). Sound.SetMasterVolume. nLevel CONFIRMED
  // observed as 0/1 in real scripts (not necessarily a 0..1 float range beyond that); nFadeTime in seconds,
  // defaults to 0 both here and Lua-side.
  // ============================================================
  function SoundVolume() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("level", "number");
    this.addProperty("level", 1);
    this.addWidget("number", "level", this.properties.level, function (v) { this.properties.level = v; }.bind(this));
    this.addInput("fadeTime", "number");
    this.addProperty("fadeTime", 0);
    this.addWidget("number", "fadeTime", this.properties.fadeTime, function (v) { this.properties.fadeTime = v; }.bind(this));
  }
  SoundVolume.title = "Sound: Volume";
  SoundVolume.desc = "Ess.Sound.volume(nLevel, nFadeTime) -- nLevel observed as 0/1 in real scripts, nFadeTime in seconds";
  SoundVolume.prototype.onAction = function () {
    var level = CodeGen.resolveNumberInput(this, 1, "level");  // input 0 is "exec"
    var fadeTime = CodeGen.resolveNumberInput(this, 2, "fadeTime");
    CodeGen.emit("Ess.Sound.volume(" + level + ", " + fadeTime + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/sound/volume", SoundVolume);
})();
