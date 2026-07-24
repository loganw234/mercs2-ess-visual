/* samples.js -- boilerplate graphs, one per rough "shape" a mod script tends to take, so a new builder has
 * something concrete to fork instead of a blank canvas. Every property below is left at (or set to) a value
 * that's already valid to compile on its own -- same rule every individual node follows (see nodes-*.js file
 * headers on guid/table-literal defaults) -- so loading any sample here and hitting Compile immediately
 * produces a real, runnable .lua with no required edits first.
 *
 * Each entry is a plain builder function using the exact same public API app.js's own default graph and
 * palette.js's click-to-add both already use (LiteGraph.createNode + graph.add + node.connect) -- not a
 * hand-authored litegraph JSON blob, which would risk drifting out of sync with whatever the node classes
 * actually look like the next time one of them changes shape.
 *
 * SOURCED FROM REAL, TESTED Ess USAGE: every sample below is adapted from a real script in
 * mercs2-lua-essentials's samples/ -- the framework's own smoke-tested recipes (samples/recipes/*.lua, each
 * one a `[SMOKE] <name>: PASS/FAIL`-verified script run before every Ess release) and its larger demos
 * (samples/demos/*.lua). Not every recipe translates -- several lean on namespaces this tool doesn't wrap as
 * nodes yet (Math, Str, Table, Color, Vec, RNG beyond Random Number, State, SaveVar, Track, Event, On, Keys,
 * Probe, Pursuit, Override -- see README's "Node coverage" for why: general-purpose utility infrastructure,
 * not "mod actions"). The ones below are the recipes that map onto real node coverage -- most translate
 * node-for-node; a couple lean on ONE `Custom Code` block for the one line that genuinely has no node yet
 * (calling a captured closure from inside a delayed callback is the recurring case -- see each one's comment
 * for the exact captured-variable name it depends on, verified by actually compiling it, not guessed).
 *
 * A note on captured-variable text: a few samples below type an exact compiled local name (e.g. "__spawn1")
 * directly into a Custom Code block or a Trigger's raw `fn` text, to consume a value captured earlier in the
 * SAME graph (see README's "Branching, captured values, and Flow Control" for the mechanism, and
 * codegen.js's header for the ordering rule this relies on). That name comes from CodeGen.newLocal's
 * per-prefix counter -- deterministic for a given graph, but only because each sample here was actually
 * compiled and checked, not because the naming is something you should hand-calculate yourself.
 */
