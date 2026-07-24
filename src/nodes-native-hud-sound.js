/* nodes-native-hud-sound.js -- NATIVE Hud and Sound node types: bare engine calls straight from the wiki
 * (docs/mercs2-luacd/wiki/namespaces/hud.md and sound.md), not Ess wrappers. See codegen.js's "Native
 * tier" section for what makes a Native node different from every Ess node in this repo: NATIVE_COLOR /
 * NATIVE_BGCOLOR set in every constructor below, and CodeGen.emitNative(line) instead of CodeGen.emit(line)
 * for every action node (auto-wraps the emitted line in pcall). Same three-part node shape nodes.js's own
 * header documents otherwise: exec/then action pins, addInput + addProperty + addWidget for values,
 * onAction emits one line of Lua then triggerSlot(0) to continue the chain; pure-data getters have no exec
 * pins and use onExecute + setOutputData instead, emitting the bare call EXPRESSION as Lua source text, no
 * pcall (nothing executes at graph-compile time -- see codegen.js's header for why).
 *
 * SKIPPED -- already covered by Ess.Hud / Ess.Sound wrappers in nodes-hud-sound.js (do not re-add here):
 *   Hud banner, hint, hideHint, objective, radio -- Sound CueSound, StopSound, CueAmbience, StopAmbience,
 *   SetMasterVolume (the last one is the native call underneath the already-covered Ess.Sound.volume).
 *
 * SKIPPED -- Hud.Tutorial family (SetText, ShowTutorialForObject, ShowTutorialOnscreen): the wiki's own
 * "Notes for modders" section says not to call Hud.Tutorial:SetText directly -- use the higher-level
 * MrxTutorialManager.ShowMessage/HideMessage instead (itself not part of this Hud namespace, and not
 * covered here either); the other two methods have zero call-site confirmation.
 *
 * SKIPPED -- Hud.MessageBox:ModifyPendingMessage / RemovePendingMessage: both require the message-id table
 * a prior AddMessage call RETURNS. This node graph has no mechanism to capture a real return value between
 * nodes -- every data wire carries Lua SOURCE TEXT, never an executed result (see codegen.js header) -- so
 * this two-step pairing genuinely can't be expressed as two fire-and-forget nodes.
 *
 * SKIPPED -- most of the Fanfare family beyond EventFanfare/CardFanfare/TextFanfare: Fanfare and
 * SupportFanfare need a multi-step Create -> AddItem -> Commence ledger build-up whose AddItem field shape
 * ("a ledger item") isn't concretely documented beyond "a table"; ContactFanfare:Commence's only confirmed
 * fields are the fCallback/tCallbackData pair this file omits by convention (see below), leaving nothing
 * left to expose; JobFanfare:Complete/Failed have zero call-site confirmation, purely presumed shape.
 *
 * SKIPPED -- most of Radar/ObjectiveTray beyond what's below: UpdateObjective duplicates AddObjective's own
 * field shape (not worth a second 7-field node); AnimateObjectiveAlpha, AnimateObjectiveSonar,
 * UnanimateObjective, AddLineRegion and RemoveLineRegion all have field shapes the wiki itself couldn't pin
 * down beyond "a table argument"; ObjectiveTray SetSlotToImage/SetSlotToWidget are similarly unconfirmed.
 * The "Everything else (no call sites checked in this pass)" section of hud.md is skipped in full, per the
 * page's own admission that it's unvetted.
 *
 * SKIPPED -- most of Sound's Dynamic Music beyond what's below: AddMusicState, AddMusicTransition and
 * ForceActionTransition; AddFactionMusic, SetRootFactionRegionMusic, SetHijackMusic, SetSourceMusic and the
 * whole SetSourceMusicTransition / AddSourceMusicEntryState / AddMusicSourcePlaylist cluster are, per the
 * wiki's own text, only ever observed as ONE-TIME state/transition/playlist REGISTRATION during
 * shell/mission init -- not a live action a mod script fires. The wiki's own modder notes call
 * Sound.TransitionMusic (included below) "the safest lever" for exactly this reason. SetSourceEnterMusic,
 * SetSourceExitMusic, SetCinematicMode, SetSystemPause, SetPauseFilter, SetMessageFiltering,
 * SetHostilityDecayRateMusic and IsActionLevelLockedMusic have zero call-site confirmation.
 *
 * SKIPPED -- Bank Loading section in full: asset-management plumbing (bank/wave-bank load+unload with type
 * strings and callbacks), not really a "mod action" a script fires; most entries are additionally
 * unconfirmed by call site.
 *
 * SKIPPED -- most of Mixing & Reverb beyond what's below: SetReverb is a legacy version-gated fallback for
 * SetReverbPreset per the wiki's own note; DefineReverbPreset has 14 of its 16 parameters individually
 * unconfirmed -- too blind to build a typed node around; the Get/SetCategoryVolume, Get/SetCategoryPitch,
 * Add/ClearFadeCategory, Add/ClearPitchCategory, SetLowPassFilter(Settings) and GetMaxDuration cluster are
 * all zero-call-site per the wiki (which itself flags them as an unconfirmed symmetric-API half).
 *
 * SKIPPED -- Misc/Internal section in full: both entries are underscore-prefixed per this codebase's own
 * private/internal naming convention -- _GetLibVersion is a build-version feature-gate, not a mod action;
 * _SummonEd has zero call sites and a purely speculative purpose.
 *
 * SKIPPED -- Sound's other Direct Cueing entries: PauseSound, TestCueSound, TestPauseSound, TestStopSound
 * and SilenceAmbience all have zero call-site confirmation (the Test trio is presumed debug/dev-console
 * only, by naming alone).
 *
 * CALLBACK PARAMETERS (fCallback, tCallbackData, onDone, etc.): omitted from every emitted table/call the
 * same way every other callback parameter is omitted across this node library -- see nodes-missions.js's
 * file header for that established convention. A litegraph data wire can't carry an executable Lua function
 * body, so there's nothing meaningful to wire in here.
 *
 * GUID / RAW EXPRESSION INPUTS: same convention as nodes-hud-sound.js and nodes-markers-camera.js -- a
 * "string" input that's actually a Lua SOURCE EXPRESSION, resolved via the local resolveRawInput helper
 * below and spliced UNQUOTED, never through CodeGen.luaString. Required guids default to the repo-wide
 * placeholder "Ess.Player.character(0)"; guids the wiki confirms are nil-safe (ObjectiveTray's vPlayer)
 * default to the literal unquoted "nil" instead.
 */
