/* compiler.js -- turns the current graph into a real scripts/OnKey/*.lua file.
 *
 * Three passes, deliberately in this order:
 *   1. Every pure-data node (has onExecute, no ACTION input -- e.g. Random Number) runs once, populating
 *      its output via setOutputData. These never depend on each other in this draft, so a single flat
 *      pass is enough; a graph with data-node-to-data-node chains would need a real topological sort here
 *      instead (out of scope for this draft -- see README's "what's deliberately not done yet"). This
 *      pass covers data nodes inside a function body too (see below) -- it's a flat sweep over every node
 *      in the graph, not scoped to any one chain.
 *   2. Every Function Start node (isFunctionStartNode === true -- see nodes-function.js) fires once via
 *      the SAME fireOnce()/triggerSlot(0) mechanism triggers use, but with CodeGen.pushScope()/popScope()
 *      wrapped around it (the same mechanism Flow/Branch uses for its true/false chains) so its body is
 *      captured separately and wrapped in `local function name(params) ... end`, assembled into its own
 *      buffer BEFORE the main trigger walk below runs. A Call node elsewhere in the graph never re-walks
 *      into the function's own chain at compile time -- it just emits a plain `name(args)` call expression
 *      (see nodes-function-calls.js) -- so a function calling itself (real Lua recursion) is completely
 *      safe here: the body is compiled exactly once regardless of how many Call nodes reference it.
 *   3. Every trigger node (isTriggerNode === true, e.g. On Key Press) fires once via its own fireOnce(),
 *      which synchronously walks the whole onAction -> triggerSlot -> onAction chain via litegraph's own
 *      event-propagation machinery -- this compiler doesn't re-implement graph traversal, it just kicks
 *      litegraph's real one off once per trigger and lets CodeGen collect whatever each node emits.
 *
 * This only targets an OnKey script export in this draft -- see README for why OnLoad/HTML-button targets
 * are noted as the natural next step rather than built here.
 */