window.Samples = (function () {
  var list = [];

  function define(id, name, desc, build) {
    list.push({ id: id, name: name, desc: desc, build: build });
  }

  function node(graph, type, pos, props) {
    var n = LiteGraph.createNode(type);
    if (!n) throw new Error("samples.js: unknown node type " + type);
    n.pos = pos;
    if (props) Object.keys(props).forEach(function (k) { n.properties[k] = props[k]; });
    graph.add(n);
    return n;
  }

  // ---- Spawn & Control -- adapted from samples/recipes/spawn_and_control.lua. Spawn something, capture its
  // guid, then control it: face it at you, heal it to full, log its position, and clean it up a few seconds
  // later. The foundational "spawn, capture, act on it" pattern almost every other sample here builds on.
  // The position/distance report has no dedicated nodes (Ess.Object.pos and Ess.Math.dist2D are both
  // multi-value/utility calls this tool doesn't wrap -- see README) so it's one Custom Code line instead,
  // referencing the Spawn Ahead node's captured guid by its exact compiled name, __spawn1.
  define("spawn-and-control", "Spawn & Control",
    "On Key Press -> spawn a car ahead (capture its guid), face it at you, heal it, log where it landed, and remove it after 6s.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 220], { key: "f1" });
      var spawn = node(graph, "ess/spawnahead", [320, 140], { template: "Veyron", distance: 8 });
      var face = node(graph, "ess/object/faceobject", [620, 140], { target: "Ess.Player.character(0)" });
      var heal = node(graph, "ess/object/heal", [900, 140]);
      var log = node(graph, "flow/customcode", [900, 320], {
        code: "local cx, cy, cz = Ess.Object.pos(__spawn1)\nEss.Log(string.format('[graph] spawn_and_control: car @ %.1f,%.1f,%.1f', cx or 0, cy or 0, cz or 0))"
      });
      var cleanup = node(graph, "ess/triggers/after", [1180, 220], {
        seconds: 6, fn: "function() Ess.Object.remove(__spawn1) end"
      });
      face.properties.guid = "__spawn1"; // matches the guid Spawn Ahead captures as -- see file header
      heal.properties.guid = "__spawn1";
      onKey.connect(0, spawn, 0);
      spawn.connect(0, face, 0);
      face.connect(0, heal, 0);
      heal.connect(0, log, 0);
      log.connect(0, cleanup, 0);
    });

  // ---- Command a Squad -- adapted from samples/recipes/command_a_squad.lua. Spawn a squad in one call
  // (Ess.Easy.Spawn.enemies already does the spawn-loop the recipe hand-rolls), capture the guid LIST it
  // hands back, and order the whole group at once -- the captured "guids" output feeds straight into AI
  // Orders: Attack, no per-unit bookkeeping. Cleans the squad up after 8s (a loop over a captured list has
  // no dedicated node, so that's the one Custom Code-shaped exception: raw `fn` text on the trigger).
  define("command-a-squad", "Command a Squad",
    "On Key Press -> spawn a squad of enemies (captured as a guid list), order them to attack you, then remove the whole squad after 8s.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 220], { key: "f2" });
      var squad = node(graph, "ess/spawn/enemies", [320, 140], { count: 3 });
      var attack = node(graph, "ess/aiorders/attack", [620, 140], { target: "Ess.Player.character(0)" });
      var toast = node(graph, "ess/toastmessage", [900, 140], { message: "Squad inbound -- fight!" });
      var cleanup = node(graph, "ess/triggers/after", [1180, 140], {
        seconds: 8, fn: "function() for _, g in ipairs(__enemies1) do Ess.Object.remove(g) end end"
      });
      attack.properties.guids = "__enemies1"; // matches Spawn Enemies' captured guid-list name -- see file header
      onKey.connect(0, squad, 0);
      squad.connect(0, attack, 0);
      attack.connect(0, toast, 0);
      toast.connect(0, cleanup, 0);
    });

  // ---- Mark & Notify -- combines samples/recipes/mark_things.lua and notify_the_player.lua: put an
  // objective marker on the player and a "go here" zone ring, then run through all four HUD notification
  // styles. Ess.Mark has no "clear" node yet (only the Add-shaped ones -- see README), so tearing both
  // marks down (and clearing the objective line) after 5s is the other Custom Code-shaped exception here.
  define("mark-and-notify", "Mark & Notify",
    "On Key Press -> drop an objective marker + a zone ring, show all four HUD notification styles, then clear the markers and objective line after 5s.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 260], { key: "f3" });
      var markObj = node(graph, "ess/mark/objective", [320, 100]);
      var markZone = node(graph, "ess/mark/zone", [320, 260], { x: 20, y: 0, z: 20, r: 8 });
      var toast = node(graph, "ess/toastmessage", [620, 100], { message: "Pickup collected" });
      var banner = node(graph, "ess/hud/banner", [900, 100], { message: "Area Cleared" });
      var objective = node(graph, "ess/hud/objective", [1180, 100], { text: "Reach the LZ", slot: 1 });
      var radio = node(graph, "ess/hud/radio", [1460, 100], { text: "On my way, over.", hold: 4 });
      var cleanup = node(graph, "ess/triggers/after", [1460, 320], {
        seconds: 5, fn: "function() Ess.Mark.clear(__mark1) Ess.Mark.clear(__mark2) Ess.Hud.objective(nil, 1) end"
      });
      onKey.connect(0, markObj, 0);
      markObj.connect(0, markZone, 0);
      markZone.connect(0, toast, 0);
      toast.connect(0, banner, 0);
      banner.connect(0, objective, 0);
      objective.connect(0, radio, 0);
      radio.connect(0, cleanup, 0);
    });

  // ---- Direct the Camera -- adapted from samples/recipes/direct_the_camera.lua. Spawn something worth
  // looking at, orbit the camera around it (capturing the "stop" closure the shot hands back -- Camera:
  // Orbit STEALS look control until that closure runs), then hand control back and clean up after 5s. The
  // "wait 5s, then call the captured stop() and remove the spawn" step has no dedicated node (a delayed
  // call to a captured closure), so it's one Custom Code line -- referencing both captured names exactly.
  define("direct-the-camera", "Direct the Camera",
    "On Key Press -> spawn a car, orbit the camera around it (captures a stop() closure), then hand control back and remove the car after 5s.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 220], { key: "f4" });
      var spawn = node(graph, "ess/object/spawn", [320, 140], { sTemplate: "Veyron", x: 12, y: 0, z: 0, yaw: 0 });
      var orbit = node(graph, "ess/camera/orbit", [620, 140], { radius: 10, speed: 45 });
      var deferred = node(graph, "flow/customcode", [900, 260], {
        code: "Ess.Easy.Triggers.after(5, function() __orbit1() Ess.Object.remove(__spawn1) end)"
      });
      orbit.properties.guid = "__spawn1"; // matches Object: Spawn's captured guid name -- see file header
      onKey.connect(0, spawn, 0);
      spawn.connect(0, orbit, 0);
      orbit.connect(0, deferred, 0);
    });

  // ---- Command a Helicopter -- adapted from samples/recipes/command_a_helicopter.lua. Two gotchas the
  // recipe bakes in and this graph inherits: the "(Full)" template tag spawns a helicopter CREWED and
  // already airborne (a bare template has no pilot and just drops), and moving it is Vehicle: Fly To -- a
  // plain move order won't fly a helicopter at all. Fully node-based, no Custom Code needed.
  define("command-a-helicopter", "Command a Helicopter",
    "On Key Press -> spawn a crewed, airborne helicopter and send its AI pilot to fly toward you, then remove it after 10s.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 220], { key: "f5" });
      var spawn = node(graph, "ess/object/spawn", [320, 140], { sTemplate: "AH1Z (Full)", x: -20, y: 30, z: -20, yaw: 0 });
      var flyTo = node(graph, "ess/vehicle/flyto", [620, 140], { x: 6, y: 7, z: 6, height: 6 });
      var toast = node(graph, "ess/toastmessage", [900, 140], { message: "Incoming helicopter!" });
      var cleanup = node(graph, "ess/triggers/after", [1180, 140], {
        seconds: 10, fn: "function() Ess.Object.remove(__spawn1) end"
      });
      flyTo.properties.uHeli = "__spawn1"; // matches Object: Spawn's captured guid name -- see file header
      onKey.connect(0, spawn, 0);
      spawn.connect(0, flyTo, 0);
      flyTo.connect(0, toast, 0);
      toast.connect(0, cleanup, 0);
    });

  // ---- A Quick Mission -- adapted from samples/recipes/a_quick_mission.lua. A whole linear mission in one
  // table -- no Contract, no manual event wiring: an AUTO "reach" step (completes on arrival, drops its own
  // marker) then a MANUAL step you advance by hand. The light middle tier between a single Objective and a
  // full save-safe Contract. Fully node-based (the steps table is typed text, same "data is Lua source"
  // convention every table/list param in this tool already uses).
  define("a-quick-mission", "A Quick Mission",
    "On Key Press -> start a two-step quest (an auto reach-marker step, then a manual step), and toast on completion.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 200], { key: "f6" });
      var quest = node(graph, "ess/quest/create", [320, 140], {
        steps: "{ { reach = { 25, 0, 25, 8 }, label = 'Advance to the marker' }, 'Return to safety' }",
        onComplete: "function() Ess.Easy.Toast('Mission complete!') end"
      });
      var toast = node(graph, "ess/toastmessage", [620, 140], { message: "New mission: advance to the marker." });
      onKey.connect(0, quest, 0);
      quest.connect(0, toast, 0);
    });

  // ---- Call In Support -- adapted from samples/recipes/call_in_support.lua. The iconic Mercs2 support
  // call-in, no Contract needed -- a camera shake for the impact, then an airstrike lands on a spot well
  // clear of you. (Ess.Support's fuller artillery/gunship calls aren't wrapped as nodes yet, only the
  // Easy.Airstrike shortcuts -- see README -- so this sticks to the airstrike beat the recipe leads with.)
  define("call-in-support", "Call In Support",
    "On Key Press -> shake the camera, then call in an airstrike on a spot 45 units away.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 200], { key: "f7" });
      var shake = node(graph, "ess/camera/shake", [320, 140]);
      var strike = node(graph, "ess/support/airstrikeat", [620, 140], { x: 45, y: 0, z: 45 });
      var toast = node(graph, "ess/toastmessage", [900, 140], { message: "Support inbound!" });
      onKey.connect(0, shake, 0);
      shake.connect(0, strike, 0);
      strike.connect(0, toast, 0);
    });

  // ---- World Tweaks -- adapted from samples/recipes/world_tweaks.lua. The "sandbox play" one-liners:
  // drop your wanted level, lift the map's out-of-bounds walls, wash the world in a color -- then put the
  // sky back after a few seconds. Fully node-based; the delayed reset's `fn` needs no captured value at all
  // (Reset Atmosphere takes no arguments), so it's a plain Trigger, not a Custom Code exception.
  define("world-tweaks", "World Tweaks",
    "On Key Press -> clear your wanted level, lift the map boundary, tint the world purple, then reset the atmosphere after 4s.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 220], { key: "f8" });
      var clearWanted = node(graph, "ess/world/clearwanted", [320, 100]);
      var removeBoundary = node(graph, "ess/world/removemapboundary", [320, 260]);
      var tint = node(graph, "ess/world/tint", [620, 180], { r: 120, g: 60, b: 200 });
      var reset = node(graph, "ess/triggers/after", [900, 180], {
        seconds: 4, fn: "function() Ess.Easy.World.resetAtmosphere() end"
      });
      onKey.connect(0, clearWanted, 0);
      clearWanted.connect(0, removeBoundary, 0);
      removeBoundary.connect(0, tint, 0);
      tint.connect(0, reset, 0);
    });

  // ---- Timers & Loop -- adapted from samples/recipes/do_it_later.lua. Two different tools for two
  // different jobs: Trigger: After fires ONCE after a delay; Loop: Start is a repeating heartbeat that
  // stops itself by returning false. The tick counter lives as a bare global inside the loop's own raw
  // `tickFn` text (`_G.__graphTicks`) rather than a captured node value -- state that needs to persist
  // ACROSS repeated calls to the same closure doesn't fit the "capture once, read once" model captured
  // values are for for, so a plain global inside the text is the honest way to show it here.
  define("timers-and-loop", "Timers & Loop",
    "On Key Press -> log once after a 1s delay, and run a repeating 0.3s heartbeat that stops itself after 3 ticks.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 220], { key: "f9" });
      var once = node(graph, "ess/triggers/after", [320, 100], {
        seconds: 1, fn: "function() Ess.Log('[graph] the one-shot fired (1s later)') end"
      });
      var loop = node(graph, "ess/loop/start", [320, 320], {
        id: "graph_heartbeat", interval: 0.3,
        tickFn: "function() _G.__graphTicks = (_G.__graphTicks or 0) + 1 if _G.__graphTicks >= 3 then Ess.Log('[graph] heartbeat ran ' .. _G.__graphTicks .. ' times, stopping') return false end return true end"
      });
      onKey.connect(0, once, 0);
      once.connect(0, loop, 0);
    });

  // ---- Trailer Hitch -- adapted from samples/demos/TrailerHitch.lua. Spawn a truck and a fuel trailer
  // ahead of you, then weld the trailer onto the truck's hitch hardpoint with the engine's raw Object.Attach
  // primitive -- confirmed live to follow the truck through movement while keeping its own physics (see the
  // demo's header for the two real gotchas: it's a rigid weld with no articulation, and it seats by the
  // CHILD's origin, not a chosen point on it). Fully node-based -- the one node in this whole sample library
  // from the Native tier rather than Ess, since Attach isn't wrapped by Ess itself yet.
  define("trailer-hitch", "Trailer Hitch",
    "On Key Press -> spawn a truck + trailer ahead, make both invincible, then weld the trailer onto the truck's hitch hardpoint (native Object.Attach).",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 260], { key: "f10" });
      var truck = node(graph, "ess/object/spawn", [320, 140], { sTemplate: "Austin (CIV)", x: 12, y: 4, z: 0, yaw: 0 });
      var trailer = node(graph, "ess/object/spawn", [320, 380], { sTemplate: "Civ Fueltrailer", x: 24, y: 4, z: 0, yaw: 0 });
      var invincTruck = node(graph, "ess/object/setinvincible", [620, 140], { bOn: true, sReason: "hitch" });
      var invincTrailer = node(graph, "ess/object/setinvincible", [620, 380], { bOn: true, sReason: "hitch" });
      var attach = node(graph, "native/object/attach", [900, 260], { sHardpoint: "hp_trailerhitch" });
      var toast = node(graph, "ess/toastmessage", [1180, 260], { message: "Trailer hitched -- get in the truck and drive, it follows." });
      invincTruck.properties.guid = "__spawn1";   // matches the truck's Object: Spawn captured guid name
      invincTrailer.properties.guid = "__spawn2"; // matches the trailer's Object: Spawn captured guid name
      attach.properties.parentGuid = "__spawn1";
      attach.properties.childGuid = "__spawn2";
      onKey.connect(0, truck, 0);
      truck.connect(0, trailer, 0);
      trailer.connect(0, invincTruck, 0);
      invincTruck.connect(0, invincTrailer, 0);
      invincTrailer.connect(0, attach, 0);
      attach.connect(0, toast, 0);
    });

  function get(id) {
    return list.filter(function (s) { return s.id === id; })[0];
  }

  function load(id, graph) {
    var sample = get(id);
    if (!sample) return false;
    graph.clear();
    sample.build(graph);
    return true;
  }

  return { list: list, get: get, load: load };
})();
