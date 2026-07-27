/* essgen-dedupe.js -- the hand-written nodes win; the generated set fills the gaps.
 *
 * vendor/ess-nodes.generated.js registers a node for EVERY public Ess function (649 of them). This repo's
 * own src/nodes-*.js files already cover ~211 of those by hand. Loading both without arbitration would put
 * two nodes for Ess.Player.giveCash in the palette, which is precisely the confusion a tool aimed at people
 * who do not write code cannot afford.
 *
 * The hand-written ones win, and not merely for being older. Several encode things a generated node
 * structurally cannot: nodes.js's LOADER_KEYS and nodes-encounter.js's FACTIONS are validated combo boxes
 * that make an invalid value UNREACHABLE, which exists because a free-text field made the failure invisible
 * -- no error at compile time, no error at load time, just a hotkey that never fired. A generated node
 * knows a parameter is a string; it cannot know which strings the loader will accept.
 *
 * WHY COVERAGE IS DERIVED RATHER THAN LISTED
 * A hardcoded list of "functions the hand-written nodes cover" would be a third place to keep in sync, and
 * would rot the first time someone adds a node -- the same class of problem the generated set exists to
 * solve. So coverage is read out of the nodes themselves, from two independent signals:
 *
 *   1. the type's `desc` static, which by convention names the call ("Ess.Player.giveCash(amount)");
 *   2. the SOURCE TEXT of its onAction/onExecute, where the emitted Lua is a literal
 *      (CodeGen.emit("Ess.Player.giveCash(" + amount + ")")).
 *
 * The second is the authoritative one -- it is what the node really emits rather than what its description
 * claims -- and the first catches nodes whose emission is assembled too indirectly to read. Neither
 * requires touching a node file to add a node.
 *
 * Load order matters: AFTER every src/nodes-*.js and after the vendored generated file, but BEFORE
 * palette.js, which trims and then builds the sidebar from whatever is still registered.
 */
(function () {
  "use strict";

  if (typeof LiteGraph === "undefined") return;

  // `Ess.Foo.bar(` -- the open paren is what distinguishes a CALL from a mention. Ess.Player.character(0)
  // appearing as a default value is a call too, but of a function some other node may legitimately own, so
  // defaults are excluded below by only scanning emission sites and descs, never widget defaults.
  var CALL_RE = /\bEss(?:\.[A-Za-z_][A-Za-z0-9_]*)+(?=\s*[({:])/g;

  function callsIn(text) {
    if (!text) return [];
    var out = [], m;
    CALL_RE.lastIndex = 0;
    while ((m = CALL_RE.exec(String(text))) !== null) out.push(m[0]);
    return out;
  }

  var registry = LiteGraph.registered_node_types || {};
  var covered = Object.create(null);
  var handWritten = 0;

  Object.keys(registry).forEach(function (type) {
    if (type.indexOf("ess/") !== 0) return;      // only this repo's own tier claims coverage
    handWritten++;
    var Ctor = registry[type];
    var texts = [Ctor.desc, Ctor.title];
    ["onAction", "onExecute"].forEach(function (fn) {
      if (Ctor.prototype && typeof Ctor.prototype[fn] === "function") {
        texts.push(Ctor.prototype[fn].toString());
      }
    });
    texts.forEach(function (t) {
      callsIn(t).forEach(function (c) { covered[c] = type; });
    });
  });

  var removed = [], kept = 0;
  Object.keys(registry).forEach(function (type) {
    if (type.indexOf("essgen/") !== 0) return;
    var Ctor = registry[type];
    var def = Ctor.prototype && Ctor.prototype.essDef;
    var call = def && def.call;
    if (call && covered[call]) {
      removed.push({ type: type, call: call, supersededBy: covered[call] });
      LiteGraph.unregisterNodeType(type);
    } else {
      kept++;
    }
  });

  // Exposed rather than only logged: "why is there no node for X" is a question this answers directly, and
  // a silent dedupe would be indistinguishable from the generated file having failed to load.
  window.EssGenDedupe = {
    handWrittenTypes: handWritten,
    covered: covered,
    removed: removed,
    keptGenerated: kept
  };

  if (typeof console !== "undefined" && console.log) {
    console.log("[essgen] " + handWritten + " hand-written nodes cover " +
                Object.keys(covered).length + " Ess calls; suppressed " + removed.length +
                " generated duplicate(s), kept " + kept + ".");
  }
})();