window.Compiler = (function () {
  function isDataNode(node) {
    return typeof node.onExecute === "function" && !node.inputs?.some(function (i) { return i.type === LiteGraph.ACTION; });
  }

  // Follows only EVENT-typed output links (the exec chain) from a node -- runviz.js keeps its own copy of
  // this exact same shape for its (unrelated) animation walk; duplicated here rather than shared since the
  // two files serve different purposes and neither depends on the other.
  function flowTargets(node) {
    var out = [];
    if (!node.outputs) return out;
    node.outputs.forEach(function (slot) {
      if (slot.type !== LiteGraph.EVENT) return;
      (slot.links || []).forEach(function (linkId) {
        var link = node.graph.links[linkId];
        var target = link && node.graph.getNodeById(link.target_id);
        if (target) out.push(target);
      });
    });
    return out;
  }

  // findCycle(triggers) -> the first node found to be part of an exec-chain cycle, or null. A node's own
  // "then"/event output eventually looping back into itself would make litegraph's real triggerSlot
  // recursion (what fireOnce() below actually drives) recurse forever -- a genuinely easy accident once a
  // graph has a few branches (Flow/Branch's true/false, a node with fan-out to multiple downstream chains
  // that reconverge). Standard white/gray/black DFS: only revisiting a node still GRAY (on the CURRENT
  // path) is a cycle -- two different branches legitimately reconverging on the same downstream node later
  // is fine, that's just shared reuse, not a loop. `triggers` here means "every chain root fireOnce() gets
  // called on" -- both real On Key Press triggers AND Function Start nodes share this same check (a
  // function's OWN body looping back into itself at COMPILE TIME is the same infinite-triggerSlot-
  // recursion hazard; a Call node referencing that function from elsewhere is NOT the same thing and can't
  // trigger this, see the header comment on why).
  function findCycle(triggers) {
    var state = {};
    function visit(node) {
      if (state[node.id] === "gray") return node;
      if (state[node.id] === "black") return null;
      state[node.id] = "gray";
      var targets = flowTargets(node);
      for (var i = 0; i < targets.length; i++) {
        var found = visit(targets[i]);
        if (found) return found;
      }
      state[node.id] = "black";
      return null;
    }
    for (var t = 0; t < triggers.length; t++) {
      var found = visit(triggers[t]);
      if (found) return found;
    }
    return null;
  }

  // Every node reachable from `node` by following EVENT-typed links (including `node` itself) -- used to
  // find every Function Return that actually belongs to a given Function Start, for the returns-mismatch
  // guardrail below. Plain BFS/DFS over the same flowTargets() edges findCycle walks, just collecting
  // instead of cycle-checking.
  function collectReachable(node) {
    var seen = {};
    var out = [];
    function visit(n) {
      if (seen[n.id]) return;
      seen[n.id] = true;
      out.push(n);
      flowTargets(n).forEach(visit);
    }
    visit(node);
    return out;
  }

  // Shared with the other two files that parse the same params/returns text -- see codegen.js.
  var splitNames = CodeGen.splitNames;

  // findUnreachable(graph, roots) -> titles of every ACTION node no root's exec chain ever reaches.
  //
  // Compiling only ever walks outward from a root (an On Key Press trigger or a Function Start), so a node
  // sitting on the canvas with nothing wired into its "exec" input contributes NOTHING to the output -- no
  // error, no warning, it simply isn't there. That's this tool's single easiest mistake to make and its
  // hardest to notice: drop a node from the 400-item palette, set it up, hit Compile, and the status line
  // still cheerfully reports a successful compile of everything else. Reporting them by name costs one
  // extra sweep over edges collectReachable already walks, and turns a silent no-op into an obvious one.
  //
  // Only nodes with an ACTION input are counted. A pure-data node (Random Number, Compare) legitimately has
  // no exec wire at all -- it's consumed through a data wire and runs in the pre-pass -- so it is never
  // "unreachable" in this sense, and flagging one would be pure noise.
  function findUnreachable(graph, roots) {
    var reached = {};
    roots.forEach(function (root) {
      collectReachable(root).forEach(function (n) { reached[n.id] = true; });
    });
    return graph._nodes.filter(function (node) {
      if (reached[node.id]) return false;
      return (node.inputs || []).some(function (i) { return i.type === LiteGraph.ACTION; });
    }).map(function (node) { return node.title || node.type; });
  }

  function compile(graph, opts) {
    opts = opts || {};
    CodeGen.reset();

    // Wipe every data wire's cached value before walking anything.
    //
    // litegraph caches a data slot's value ON THE LINK, not on the reading node: setOutputData writes
    // link.data and getInputData reads it straight back (see both in lib/litegraph.js). Nothing clears
    // that between compiles, and CodeGen.reset() only resets OUR buffer and local-name counters -- so a
    // link kept whatever text it was last given. Compile a graph, then delete the exec wire feeding a
    // capturing node (leaving its data wire), and the consumer still reads the stale "__spawn1" from the
    // previous compile -- emitting Lua that references a local this run never declares, which fails at
    // runtime with a nil, far from the edit that caused it. Clearing first makes every compile read only
    // what THIS compile actually produced; an unwritten link now resolves to null, which every
    // resolve*Input helper already treats as "not wired" and falls back to the node's own property for.
    Object.keys(graph.links || {}).forEach(function (id) {
      if (graph.links[id]) graph.links[id].data = null;
    });

    var triggers = graph._nodes.filter(function (node) { return node.constructor.isTriggerNode; });
    var functionStarts = graph._nodes.filter(function (node) { return node.constructor.isFunctionStartNode; });

    // A compiled script binds to exactly one key (KEYVAL, declared once for the OnKey loader) -- more than
    // one On Key Press node with DIFFERENT keys can't both be honored by a single script file. Catch this
    // up front rather than silently keying off only the first trigger while still compiling every other
    // trigger's chain into the body anyway (which used to mean the second trigger's chain ran on the FIRST
    // trigger's key, and its own key was never reachable at all).
    var keys = {};
    triggers.forEach(function (t) { keys[(t.properties && t.properties.key) || "insert"] = true; });
    var distinctKeys = Object.keys(keys);
    if (distinctKeys.length > 1) {
      return { ok: false, error: "Multiple On Key Press nodes with different keys (" + distinctKeys.join(", ") + ") -- a compiled script binds to exactly one key. Give every trigger the same key, or split into separate graphs." };
    }

    // Every Function Start needs a name, and two functions can't share one -- a duplicate would silently
    // emit two `local function name(...)` statements, the second clobbering the first with no error.
    var seenNames = {};
    for (var fi = 0; fi < functionStarts.length; fi++) {
      var fname = String(functionStarts[fi].properties.name || "").trim();
      if (!fname) {
        return { ok: false, error: "A Function Start node has no name -- every function needs one." };
      }
      if (seenNames[fname]) {
        return { ok: false, error: "Two Function Start nodes are both named \"" + fname + "\" -- function names must be unique." };
      }
      seenNames[fname] = true;
    }

    // Every Function Return reachable from a given Function Start must declare the SAME `returns` (count
    // and names) that Start declares -- a mismatch would silently return the wrong number of values (or
    // the right count under the wrong names, purely a readability issue, but still worth catching) from
    // whichever Return node actually fires at runtime. See nodes-function.js's header for why this is a
    // compile-time check rather than a live-synced UI.
    for (var fj = 0; fj < functionStarts.length; fj++) {
      var start = functionStarts[fj];
      var expectedReturns = splitNames(start.properties.returns);
      var reachable = collectReachable(start);
      for (var rj = 0; rj < reachable.length; rj++) {
        var node = reachable[rj];
        if (!node.constructor.isFunctionReturnNode) continue;
        var actualReturns = node.returnNames || [];
        var mismatch = actualReturns.length !== expectedReturns.length ||
          actualReturns.some(function (n, idx) { return n !== expectedReturns[idx]; });
        if (mismatch) {
          return {
            ok: false,
            error: "Function \"" + start.properties.name + "\": a Function Return declares (" +
              actualReturns.join(", ") + ") but its Function Start declares returns (" +
              expectedReturns.join(", ") + ") -- they must match exactly."
          };
        }
      }
    }

    var cycleNode = findCycle(triggers.concat(functionStarts));
    if (cycleNode) {
      return { ok: false, error: "Exec chain cycle at \"" + (cycleNode.title || cycleNode.type) + "\" -- a \"then\"/event output eventually loops back into itself. Compiling would recurse forever; remove the loop." };
    }

    graph._nodes.forEach(function (node) {
      if (isDataNode(node)) node.onExecute();
    });

    // Compile every function body into its own scope, BEFORE the main trigger walk -- Lua only needs a
    // function defined above where it's called, and every function is defined once here regardless of how
    // many Call nodes (or how many OTHER functions) reference it.
    var functionBlocks = [];
    functionStarts.forEach(function (start) {
      CodeGen.pushScope();
      start.fireOnce();
      var bodyLines = CodeGen.popScope();
      functionBlocks.push("local function " + start.properties.name + "(" + (start.paramNames || []).join(", ") + ")");
      functionBlocks = functionBlocks.concat(bodyLines);
      functionBlocks.push("end");
      functionBlocks.push("");
    });

    triggers.forEach(function (node) { node.fireOnce(); });

    var body = CodeGen.getLines();
    var key = (triggers[0] && triggers[0].properties && triggers[0].properties.key) || "insert";
    var name = opts.scriptName || "GraphOutput";

    // Every one of these goes through CodeGen.luaString rather than raw concatenation -- this preamble was
    // the ONE place in the whole tool that spliced user text straight into a Lua string literal, which
    // codegen.js's own header explicitly forbids. A single `"` typed into the key widget produced
    // `local KEYVAL = "not a key "; os.exit()"` -- a file that won't even load.
    //
    // Single quotes are safe for the loader, verified against its own parser rather than assumed:
    // ExtractDefaultKey() in Merc2Reborn's lua_bridge.c scans the first 10 lines for "KEYVAL", then the
    // first `"` OR `'` after the `=`, and reads to the matching quote -- so luaString's single-quoted
    // output is read exactly the same way the old double-quoted form was.
    var out = [];
    out.push("local KEYVAL = " + CodeGen.luaString(key) + "  -- must be in the first 10 lines");
    out.push("");
    out.push("-- " + name + ".lua -- generated by mercs2-ess-visual. Edit the graph, not this file, and re-export.");
    out.push("if not _G.Ess then Loader.Printf(" + CodeGen.luaString(name + ": load Ess first (1_Ess.lua in scripts/OnLoad)") + ") return end");
    out.push("");
    functionBlocks.forEach(function (line) { out.push(line); });
    body.forEach(function (line) { out.push(line); });
    out.push("");
    out.push("Ess.Log(" + CodeGen.luaString("[" + name + "] ran") + ")");
    out.push("");

    return {
      ok: true,
      triggerCount: triggers.length,
      lineCount: body.length,
      unreachable: findUnreachable(graph, triggers.concat(functionStarts)),
      code: out.join("\n")
    };
  }

  return { compile: compile };
})();
