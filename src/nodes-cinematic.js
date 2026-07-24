/* nodes-cinematic.js -- Ess.Easy.Cinematic node types.
 *
 * Signature verified directly against mercs2-lua-essentials/src/65_cinematic.lua.
 *
 * Ess.Easy.Cinematic.play(steps, onDone) drives a declarative cutscene TIMELINE: an ordered list of step
 * tables ({type="camera", at=, lookAt=, hold=}, {type="spawn", ...}, {type="say", text=}, etc. -- see the
 * source file's STEP handler list for the full step-type catalog). `steps` is modeled here as one big raw
 * Lua-source TEXT property (the same "data is Lua source text" convention guids/points/factions lists
 * already use -- see codegen.js header), not as individually-wired step nodes: composing a growing LIST
 * from separate visual nodes isn't something this compiler's flat-statement model supports yet (same
 * reasoning nodes-encounter.js's guids/points lists already accepted). `onDone` -- itself a callback -- is
 * omitted the same way every other onDone/onComplete/onFail parameter across this node library already is
 * (see nodes-missions.js's file header on that convention).
 *
 * Ess.Easy.Cinematic.shot(at, lookAt, seconds) -> step is deliberately NOT a separate node here: it's sugar
 * for building ONE entry of the `steps` list you're already hand-typing in the property above, not an
 * action with its own side effect -- there's nowhere useful for a "just returns a step table" node to
 * plug into without list-composition support this compiler doesn't have. Write the step literally instead:
 * { type = "camera", at = {x,y,z}, lookAt = {x,y,z}, hold = seconds }.
 */
(function () {
  "use strict";

  var DEFAULT_STEPS =
    "{\n" +
    "  { type = \"camera\", at = {0, 5, -10}, lookAt = {0, 0, 0}, hold = 3 },\n" +
    "  { type = \"say\", text = \"Something's happening...\", hold = 2 },\n" +
    "  { type = \"fade\", to = 1, hold = 1 },\n" +
    "}";

  // ============================================================
  // Ess/Cinematic/Play -- Ess.Easy.Cinematic.play(steps, onDone)
  // "seq" output captures the returned sequence handle via CodeGen.newLocal/emitCapture (see codegen.js's
  // header and nodes.js's Spawn Ahead, which gets the same treatment) -- usable downstream with
  // Ess.Easy.Cinematic.stop/isPlaying.
  // ============================================================
  function CinematicPlay() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("steps", DEFAULT_STEPS);
    this.addWidget("text", "steps", this.properties.steps, function (v) { this.properties.steps = v; }.bind(this));
    this.size = [260, 100];
    this.addOutput("seq", "string");
  }
  CinematicPlay.title = "Cinematic: Play";
  CinematicPlay.desc = "Ess.Easy.Cinematic.play(steps) -- onDone omitted, see file header -> seq";
  CinematicPlay.prototype.onAction = function () {
    var varName = CodeGen.newLocal("seq");
    CodeGen.emitCapture(varName, "Ess.Easy.Cinematic.play(" + this.properties.steps + ")");
    this.setOutputData(1, varName);   // "seq" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/cinematic/play", CinematicPlay);
})();
