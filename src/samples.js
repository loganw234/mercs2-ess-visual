/* samples.js -- a handful of boilerplate graphs, one per rough "shape" a mod script tends to take, so a
 * new builder has something concrete to fork instead of a blank canvas. Every property below is left at
 * (or set to) a value that's already valid to compile on its own -- same rule every individual node
 * follows (see nodes-*.js file headers on guid/table-literal defaults) -- so loading any sample here and
 * hitting Compile immediately produces a real, runnable .lua with no required edits first.
 *
 * Each entry is a plain builder function using the exact same public API app.js's own default graph and
 * palette.js's click-to-add both already use (LiteGraph.createNode + graph.add + node.connect) -- not a
 * hand-authored litegraph JSON blob, which would risk drifting out of sync with whatever the node classes
 * actually look like the next time one of them changes shape.
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

  // ---- Cash & Ride -- the same graph app.js used to hardcode. One trigger, a value wire (Random Number
  // -> Spawn Ahead's distance) alongside the plain exec chain, so it demonstrates both wire kinds at once.
  define("cash-and-ride", "Cash & Ride",
    "On Key Press -> Give Cash -> Toast -> Spawn Ahead, with a Random Number feeding the spawn distance.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 200]);
      var giveCash = node(graph, "ess/givecash", [320, 140]);
      var toast = node(graph, "ess/toastmessage", [580, 140], { message: "Cash + a ride!" });
      var spawn = node(graph, "ess/spawnahead", [840, 140], { template: "Veyron" });
      var rnd = node(graph, "ess/randomnumber", [580, 340]);
      onKey.connect(0, giveCash, 0);
      giveCash.connect(0, toast, 0);
      toast.connect(0, spawn, 0);
      rnd.connect(0, spawn, 1);
    });

  // ---- World FX Toggle -- a pure exec chain across three World nodes, the shape a "flip on some
  // atmosphere" key-bind takes.
  define("world-fx", "World FX Toggle",
    "On Key Press -> tint the world, dim it, then toast a confirmation.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 220], { key: "f6" });
      var tint = node(graph, "ess/world/tint", [320, 120], { r: 40, g: 10, b: 10 });
      var brightness = node(graph, "ess/world/brightness", [320, 300], { n: 0.4 });
      var toast = node(graph, "ess/toastmessage", [600, 210], { message: "Atmosphere shifted." });
      onKey.connect(0, tint, 0);
      tint.connect(0, brightness, 0);
      brightness.connect(0, toast, 0);
    });

  // ---- Encounter Kickoff -- the shape most scripted-fight setups start from: mark and flip a faction
  // hostile, then send an attack order at it.
  define("encounter-kickoff", "Encounter Kickoff",
    "On Key Press -> mark a target hostile, then send AI orders to attack it.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 240], { key: "f7" });
      var makeHostile = node(graph, "ess/relations/makehostile", [320, 140]);
      var mark = node(graph, "ess/mark/enemy", [320, 320]);
      var attack = node(graph, "ess/aiorders/attack", [620, 230]);
      onKey.connect(0, makeHostile, 0);
      makeHostile.connect(0, mark, 0);
      mark.connect(0, attack, 0);
    });

  // ---- Mission Objective Chain -- the two nodes almost every custom mission needs: a quest step list,
  // then a reach-marker objective.
  define("mission-chain", "Mission Objective Chain",
    "On Key Press -> create a quest, then a Reach objective for it.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 200], { key: "f8" });
      var quest = node(graph, "ess/quest/create", [320, 140]);
      var objective = node(graph, "ess/objective/reach", [620, 140]);
      onKey.connect(0, quest, 0);
      quest.connect(0, objective, 0);
    });

  // ---- Call In Support -- camera + sound + an actual effect, the shape a "big moment" key-bind takes.
  define("support-call", "Call In Support",
    "On Key Press -> camera watches the target, a cue plays, then an airstrike lands on it.",
    function (graph) {
      var onKey = node(graph, "ess/onkeypress", [60, 240], { key: "f9" });
      var camera = node(graph, "ess/camera/watch", [320, 140]);
      var sound = node(graph, "ess/sound/play", [320, 320], { cue: "UI_Confirm" });
      var strike = node(graph, "ess/support/airstrikeontarget", [620, 230]);
      onKey.connect(0, camera, 0);
      camera.connect(0, sound, 0);
      sound.connect(0, strike, 0);
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