(function () {
  "use strict";

  // Resolve a node's input slot exactly like CodeGen.resolveNumberInput does (wired value wins, else the
  // property default) but without any numeric assumption -- used both for guid/raw-expression inputs
  // (spliced raw) and as the pre-quote step for plain string inputs (caller applies CodeGen.luaString
  // itself). Copied locally rather than centralized in codegen.js -- see nodes-hud-sound.js's header for
  // why this helper is intentionally duplicated per-file in this repo.
  function resolveRawInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  // ============================================================================================
  // HUD -- MessageBox
  // ============================================================================================

  // ============================================================
  // Native/Hud/MessageBoxAdd -- Hud.MessageBox:AddMessage({sMessage, nPriority, nDuration, bClearBuffer,
  // bAllowsAppends}). fCallback omitted (see file header); the returned message-id table is discarded here
  // (fire-and-forget) -- see file header for why ModifyPendingMessage/RemovePendingMessage are skipped.
  // ============================================================
  function HudMessageBoxAdd() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("message", "string");
    this.addProperty("message", "Objective updated.");
    this.addWidget("text", "message", this.properties.message, function (v) { this.properties.message = v; }.bind(this));
    this.addInput("priority", "number");
    this.addProperty("priority", 1);
    this.addWidget("number", "priority", this.properties.priority, function (v) { this.properties.priority = v; }.bind(this));
    this.addInput("duration", "number");
    this.addProperty("duration", 5);
    this.addWidget("number", "duration", this.properties.duration, function (v) { this.properties.duration = v; }.bind(this));
    this.addProperty("clearBuffer", true);
    this.addWidget("toggle", "clearBuffer", this.properties.clearBuffer, function (v) { this.properties.clearBuffer = v; }.bind(this));
    this.addProperty("allowAppends", false);
    this.addWidget("toggle", "allowAppends", this.properties.allowAppends, function (v) { this.properties.allowAppends = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudMessageBoxAdd.title = "MessageBox: Add Message";
  HudMessageBoxAdd.desc = "Hud.MessageBox:AddMessage({sMessage, nPriority, nDuration, bClearBuffer, bAllowsAppends}) -- confirmed extensively (e.g. resident/mrxguiinterface.lua DisplayObjectiveMessage)";
  HudMessageBoxAdd.prototype.onAction = function () {
    var message = resolveRawInput(this, 1, "message");  // input 0 is "exec"
    var priority = CodeGen.resolveNumberInput(this, 2, "priority");
    var duration = CodeGen.resolveNumberInput(this, 3, "duration");
    var clearBuffer = this.properties.clearBuffer ? "true" : "false";
    var allowAppends = this.properties.allowAppends ? "true" : "false";
    CodeGen.emitNative("Hud.MessageBox:AddMessage({sMessage = " + CodeGen.luaString(message) + ", nPriority = " + priority + ", nDuration = " + duration + ", bClearBuffer = " + clearBuffer + ", bAllowsAppends = " + allowAppends + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/messageboxadd", HudMessageBoxAdd);

  // ============================================================
  // Native/Hud/MessageBoxClear -- Hud.MessageBox:Clear({}). Confirmed in resident/mrxtaskcontract.lua.
  // ============================================================
  function HudMessageBoxClear() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudMessageBoxClear.title = "MessageBox: Clear";
  HudMessageBoxClear.desc = "Hud.MessageBox:Clear({})";
  HudMessageBoxClear.prototype.onAction = function () {
    CodeGen.emitNative("Hud.MessageBox:Clear({})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/messageboxclear", HudMessageBoxClear);

  // ============================================================================================
  // HUD -- Fanfare family
  // ============================================================================================

  // ============================================================
  // Native/Hud/EventFanfare -- Hud.EventFanfare:Commence({sType, vText}). Confirmed working by live
  // testing per the wiki. sType must be a key in the engine's internal texture/title/sound lookup table or
  // the call is a silent no-op -- there are exactly 9 real values shipped in the game.
  // ============================================================
  function HudEventFanfare() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("sType", "string");
    this.addProperty("sType", "contact");
    this.addWidget("text", "sType", this.properties.sType, function (v) { this.properties.sType = v; }.bind(this));
    this.addInput("text", "string");
    this.addProperty("text", "New contact acquired.");
    this.addWidget("text", "text", this.properties.text, function (v) { this.properties.text = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudEventFanfare.title = "Fanfare: Event";
  HudEventFanfare.desc = "Hud.EventFanfare:Commence({sType, vText}) -- confirmed working by live testing. sType must be one of: contact, support, stockpile, landingzone, hvtcapture, hvtkill, bounty, outfit, highscore -- any other value is a silent no-op (the wiki documents a way to inject a custom sType via MrxGuiHudMessage._tEventTextures if you need an arbitrary icon-free centered toast instead)";
  HudEventFanfare.prototype.onAction = function () {
    var sType = resolveRawInput(this, 1, "sType");  // input 0 is "exec"
    var text = resolveRawInput(this, 2, "text");
    CodeGen.emitNative("Hud.EventFanfare:Commence({sType = " + CodeGen.luaString(sType) + ", vText = " + CodeGen.luaString(text) + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/eventfanfare", HudEventFanfare);

  // ============================================================
  // Native/Hud/CardFanfare -- Hud.CardFanfare:Commence({sFaction, sTitle, sName, sJobTitle, sPhone1,
  // sPhone2, sEmail, nDisplayTime}). Full field list read directly from the resident/mrxguiinterface.lua
  // implementation; fCallback/tCallbackData omitted (see file header).
  // ============================================================
  function HudCardFanfare() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("faction", "string");
    this.addProperty("faction", "VZ");
    this.addWidget("text", "faction", this.properties.faction, function (v) { this.properties.faction = v; }.bind(this));
    this.addInput("title", "string");
    this.addProperty("title", "New Contact");
    this.addWidget("text", "title", this.properties.title, function (v) { this.properties.title = v; }.bind(this));
    this.addInput("name", "string");
    this.addProperty("name", "Jane Doe");
    this.addWidget("text", "name", this.properties.name, function (v) { this.properties.name = v; }.bind(this));
    this.addInput("jobTitle", "string");
    this.addProperty("jobTitle", "Fixer");
    this.addWidget("text", "jobTitle", this.properties.jobTitle, function (v) { this.properties.jobTitle = v; }.bind(this));
    this.addInput("phone1", "string");
    this.addProperty("phone1", "555-0100");
    this.addWidget("text", "phone1", this.properties.phone1, function (v) { this.properties.phone1 = v; }.bind(this));
    this.addInput("phone2", "string");
    this.addProperty("phone2", "");
    this.addWidget("text", "phone2", this.properties.phone2, function (v) { this.properties.phone2 = v; }.bind(this));
    this.addInput("email", "string");
    this.addProperty("email", "");
    this.addWidget("text", "email", this.properties.email, function (v) { this.properties.email = v; }.bind(this));
    this.addInput("displayTime", "number");
    this.addProperty("displayTime", 6);
    this.addWidget("number", "displayTime", this.properties.displayTime, function (v) { this.properties.displayTime = v; }.bind(this));
    this.size = [240, 260];
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudCardFanfare.title = "Fanfare: Card";
  HudCardFanfare.desc = "Hud.CardFanfare:Commence({sFaction, sTitle, sName, sJobTitle, sPhone1, sPhone2, sEmail, nDisplayTime}) -- full field list confirmed direct from source; fCallback/tCallbackData omitted (see file header)";
  HudCardFanfare.prototype.onAction = function () {
    var faction = resolveRawInput(this, 1, "faction");  // input 0 is "exec"
    var title = resolveRawInput(this, 2, "title");
    var name = resolveRawInput(this, 3, "name");
    var jobTitle = resolveRawInput(this, 4, "jobTitle");
    var phone1 = resolveRawInput(this, 5, "phone1");
    var phone2 = resolveRawInput(this, 6, "phone2");
    var email = resolveRawInput(this, 7, "email");
    var displayTime = CodeGen.resolveNumberInput(this, 8, "displayTime");
    CodeGen.emitNative("Hud.CardFanfare:Commence({sFaction = " + CodeGen.luaString(faction) + ", sTitle = " + CodeGen.luaString(title) + ", sName = " + CodeGen.luaString(name) + ", sJobTitle = " + CodeGen.luaString(jobTitle) + ", sPhone1 = " + CodeGen.luaString(phone1) + ", sPhone2 = " + CodeGen.luaString(phone2) + ", sEmail = " + CodeGen.luaString(email) + ", nDisplayTime = " + displayTime + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/cardfanfare", HudCardFanfare);

  // ============================================================
  // Native/Hud/TextFanfare -- Hud.TextFanfare:Commence({sLine1, sLine2, nEntranceTime, nDisplayTime,
  // nFadeTime}). Field list confirmed from the resident/mrxguiinterface.lua implementation; no direct
  // top-level call site found. fCallback/tCallbackData omitted (see file header).
  // ============================================================
  function HudTextFanfare() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("line1", "string");
    this.addProperty("line1", "MISSION COMPLETE");
    this.addWidget("text", "line1", this.properties.line1, function (v) { this.properties.line1 = v; }.bind(this));
    this.addInput("line2", "string");
    this.addProperty("line2", "");
    this.addWidget("text", "line2", this.properties.line2, function (v) { this.properties.line2 = v; }.bind(this));
    this.addInput("entranceTime", "number");
    this.addProperty("entranceTime", 0.5);
    this.addWidget("number", "entranceTime", this.properties.entranceTime, function (v) { this.properties.entranceTime = v; }.bind(this));
    this.addInput("displayTime", "number");
    this.addProperty("displayTime", 4);
    this.addWidget("number", "displayTime", this.properties.displayTime, function (v) { this.properties.displayTime = v; }.bind(this));
    this.addInput("fadeTime", "number");
    this.addProperty("fadeTime", 0.5);
    this.addWidget("number", "fadeTime", this.properties.fadeTime, function (v) { this.properties.fadeTime = v; }.bind(this));
    this.size = [220, 200];
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudTextFanfare.title = "Fanfare: Text";
  HudTextFanfare.desc = "Hud.TextFanfare:Commence({sLine1, sLine2, nEntranceTime, nDisplayTime, nFadeTime}) -- field list confirmed from source implementation, no direct top-level call site found; fCallback/tCallbackData omitted (see file header)";
  HudTextFanfare.prototype.onAction = function () {
    var line1 = resolveRawInput(this, 1, "line1");  // input 0 is "exec"
    var line2 = resolveRawInput(this, 2, "line2");
    var entranceTime = CodeGen.resolveNumberInput(this, 3, "entranceTime");
    var displayTime = CodeGen.resolveNumberInput(this, 4, "displayTime");
    var fadeTime = CodeGen.resolveNumberInput(this, 5, "fadeTime");
    CodeGen.emitNative("Hud.TextFanfare:Commence({sLine1 = " + CodeGen.luaString(line1) + ", sLine2 = " + CodeGen.luaString(line2) + ", nEntranceTime = " + entranceTime + ", nDisplayTime = " + displayTime + ", nFadeTime = " + fadeTime + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/textfanfare", HudTextFanfare);

  // ============================================================================================
  // HUD -- Radar
  // ============================================================================================

  // ============================================================
  // Native/Hud/RadarAddObjective -- Hud.Radar:AddObjective({sName, nR, nG, nB, sTexture, uGuid, bSticky}).
  // Confirmed extensively across many call sites. nWidth/nHeight/bRotate/bOriented/nSortOrder/bDontNetSync
  // omitted to keep this node's field count manageable (see file header) -- sName is the key Radar: Remove
  // Objective must match to remove this blip later, same pairing pattern as Ess.Hud.hint/hideHint's id.
  // ============================================================
  function HudRadarAddObjective() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("name", "string");
    this.addProperty("name", "blip1");
    this.addWidget("text", "name", this.properties.name, function (v) { this.properties.name = v; }.bind(this));
    this.addInput("r", "number");
    this.addProperty("r", 255);
    this.addWidget("number", "r", this.properties.r, function (v) { this.properties.r = v; }.bind(this));
    this.addInput("g", "number");
    this.addProperty("g", 255);
    this.addWidget("number", "g", this.properties.g, function (v) { this.properties.g = v; }.bind(this));
    this.addInput("b", "number");
    this.addProperty("b", 255);
    this.addWidget("number", "b", this.properties.b, function (v) { this.properties.b = v; }.bind(this));
    this.addInput("texture", "string");
    this.addProperty("texture", "unlockables_newstockpileitem");
    this.addWidget("text", "texture", this.properties.texture, function (v) { this.properties.texture = v; }.bind(this));
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("sticky", true);
    this.addWidget("toggle", "sticky", this.properties.sticky, function (v) { this.properties.sticky = v; }.bind(this));
    this.size = [220, 220];
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudRadarAddObjective.title = "Radar: Add Objective";
  HudRadarAddObjective.desc = "Hud.Radar:AddObjective({sName, nR, nG, nB, sTexture, uGuid, bSticky}) -- confirmed extensively; nR/nG/nB scale unconfirmed (assumed 0-255); nWidth/nHeight/bRotate/bOriented/nSortOrder/bDontNetSync omitted (see file header)";
  HudRadarAddObjective.prototype.onAction = function () {
    var name = resolveRawInput(this, 1, "name");  // input 0 is "exec"
    var r = CodeGen.resolveNumberInput(this, 2, "r");
    var g = CodeGen.resolveNumberInput(this, 3, "g");
    var b = CodeGen.resolveNumberInput(this, 4, "b");
    var texture = resolveRawInput(this, 5, "texture");
    var guid = resolveRawInput(this, 6, "guid");  // raw Lua EXPRESSION, spliced unquoted
    var sticky = this.properties.sticky ? "true" : "false";
    CodeGen.emitNative("Hud.Radar:AddObjective({sName = " + CodeGen.luaString(name) + ", nR = " + r + ", nG = " + g + ", nB = " + b + ", sTexture = " + CodeGen.luaString(texture) + ", uGuid = " + guid + ", bSticky = " + sticky + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/radaraddobjective", HudRadarAddObjective);

  // ============================================================
  // Native/Hud/RadarRemoveObjective -- Hud.Radar:RemoveObjective({sName, bDontNetSync}). sName must match a
  // name previously used with Radar: Add Objective.
  // ============================================================
  function HudRadarRemoveObjective() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("name", "string");
    this.addProperty("name", "blip1");
    this.addWidget("text", "name", this.properties.name, function (v) { this.properties.name = v; }.bind(this));
    this.addProperty("dontNetSync", false);
    this.addWidget("toggle", "dontNetSync", this.properties.dontNetSync, function (v) { this.properties.dontNetSync = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudRadarRemoveObjective.title = "Radar: Remove Objective";
  HudRadarRemoveObjective.desc = "Hud.Radar:RemoveObjective({sName, bDontNetSync}) -- sName must match a name previously used with Radar: Add Objective";
  HudRadarRemoveObjective.prototype.onAction = function () {
    var name = resolveRawInput(this, 1, "name");  // input 0 is "exec"
    var dontNetSync = this.properties.dontNetSync ? "true" : "false";
    CodeGen.emitNative("Hud.Radar:RemoveObjective({sName = " + CodeGen.luaString(name) + ", bDontNetSync = " + dontNetSync + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/radarremoveobjective", HudRadarRemoveObjective);

  // ============================================================
  // Native/Hud/RadarAnimateSize -- Hud.Radar:AnimateObjectiveSize({sName}). The signature's trailing "..."
  // fields are unconfirmed and omitted -- the one confirmed real call site uses only sName.
  // ============================================================
  function HudRadarAnimateSize() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("name", "string");
    this.addProperty("name", "blip1");
    this.addWidget("text", "name", this.properties.name, function (v) { this.properties.name = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudRadarAnimateSize.title = "Radar: Animate Objective Size";
  HudRadarAnimateSize.desc = "Hud.Radar:AnimateObjectiveSize({sName}) -- confirmed call site uses only sName; the signature's trailing fields are unconfirmed and omitted";
  HudRadarAnimateSize.prototype.onAction = function () {
    var name = resolveRawInput(this, 1, "name");  // input 0 is "exec"
    CodeGen.emitNative("Hud.Radar:AnimateObjectiveSize({sName = " + CodeGen.luaString(name) + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/radaranimatesize", HudRadarAnimateSize);

  // ============================================================================================
  // HUD -- ObjectiveTray
  // ============================================================================================

  // ============================================================
  // Native/Hud/TraySetText -- Hud.ObjectiveTray:SetSlotToText({vPlayer, nSlot, sText}). Extremely common
  // across mission scripts. vPlayer nil is confirmed at several call sites (appears to mean "all players").
  // ============================================================
  function HudTraySetText() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("player", "string");
    this.addProperty("player", "nil");
    this.addWidget("text", "player (nil = all)", this.properties.player, function (v) { this.properties.player = v; }.bind(this));
    this.addInput("slot", "number");
    this.addProperty("slot", 1);
    this.addWidget("number", "slot", this.properties.slot, function (v) { this.properties.slot = v; }.bind(this));
    this.addInput("text", "string");
    this.addProperty("text", "Reach the extraction point");
    this.addWidget("text", "text", this.properties.text, function (v) { this.properties.text = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudTraySetText.title = "Objective Tray: Set Slot Text";
  HudTraySetText.desc = "Hud.ObjectiveTray:SetSlotToText({vPlayer, nSlot, sText}) -- extremely common across mission scripts; vPlayer nil is confirmed at several call sites";
  HudTraySetText.prototype.onAction = function () {
    var player = resolveRawInput(this, 1, "player");  // input 0 is "exec" -- raw Lua EXPRESSION, spliced unquoted
    var slot = CodeGen.resolveNumberInput(this, 2, "slot");
    var text = resolveRawInput(this, 3, "text");
    CodeGen.emitNative("Hud.ObjectiveTray:SetSlotToText({vPlayer = " + player + ", nSlot = " + slot + ", sText = " + CodeGen.luaString(text) + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/traysettext", HudTraySetText);

  // ============================================================
  // Native/Hud/TrayClearSlot -- Hud.ObjectiveTray:ClearSlot({vPlayer, nSlot}). vPlayer appears optional.
  // ============================================================
  function HudTrayClearSlot() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("player", "string");
    this.addProperty("player", "nil");
    this.addWidget("text", "player (nil = all)", this.properties.player, function (v) { this.properties.player = v; }.bind(this));
    this.addInput("slot", "number");
    this.addProperty("slot", 1);
    this.addWidget("number", "slot", this.properties.slot, function (v) { this.properties.slot = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudTrayClearSlot.title = "Objective Tray: Clear Slot";
  HudTrayClearSlot.desc = "Hud.ObjectiveTray:ClearSlot({vPlayer, nSlot}) -- extremely common alongside Set Slot Text; vPlayer appears optional/nil-safe";
  HudTrayClearSlot.prototype.onAction = function () {
    var player = resolveRawInput(this, 1, "player");  // input 0 is "exec" -- raw Lua EXPRESSION, spliced unquoted
    var slot = CodeGen.resolveNumberInput(this, 2, "slot");
    CodeGen.emitNative("Hud.ObjectiveTray:ClearSlot({vPlayer = " + player + ", nSlot = " + slot + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/trayclearslot", HudTrayClearSlot);

  // ============================================================================================
  // HUD -- ResourceCounter
  // ============================================================================================

  // ============================================================
  // Native/Hud/ResourceSetCash -- Hud.ResourceCounter:SetCash({nValue, sReason, nIncrement}). Drives the
  // HUD's cash READOUT directly -- it does not change the player's actual cash balance (pair with
  // Ess.Player.giveCash for a real balance change).
  // ============================================================
  function HudResourceSetCash() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("value", "number");
    this.addProperty("value", 1000);
    this.addWidget("number", "value", this.properties.value, function (v) { this.properties.value = v; }.bind(this));
    this.addInput("reason", "string");
    this.addProperty("reason", "");
    this.addWidget("text", "reason (blank = nil)", this.properties.reason, function (v) { this.properties.reason = v; }.bind(this));
    this.addInput("increment", "number");
    this.addProperty("increment", 0);
    this.addWidget("number", "increment", this.properties.increment, function (v) { this.properties.increment = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudResourceSetCash.title = "Resource Counter: Set Cash";
  HudResourceSetCash.desc = "Hud.ResourceCounter:SetCash({nValue, sReason, nIncrement}) -- drives the HUD cash readout directly, not the player's real cash balance (pair with Ess.Player.giveCash for that)";
  HudResourceSetCash.prototype.onAction = function () {
    var value = CodeGen.resolveNumberInput(this, 1, "value");  // input 0 is "exec"
    var reason = resolveRawInput(this, 2, "reason");
    var increment = CodeGen.resolveNumberInput(this, 3, "increment");
    var sReason = (reason && String(reason).trim()) ? CodeGen.luaString(reason) : "nil";
    CodeGen.emitNative("Hud.ResourceCounter:SetCash({nValue = " + value + ", sReason = " + sReason + ", nIncrement = " + increment + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/resourcesetcash", HudResourceSetCash);

  // ============================================================
  // Native/Hud/ResourceSetFuel -- Hud.ResourceCounter:SetFuel({nValue, nMax, nIncrement}).
  // ============================================================
  function HudResourceSetFuel() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("value", "number");
    this.addProperty("value", 100);
    this.addWidget("number", "value", this.properties.value, function (v) { this.properties.value = v; }.bind(this));
    this.addInput("max", "number");
    this.addProperty("max", 100);
    this.addWidget("number", "max", this.properties.max, function (v) { this.properties.max = v; }.bind(this));
    this.addInput("increment", "number");
    this.addProperty("increment", 0);
    this.addWidget("number", "increment", this.properties.increment, function (v) { this.properties.increment = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudResourceSetFuel.title = "Resource Counter: Set Fuel";
  HudResourceSetFuel.desc = "Hud.ResourceCounter:SetFuel({nValue, nMax, nIncrement}) -- drives the HUD fuel readout directly";
  HudResourceSetFuel.prototype.onAction = function () {
    var value = CodeGen.resolveNumberInput(this, 1, "value");  // input 0 is "exec"
    var max = CodeGen.resolveNumberInput(this, 2, "max");
    var increment = CodeGen.resolveNumberInput(this, 3, "increment");
    CodeGen.emitNative("Hud.ResourceCounter:SetFuel({nValue = " + value + ", nMax = " + max + ", nIncrement = " + increment + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/resourcesetfuel", HudResourceSetFuel);

  // ============================================================
  // Native/Hud/ResourceSetSuppressed -- Hud.ResourceCounter:SetSuppressed({bSuppressCash, bSuppressFuel}).
  // ============================================================
  function HudResourceSetSuppressed() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("suppressCash", true);
    this.addWidget("toggle", "suppressCash", this.properties.suppressCash, function (v) { this.properties.suppressCash = v; }.bind(this));
    this.addProperty("suppressFuel", true);
    this.addWidget("toggle", "suppressFuel", this.properties.suppressFuel, function (v) { this.properties.suppressFuel = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudResourceSetSuppressed.title = "Resource Counter: Set Suppressed";
  HudResourceSetSuppressed.desc = "Hud.ResourceCounter:SetSuppressed({bSuppressCash, bSuppressFuel}) -- hides/shows the cash and fuel readouts independently";
  HudResourceSetSuppressed.prototype.onAction = function () {
    var suppressCash = this.properties.suppressCash ? "true" : "false";
    var suppressFuel = this.properties.suppressFuel ? "true" : "false";
    CodeGen.emitNative("Hud.ResourceCounter:SetSuppressed({bSuppressCash = " + suppressCash + ", bSuppressFuel = " + suppressFuel + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/resourcesetsuppressed", HudResourceSetSuppressed);

  // ============================================================
  // Native/Hud/ResourceShow -- Hud.ResourceCounter:Show({nDuration}). Confirmed call site uses -1.
  // ============================================================
  function HudResourceShow() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("duration", "number");
    this.addProperty("duration", -1);
    this.addWidget("number", "duration (-1 = indefinite)", this.properties.duration, function (v) { this.properties.duration = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudResourceShow.title = "Resource Counter: Show";
  HudResourceShow.desc = "Hud.ResourceCounter:Show({nDuration}) -- confirmed call site uses nDuration = -1";
  HudResourceShow.prototype.onAction = function () {
    var duration = CodeGen.resolveNumberInput(this, 1, "duration");  // input 0 is "exec"
    CodeGen.emitNative("Hud.ResourceCounter:Show({nDuration = " + duration + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/resourceshow", HudResourceShow);

  // ============================================================
  // Native/Hud/ResourceHide -- Hud.ResourceCounter:Hide({}). Confirmed in resident/mrxbriefing.lua.
  // ============================================================
  function HudResourceHide() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  HudResourceHide.title = "Resource Counter: Hide";
  HudResourceHide.desc = "Hud.ResourceCounter:Hide({})";
  HudResourceHide.prototype.onAction = function () {
    CodeGen.emitNative("Hud.ResourceCounter:Hide({})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/hud/resourcehide", HudResourceHide);

  // ============================================================================================
  // SOUND -- Direct Sound & Ambience Cueing extras (not already covered by Ess.Sound.*)
  // ============================================================================================

  // ============================================================
  // Native/Sound/StopAndFlushAll -- Sound.StopAndFlushAllSounds(). Real scripts guard this behind an
  // existence check (a later-build addition); emitNative's pcall wrap makes that guard unnecessary here.
  // ============================================================
  function SoundStopAndFlushAll() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundStopAndFlushAll.title = "Sound: Stop And Flush All";
  SoundStopAndFlushAll.desc = "Sound.StopAndFlushAllSounds() -- real scripts guard this behind an existence check (later-build addition); pcall wrap here makes that unnecessary";
  SoundStopAndFlushAll.prototype.onAction = function () {
    CodeGen.emitNative("Sound.StopAndFlushAllSounds()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/stopandflushall", SoundStopAndFlushAll);

  // ============================================================
  // Native/Sound/RequestAmbienceBank -- Sound.RequestAmbienceBank(sBankName). Loads the wave bank an
  // ambience stream needs before Ess.Sound.ambience cues it.
  // ============================================================
  function SoundRequestAmbienceBank() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("bank", "string");
    this.addProperty("bank", "AMB_City");
    this.addWidget("text", "bank", this.properties.bank, function (v) { this.properties.bank = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundRequestAmbienceBank.title = "Sound: Request Ambience Bank";
  SoundRequestAmbienceBank.desc = "Sound.RequestAmbienceBank(sBankName) -- confirmed with a single localized bank-name string; loads the bank an ambience stream needs before Ess.Sound.ambience cues it";
  SoundRequestAmbienceBank.prototype.onAction = function () {
    var bank = resolveRawInput(this, 1, "bank");  // input 0 is "exec"
    CodeGen.emitNative("Sound.RequestAmbienceBank(" + CodeGen.luaString(bank) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/requestambiencebank", SoundRequestAmbienceBank);

  // ============================================================
  // Native/Sound/VehicleEngineBoost -- Sound.SetVehicleEngineBoost(uGuid, nBoostLevel). uGuid is a vehicle,
  // not a character -- the default placeholder below is the repo-wide "keeps the call syntactically valid"
  // convention, not a real vehicle; wire in an actual vehicle guid.
  // ============================================================
  function SoundVehicleEngineBoost() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid (vehicle)", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addInput("level", "number");
    this.addProperty("level", 1);
    this.addWidget("number", "level", this.properties.level, function (v) { this.properties.level = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundVehicleEngineBoost.title = "Sound: Vehicle Engine Boost";
  SoundVehicleEngineBoost.desc = "Sound.SetVehicleEngineBoost(uGuid, nBoostLevel) -- confirmed with a vehicle guid and nBoostLevel observed as 0/1; guid default is the repo-wide placeholder, not a real vehicle -- wire in an actual vehicle guid";
  SoundVehicleEngineBoost.prototype.onAction = function () {
    var guid = resolveRawInput(this, 1, "guid");  // input 0 is "exec" -- raw Lua EXPRESSION, spliced unquoted
    var level = CodeGen.resolveNumberInput(this, 2, "level");
    CodeGen.emitNative("Sound.SetVehicleEngineBoost(" + guid + ", " + level + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/vehicleengineboost", SoundVehicleEngineBoost);

  // ============================================================================================
  // SOUND -- Dynamic Music System (entirely new capability, not touched by Ess at all)
  // ============================================================================================

  // ============================================================
  // Native/Sound/SetDynamicMusic -- Sound.SetDynamicMusic(bEnabled). Very common in real scripts.
  // ============================================================
  function SoundSetDynamicMusic() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("enabled", true);
    this.addWidget("toggle", "enabled", this.properties.enabled, function (v) { this.properties.enabled = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundSetDynamicMusic.title = "Music: Set Dynamic Music";
  SoundSetDynamicMusic.desc = "Sound.SetDynamicMusic(bEnabled) -- very common, toggles the engine's dynamic music system on/off";
  SoundSetDynamicMusic.prototype.onAction = function () {
    var enabled = this.properties.enabled ? "true" : "false";
    CodeGen.emitNative("Sound.SetDynamicMusic(" + enabled + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/setdynamicmusic", SoundSetDynamicMusic);

  // ============================================================
  // Native/Sound/IsDynamicMusic -- a PURE DATA node wrapping Sound.IsDynamicMusic() -> bool.
  // ============================================================
  function SoundIsDynamicMusic() {
    this.addOutput("enabled", "boolean");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundIsDynamicMusic.title = "Music: Is Dynamic Music";
  SoundIsDynamicMusic.desc = "Sound.IsDynamicMusic() -- emits Lua source, not a resolved boolean (see codegen.js header)";
  SoundIsDynamicMusic.prototype.onExecute = function () {
    this.setOutputData(0, "Sound.IsDynamicMusic()");
  };
  LiteGraph.registerNodeType("native/sound/isdynamicmusic", SoundIsDynamicMusic);

  // ============================================================
  // Native/Sound/SetActionLevels -- Sound.SetActionLevelsMusic(nLevel, n2, n3, n4). Confirmed with 4
  // numeric args; nLevel observed as 0/3/10/15 forcing/raising the current action level. The trailing 3 are
  // always 0 at every call site seen -- meaning unconfirmed, exposed anyway for full fidelity.
  // ============================================================
  function SoundSetActionLevels() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("level", "number");
    this.addProperty("level", 10);
    this.addWidget("number", "level", this.properties.level, function (v) { this.properties.level = v; }.bind(this));
    this.addInput("n2", "number");
    this.addProperty("n2", 0);
    this.addWidget("number", "n2 (always 0 observed)", this.properties.n2, function (v) { this.properties.n2 = v; }.bind(this));
    this.addInput("n3", "number");
    this.addProperty("n3", 0);
    this.addWidget("number", "n3 (always 0 observed)", this.properties.n3, function (v) { this.properties.n3 = v; }.bind(this));
    this.addInput("n4", "number");
    this.addProperty("n4", 0);
    this.addWidget("number", "n4 (always 0 observed)", this.properties.n4, function (v) { this.properties.n4 = v; }.bind(this));
    this.size = [220, 180];
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundSetActionLevels.title = "Music: Set Action Levels";
  SoundSetActionLevels.desc = "Sound.SetActionLevelsMusic(nLevel, n2, n3, n4) -- confirmed with 4 numeric args, nLevel observed as 0/3/10/15; trailing 3 args always 0 at every call site, meaning unconfirmed";
  SoundSetActionLevels.prototype.onAction = function () {
    var level = CodeGen.resolveNumberInput(this, 1, "level");  // input 0 is "exec"
    var n2 = CodeGen.resolveNumberInput(this, 2, "n2");
    var n3 = CodeGen.resolveNumberInput(this, 3, "n3");
    var n4 = CodeGen.resolveNumberInput(this, 4, "n4");
    CodeGen.emitNative("Sound.SetActionLevelsMusic(" + level + ", " + n2 + ", " + n3 + ", " + n4 + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/setactionlevels", SoundSetActionLevels);

  // ============================================================
  // Native/Sound/LockActionLevel -- Sound.LockActionLevelMusic(bLocked). Very common, holds a forced action
  // level in place, typically paired with Set Action Levels.
  // ============================================================
  function SoundLockActionLevel() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("locked", true);
    this.addWidget("toggle", "locked", this.properties.locked, function (v) { this.properties.locked = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundLockActionLevel.title = "Music: Lock Action Level";
  SoundLockActionLevel.desc = "Sound.LockActionLevelMusic(bLocked) -- very common, holds a forced action level in place (typically paired with Set Action Levels)";
  SoundLockActionLevel.prototype.onAction = function () {
    var locked = this.properties.locked ? "true" : "false";
    CodeGen.emitNative("Sound.LockActionLevelMusic(" + locked + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/lockactionlevel", SoundLockActionLevel);

  // ============================================================
  // Native/Sound/SetActionThresholds -- Sound.SetActionThresholdsMusic(sState, n2, n3). Confirmed only ever
  // called with sState = "none" or "explore" (always n2=2, n3=0) in the decompiled corpus.
  // ============================================================
  function SoundSetActionThresholds() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("state", "string");
    this.addProperty("state", "explore");
    this.addWidget("text", "state", this.properties.state, function (v) { this.properties.state = v; }.bind(this));
    this.addInput("n2", "number");
    this.addProperty("n2", 2);
    this.addWidget("number", "n2", this.properties.n2, function (v) { this.properties.n2 = v; }.bind(this));
    this.addInput("n3", "number");
    this.addProperty("n3", 0);
    this.addWidget("number", "n3", this.properties.n3, function (v) { this.properties.n3 = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundSetActionThresholds.title = "Music: Set Action Thresholds";
  SoundSetActionThresholds.desc = "Sound.SetActionThresholdsMusic(sState, n2, n3) -- confirmed only ever called with sState = none or explore (always n2=2, n3=0); other state names are unconfirmed";
  SoundSetActionThresholds.prototype.onAction = function () {
    var state = resolveRawInput(this, 1, "state");  // input 0 is "exec"
    var n2 = CodeGen.resolveNumberInput(this, 2, "n2");
    var n3 = CodeGen.resolveNumberInput(this, 3, "n3");
    CodeGen.emitNative("Sound.SetActionThresholdsMusic(" + CodeGen.luaString(state) + ", " + n2 + ", " + n3 + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/setactionthresholds", SoundSetActionThresholds);

  // ============================================================
  // Native/Sound/TransitionMusic -- Sound.TransitionMusic(sState, bFlag). The real runtime trigger that
  // moves the music state machine -- per the wiki's own modder notes, this is "the safest lever" for custom
  // music behavior (registering brand new states via AddMusicState/AddMusicTransition is init-time-only and
  // skipped here, see file header). bFlag's meaning is unconfirmed; always emitted literally per this
  // repo's usual optional-bool convention.
  // ============================================================
  function SoundTransitionMusic() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("state", "string");
    this.addProperty("state", "action");
    this.addWidget("text", "state", this.properties.state, function (v) { this.properties.state = v; }.bind(this));
    this.addProperty("flag", false);
    this.addWidget("toggle", "flag (meaning unconfirmed)", this.properties.flag, function (v) { this.properties.flag = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundTransitionMusic.title = "Music: Transition";
  SoundTransitionMusic.desc = "Sound.TransitionMusic(sState, bFlag) -- the real runtime trigger that moves the music state machine; the wiki's own modder notes call this the safest lever. sState must already be registered: none, explore, action, high_action, mission_success, mission_failure, hijack, hijack_success, hijack_success_resume, source, shell, pause, silence";
  SoundTransitionMusic.prototype.onAction = function () {
    var state = resolveRawInput(this, 1, "state");  // input 0 is "exec"
    var flag = this.properties.flag ? "true" : "false";
    CodeGen.emitNative("Sound.TransitionMusic(" + CodeGen.luaString(state) + ", " + flag + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/transitionmusic", SoundTransitionMusic);

  // ============================================================
  // Native/Sound/BindMusicCue -- Sound.BindMusicCue(sCue, sState).
  // ============================================================
  function SoundBindMusicCue() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("cue", "string");
    this.addProperty("cue", "mus_action_loop_01");
    this.addWidget("text", "cue", this.properties.cue, function (v) { this.properties.cue = v; }.bind(this));
    this.addInput("state", "string");
    this.addProperty("state", "action");
    this.addWidget("text", "state", this.properties.state, function (v) { this.properties.state = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundBindMusicCue.title = "Music: Bind Music Cue";
  SoundBindMusicCue.desc = "Sound.BindMusicCue(sCue, sState) -- confirmed with a cue string and a state string, binds a music cue to play during a given music state";
  SoundBindMusicCue.prototype.onAction = function () {
    var cue = resolveRawInput(this, 1, "cue");  // input 0 is "exec"
    var state = resolveRawInput(this, 2, "state");
    CodeGen.emitNative("Sound.BindMusicCue(" + CodeGen.luaString(cue) + ", " + CodeGen.luaString(state) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/bindmusiccue", SoundBindMusicCue);

  // ============================================================
  // Native/Sound/ClearMusicCues -- Sound.ClearMusicCues(sState). Typically called immediately before
  // re-binding with Bind Music Cue.
  // ============================================================
  function SoundClearMusicCues() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("state", "string");
    this.addProperty("state", "action");
    this.addWidget("text", "state", this.properties.state, function (v) { this.properties.state = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundClearMusicCues.title = "Music: Clear Music Cues";
  SoundClearMusicCues.desc = "Sound.ClearMusicCues(sState) -- confirmed with a single state-name string, clears cues previously bound to that state";
  SoundClearMusicCues.prototype.onAction = function () {
    var state = resolveRawInput(this, 1, "state");  // input 0 is "exec"
    CodeGen.emitNative("Sound.ClearMusicCues(" + CodeGen.luaString(state) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/clearmusiccues", SoundClearMusicCues);

  // ============================================================
  // Native/Sound/SetFactionMusic -- Sound.SetFactionMusic(sFaction). The confirmed runtime control surface
  // for faction music (unlike AddFactionMusic/SetRootFactionRegionMusic, which are init-only -- see file
  // header).
  // ============================================================
  function SoundSetFactionMusic() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("faction", "string");
    this.addProperty("faction", "VZ");
    this.addWidget("text", "faction", this.properties.faction, function (v) { this.properties.faction = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundSetFactionMusic.title = "Music: Set Faction Music";
  SoundSetFactionMusic.desc = "Sound.SetFactionMusic(sFaction) -- confirmed with a single faction-name string, selects that faction's music";
  SoundSetFactionMusic.prototype.onAction = function () {
    var faction = resolveRawInput(this, 1, "faction");  // input 0 is "exec"
    CodeGen.emitNative("Sound.SetFactionMusic(" + CodeGen.luaString(faction) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/setfactionmusic", SoundSetFactionMusic);

  // ============================================================
  // Native/Sound/LockFactionMusic -- Sound.LockFactionMusic(bLocked).
  // ============================================================
  function SoundLockFactionMusic() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("locked", true);
    this.addWidget("toggle", "locked", this.properties.locked, function (v) { this.properties.locked = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundLockFactionMusic.title = "Music: Lock Faction Music";
  SoundLockFactionMusic.desc = "Sound.LockFactionMusic(bLocked) -- confirmed with a single boolean, holds a forced faction-music selection in place";
  SoundLockFactionMusic.prototype.onAction = function () {
    var locked = this.properties.locked ? "true" : "false";
    CodeGen.emitNative("Sound.LockFactionMusic(" + locked + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/lockfactionmusic", SoundLockFactionMusic);

  // ============================================================
  // Native/Sound/IsFactionLockedMusic -- a PURE DATA node wrapping Sound.IsFactionLockedMusic() -> bool.
  // ============================================================
  function SoundIsFactionLockedMusic() {
    this.addOutput("locked", "boolean");
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundIsFactionLockedMusic.title = "Music: Is Faction Locked";
  SoundIsFactionLockedMusic.desc = "Sound.IsFactionLockedMusic() -- emits Lua source, not a resolved boolean (see codegen.js header)";
  SoundIsFactionLockedMusic.prototype.onExecute = function () {
    this.setOutputData(0, "Sound.IsFactionLockedMusic()");
  };
  LiteGraph.registerNodeType("native/sound/isfactionlockedmusic", SoundIsFactionLockedMusic);

  // ============================================================
  // Native/Sound/ActivateFactionRegion -- Sound.ActivateFactionRegionMusic(). Confirmed with no arguments,
  // called immediately after Set Faction Music + Lock Faction Music(false) to commit the selection.
  // ============================================================
  function SoundActivateFactionRegion() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundActivateFactionRegion.title = "Music: Activate Faction Region";
  SoundActivateFactionRegion.desc = "Sound.ActivateFactionRegionMusic() -- confirmed with no arguments, called immediately after Set Faction Music + Lock Faction Music(false) to commit the selection";
  SoundActivateFactionRegion.prototype.onAction = function () {
    CodeGen.emitNative("Sound.ActivateFactionRegionMusic()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/activatefactionregion", SoundActivateFactionRegion);

  // ============================================================
  // Native/Sound/SetTimerUpdateMusic -- Sound.SetTimerUpdateMusic(bEnabled). Toggled around timer-critical
  // gameplay (mission countdown contexts).
  // ============================================================
  function SoundSetTimerUpdateMusic() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("enabled", true);
    this.addWidget("toggle", "enabled", this.properties.enabled, function (v) { this.properties.enabled = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundSetTimerUpdateMusic.title = "Music: Set Timer Update";
  SoundSetTimerUpdateMusic.desc = "Sound.SetTimerUpdateMusic(bEnabled) -- confirmed, toggled around timer-critical gameplay (mission countdown contexts)";
  SoundSetTimerUpdateMusic.prototype.onAction = function () {
    var enabled = this.properties.enabled ? "true" : "false";
    CodeGen.emitNative("Sound.SetTimerUpdateMusic(" + enabled + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/settimerupdatemusic", SoundSetTimerUpdateMusic);

  // ============================================================
  // Native/Sound/SetSurvivalMode -- Sound.SetSurvivalMode(bEnabled). Typically paired with a looping
  // "sfx_survival_lp" cue via Ess.Sound.cue/stop.
  // ============================================================
  function SoundSetSurvivalMode() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("enabled", true);
    this.addWidget("toggle", "enabled", this.properties.enabled, function (v) { this.properties.enabled = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundSetSurvivalMode.title = "Music: Set Survival Mode";
  SoundSetSurvivalMode.desc = "Sound.SetSurvivalMode(bEnabled) -- confirmed, typically paired with a looping sfx_survival_lp cue via Ess.Sound.cue / Ess.Sound.stop";
  SoundSetSurvivalMode.prototype.onAction = function () {
    var enabled = this.properties.enabled ? "true" : "false";
    CodeGen.emitNative("Sound.SetSurvivalMode(" + enabled + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/setsurvivalmode", SoundSetSurvivalMode);

  // ============================================================
  // Native/Sound/OverrideUserMusic -- Sound.OverrideUserMusic(). Confirmed, no arguments; real scripts
  // guard this behind an existence check (later-build addition) -- pcall wrap here makes that unnecessary.
  // ============================================================
  function SoundOverrideUserMusic() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundOverrideUserMusic.title = "Music: Override User Music";
  SoundOverrideUserMusic.desc = "Sound.OverrideUserMusic() -- confirmed, no arguments; real scripts guard this behind an existence check (later-build addition), unnecessary here since emitNative already pcalls";
  SoundOverrideUserMusic.prototype.onAction = function () {
    CodeGen.emitNative("Sound.OverrideUserMusic()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/overrideusermusic", SoundOverrideUserMusic);

  // ============================================================
  // Native/Sound/RestoreUserMusic -- Sound.RestoreUserMusic(). Counterpart to Override User Music, same
  // build-dependent existence-guard caveat.
  // ============================================================
  function SoundRestoreUserMusic() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundRestoreUserMusic.title = "Music: Restore User Music";
  SoundRestoreUserMusic.desc = "Sound.RestoreUserMusic() -- confirmed, no arguments, the counterpart to Override User Music; same build-dependent existence-guard caveat";
  SoundRestoreUserMusic.prototype.onAction = function () {
    CodeGen.emitNative("Sound.RestoreUserMusic()");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/restoreusermusic", SoundRestoreUserMusic);

  // ============================================================
  // Native/Sound/LockListenerPosition -- Sound.LockListenerPosition(bLocked). Used in pairs bracketing a
  // scripted camera/audio moment -- pairs well with Ess.Cinematic nodes.
  // ============================================================
  function SoundLockListenerPosition() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("locked", true);
    this.addWidget("toggle", "locked", this.properties.locked, function (v) { this.properties.locked = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundLockListenerPosition.title = "Music: Lock Listener Position";
  SoundLockListenerPosition.desc = "Sound.LockListenerPosition(bLocked) -- confirmed, used in pairs bracketing a scripted camera/audio moment (e.g. a Cinematic sequence)";
  SoundLockListenerPosition.prototype.onAction = function () {
    var locked = this.properties.locked ? "true" : "false";
    CodeGen.emitNative("Sound.LockListenerPosition(" + locked + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/locklistenerposition", SoundLockListenerPosition);

  // ============================================================================================
  // SOUND -- Mixing & Reverb
  // ============================================================================================

  // ============================================================
  // Native/Sound/FadeCategoryDown -- Sound.FadeCategoryDown(sCategory, nLevel, nDuration). Confirmed with a
  // category string and 2 numeric args; no literal example values found in the corpus (only variable names
  // at the one call site) -- level/duration defaults below are placeholders, not confirmed real usage.
  // ============================================================
  function SoundFadeCategoryDown() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("category", "string");
    this.addProperty("category", "sfx");
    this.addWidget("text", "category", this.properties.category, function (v) { this.properties.category = v; }.bind(this));
    this.addInput("level", "number");
    this.addProperty("level", 0.2);
    this.addWidget("number", "level", this.properties.level, function (v) { this.properties.level = v; }.bind(this));
    this.addInput("duration", "number");
    this.addProperty("duration", 1);
    this.addWidget("number", "duration", this.properties.duration, function (v) { this.properties.duration = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundFadeCategoryDown.title = "Sound: Fade Category Down";
  SoundFadeCategoryDown.desc = "Sound.FadeCategoryDown(sCategory, nLevel, nDuration) -- confirmed with a category string and 2 numeric args (e.g. ducking sfx during dialogue); no literal example values found, level/duration defaults here are placeholders";
  SoundFadeCategoryDown.prototype.onAction = function () {
    var category = resolveRawInput(this, 1, "category");  // input 0 is "exec"
    var level = CodeGen.resolveNumberInput(this, 2, "level");
    var duration = CodeGen.resolveNumberInput(this, 3, "duration");
    CodeGen.emitNative("Sound.FadeCategoryDown(" + CodeGen.luaString(category) + ", " + level + ", " + duration + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/fadecategorydown", SoundFadeCategoryDown);

  // ============================================================
  // Native/Sound/FadeCategoryUp -- Sound.FadeCategoryUp(sCategory, nDuration). Confirmed counterpart
  // restore call to Fade Category Down.
  // ============================================================
  function SoundFadeCategoryUp() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("category", "string");
    this.addProperty("category", "sfx");
    this.addWidget("text", "category", this.properties.category, function (v) { this.properties.category = v; }.bind(this));
    this.addInput("duration", "number");
    this.addProperty("duration", 1);
    this.addWidget("number", "duration", this.properties.duration, function (v) { this.properties.duration = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundFadeCategoryUp.title = "Sound: Fade Category Up";
  SoundFadeCategoryUp.desc = "Sound.FadeCategoryUp(sCategory, nDuration) -- confirmed counterpart restore call to Fade Category Down";
  SoundFadeCategoryUp.prototype.onAction = function () {
    var category = resolveRawInput(this, 1, "category");  // input 0 is "exec"
    var duration = CodeGen.resolveNumberInput(this, 2, "duration");
    CodeGen.emitNative("Sound.FadeCategoryUp(" + CodeGen.luaString(category) + ", " + duration + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/fadecategoryup", SoundFadeCategoryUp);

  // ============================================================
  // Native/Sound/PitchCategoryActivate -- Sound.PitchCategoryActivate(sCategory, nLevel, nDuration).
  // Confirmed with a category string and 2 numeric args (e.g. a bullet-time-style pitch shift on a
  // category); no literal example values found -- level/duration defaults below are placeholders.
  // ============================================================
  function SoundPitchCategoryActivate() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("category", "string");
    this.addProperty("category", "sfx");
    this.addWidget("text", "category", this.properties.category, function (v) { this.properties.category = v; }.bind(this));
    this.addInput("level", "number");
    this.addProperty("level", -500);
    this.addWidget("number", "level", this.properties.level, function (v) { this.properties.level = v; }.bind(this));
    this.addInput("duration", "number");
    this.addProperty("duration", 1);
    this.addWidget("number", "duration", this.properties.duration, function (v) { this.properties.duration = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundPitchCategoryActivate.title = "Sound: Pitch Category Activate";
  SoundPitchCategoryActivate.desc = "Sound.PitchCategoryActivate(sCategory, nLevel, nDuration) -- confirmed with a category string and 2 numeric args; no literal example values found, level/duration defaults here are placeholders";
  SoundPitchCategoryActivate.prototype.onAction = function () {
    var category = resolveRawInput(this, 1, "category");  // input 0 is "exec"
    var level = CodeGen.resolveNumberInput(this, 2, "level");
    var duration = CodeGen.resolveNumberInput(this, 3, "duration");
    CodeGen.emitNative("Sound.PitchCategoryActivate(" + CodeGen.luaString(category) + ", " + level + ", " + duration + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/pitchcategoryactivate", SoundPitchCategoryActivate);

  // ============================================================
  // Native/Sound/PitchCategoryDeactivate -- Sound.PitchCategoryDeactivate(sCategory, nDuration). Confirmed
  // counterpart restore call to Pitch Category Activate.
  // ============================================================
  function SoundPitchCategoryDeactivate() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("category", "string");
    this.addProperty("category", "sfx");
    this.addWidget("text", "category", this.properties.category, function (v) { this.properties.category = v; }.bind(this));
    this.addInput("duration", "number");
    this.addProperty("duration", 1);
    this.addWidget("number", "duration", this.properties.duration, function (v) { this.properties.duration = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundPitchCategoryDeactivate.title = "Sound: Pitch Category Deactivate";
  SoundPitchCategoryDeactivate.desc = "Sound.PitchCategoryDeactivate(sCategory, nDuration) -- confirmed counterpart restore call to Pitch Category Activate";
  SoundPitchCategoryDeactivate.prototype.onAction = function () {
    var category = resolveRawInput(this, 1, "category");  // input 0 is "exec"
    var duration = CodeGen.resolveNumberInput(this, 2, "duration");
    CodeGen.emitNative("Sound.PitchCategoryDeactivate(" + CodeGen.luaString(category) + ", " + duration + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/pitchcategorydeactivate", SoundPitchCategoryDeactivate);

  // ============================================================
  // Native/Sound/SetReverbPreset -- Sound.SetReverbPreset(vPresetIdOrName). Confirmed accepting a
  // preset-name string interchangeably with an integer ID; only the name form is exposed here since preset
  // names are the discoverable/confirmed real values on the wiki page (e.g. CITY_KG_LIGHT_REFLECTIONS).
  // ============================================================
  function SoundSetReverbPreset() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("preset", "string");
    this.addProperty("preset", "CITY_KG_LIGHT_REFLECTIONS");
    this.addWidget("text", "preset", this.properties.preset, function (v) { this.properties.preset = v; }.bind(this));
    this.color = CodeGen.NATIVE_COLOR;
    this.bgcolor = CodeGen.NATIVE_BGCOLOR;
  }
  SoundSetReverbPreset.title = "Sound: Set Reverb Preset";
  SoundSetReverbPreset.desc = "Sound.SetReverbPreset(vPresetIdOrName) -- confirmed accepting a preset-name string (or an integer ID, not modeled here); only the name form is exposed since preset names are the discoverable/confirmed real values on the wiki page";
  SoundSetReverbPreset.prototype.onAction = function () {
    var preset = resolveRawInput(this, 1, "preset");  // input 0 is "exec"
    CodeGen.emitNative("Sound.SetReverbPreset(" + CodeGen.luaString(preset) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("native/sound/setreverbpreset", SoundSetReverbPreset);
})();
