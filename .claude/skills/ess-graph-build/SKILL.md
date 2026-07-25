---
name: ess-graph-build
description: Use whenever building, rebuilding, or extensively editing a node graph in mercs2-ess-visual (the litegraph.js-based visual editor for Ess mods) -- especially graphs with more than a handful of nodes, where clicking nodes into place one at a time in the live canvas is slow and error-prone. Covers building a graph programmatically in the browser via a JS script against a real LGraph instance, discovering exact node-type shapes before wiring (never guess slot indices/types), the pure-data-vs-action-node ordering caveat that silently breaks captured-value wiring, compiling and patching capture-variable names, the full verification sweep before shipping, and serializing the result to a JSON file. Trigger for "build me a graph that...", "add these nodes and wire them", "rebuild the X sample/demo", or any request to construct or substantially modify an ess-visual graph.
---

# Building ess-visual graphs programmatically

Clicking nodes onto the canvas one at a time and dragging wires does not scale — graphs built for real
scenarios (a multi-key hotkey panel, a squad-command demo, a boilerplate sample) routinely reach 20-30+
nodes with 30-40+ links. The reliable way to build one is a JS builder script run against a real `LGraph`
instance in the browser, using the app's own `LiteGraph.createNode`/`.connect()`/`Compiler.compile()` APIs
— the exact same objects the UI itself manipulates, so anything built this way is guaranteed to load,
render, and compile correctly when serialized and opened in the real app.

Repo root: `C:\Users\logan\source\repos\mercs2-ess-visual`. Dev server: use `preview_start` with the
project's configured server name (check `.claude/launch.json`; it's a plain `python -m http.server`-style
static server) — this is a static-file app, no build step. All commands below assume the Browser pane's
`javascript_tool` (`mcp__Claude_Browser__javascript_tool`), issued against the app's page.

## The core workflow, in order

### 0. Fresh page load (cache-busting)

Chrome (and this environment's preview proxy) will happily serve a STALE `index.html`/JS bundle even from a
brand-new tab. If you've edited any `src/*.js` file this session, navigate to a cache-busted URL before
doing anything else:

```
navigate to http://localhost:<port>/index.html?bust=<any-random-string>
```

A plain `navigate(url, force:true)` is NOT reliable for this — it has to be a different query string each
time you need a genuinely fresh load (e.g. after editing a node file mid-session).

### 1. Build against a STANDALONE graph, not the app's live canvas

Don't fight the running UI (its own `graph`/`canvas` closure variables in `app.js` aren't exposed on
`window`). Instead create your own graph object and work against that directly:

```js
var g = new LGraph();
window.__g = g; // stash for later steps in this same tab session

function node(type, x, y) {
  var n = LiteGraph.createNode(type);
  if (!n) throw new Error("no such node type: " + type);
  n.pos = [x, y];
  g.add(n);
  return n;
}
// Sets BOTH the property AND the matching widget's displayed value -- setting .properties[k] alone
// leaves the widget showing its construction-time default (the exact bug widgetsync.js's configure()
// patch fixes for load/undo/paste; this is the equivalent fix for build-time property assignment).
function setProp(n, k, v) {
  n.properties[k] = v;
  var w = (n.widgets || []).filter(function (w) { return w.name === k; })[0];
  if (w) w.value = v;
}
window.__node = node;
window.__setProp = setProp;
```

This can be done across MULTIPLE `javascript_tool` calls in the same tab session — `window.__g`/`__node`/
`__setProp` persist between calls as long as you don't navigate away. Build the graph incrementally (main
chain, then each function block, then Call nodes) rather than one giant script, so a mistake in one section
doesn't force re-running everything.

### 2. NEVER guess a node's slot indices, types, or property names

Every node type's exact input/output shape (names, order, `type` string) is load-bearing for `.connect()`
calls and for `CodeGen.resolveNumberInput`'s slot-index arguments. Dump it first:

```js
function dump(type) {
  var C = LiteGraph.registered_node_types[type];
  if (!C) return type + ": NOT FOUND";
  try {
    var n = new C();
    var props = n.properties ? JSON.stringify(n.properties) : "{}";
    var ins = (n.inputs || []).map(function (i) { return i.name + ":" + i.type; }).join(",");
    var outs = (n.outputs || []).map(function (o) { return o.name + ":" + o.type; }).join(",");
    return type + " props=" + props + " in=[" + ins + "] out=[" + outs + "]";
  } catch (e) { return type + " ERROR: " + e.message; }
}
["ess/object/spawn", "flow/functionstart", "..."].map(dump).join("\n");
```

Exec/event pins show as `type: -1` (`LiteGraph.ACTION`/`LiteGraph.EVENT`, both -1). A node's exec input (if
it has one) is always slot 0 — data slots follow after it, in declaration order. To find EVERY node type
matching a rough guess, `Object.keys(LiteGraph.registered_node_types).filter(k => /keyword/.test(k))` first.

Dynamically-generated `flow/call/<Name>` types (one per Function Start currently in your graph) don't exist
until you call `FunctionCalls.rescan(g)` — do that after creating all Function Start nodes and BEFORE
creating any Call nodes or dumping their shape.

### 3. THE ordering caveat -- read this before wiring anything to a captured value

This is the single most common mistake when hand-assembling a graph, and it fails SILENTLY (no error, just
wrong/default data in the compiled output). From `codegen.js`'s own header:

> A captured value's local only exists from the moment its own action node actually executes, so its
> output is only meaningful when consumed by ANOTHER ACTION node further down the SAME exec chain. Wiring
> a captured value into a pure-data node's input reads stale/undefined data, since every pure-data node's
> `onExecute` runs once in `compiler.js`'s flat pre-pass, before any trigger — and therefore before the
> capturing node's own `onAction` has run.

Concretely: `Player: Get Position`, `Object: Spawn`'s `guid` output, `Set Local`'s `captured` output — any
node whose data comes from `CodeGen.newLocal`/`emitCapture` inside `onAction` — is an ACTION node (has an
`exec` input, `type: -1`). Wiring its output into a PURE-DATA node's input (`Number: Add`, `Compare`,
`Combine Coordinates` if it were built pure-data, etc. — anything with `onExecute` and no `exec` input)
silently reads `undefined`/the property default instead of the real captured name, because the pure-data
node evaluates in the compiler's flat pre-pass, which runs before ANY action node's `onAction` has fired.

**The fix, not a workaround**: if a node's whole job is to consume a captured value, build it (or use an
existing one) as an ACTION node — exec in, exec out, doing its one line of work in `onAction`, then
`this.triggerSlot(0)`. Wire it directly into the SAME exec chain right after the node that captures the
value it needs. `Combine Coordinates` (`flow/combinecoords`) and `Offset Number` (`flow/offsetnumber`) in
`nodes-flow.js` are both built this way for exactly this reason — read their header comments for the
worked example. Pure-data-to-pure-data chains (e.g. two `Compare`s into an `And`) are fine — pure-data
nodes not depending on a captured value don't have this problem.

### 4. Compile first, THEN patch guessed names — don't hand-type capture names blind

A capturing node's local variable name (`__px3`, `__spawn1`, ...) depends on `CodeGen.newLocal`'s
per-prefix counter AND on `compiler.js`'s 3-pass execution order (data pre-pass → each function body,
in `graph._nodes` order → main trigger walk) — NOT on where the node visually sits or when you created it.
Don't guess these names ahead of time for a `Set Local`/raw-text property that needs to reference one.

Workflow: wire everything real (exec chains, data wires) first, using an obvious placeholder for any raw
text that has to reference a capture name (e.g. `"PXPLUS8"`). Then:

```js
var res = Compiler.compile(window.__g, { scriptName: "Whatever" });
res.code; // read the ACTUAL generated Lua -- this is where the real __prefixN names are
```

Read the real names out of `res.code`, patch the placeholder properties via `setProp`, recompile, and
confirm the placeholders are gone from the output. `res.ok === false` gives `res.error` with a specific,
actionable message (unnamed Function Start, duplicate names, a returns-count mismatch, a cycle) — read it,
don't just retry blindly.

### 5. Full verification sweep before calling it done

Every one of these has caught a real bug in this codebase at some point — don't skip any of them for a
graph of any real size:

```js
// a) widget/property mismatch -- every node's displayed widget must match its actual property
var mismatches = [];
g._nodes.forEach(function (n) {
  (n.widgets || []).forEach(function (w) {
    if (w.name && n.properties.hasOwnProperty(w.name) && w.value !== n.properties[w.name]) {
      mismatches.push(n.title + "." + w.name);
    }
  });
});

// b) Load-Graph round trip -- byte-identical compile before/after configure() is the real regression
// test for the widget-desync bug class (see widgetsync.js's header) -- ALWAYS run this for a graph
// you're about to hand to someone as a .json file, since that's exactly the load path they'll hit.
var json = JSON.stringify(g.serialize());
var g2 = new LGraph();
GraphIO.restoreGraph(g2, json, function () { FunctionCalls.rescan(g2); });
var same = Compiler.compile(g2, { scriptName: "X" }).code === Compiler.compile(g, { scriptName: "X" }).code;

// c) full node-type sweep -- catches a node type that throws on construction or on a bare
// onExecute/onAction call with nothing wired (every node must survive this standalone)
var errors = [];
Object.keys(LiteGraph.registered_node_types).forEach(function (t) {
  try {
    var n = new (LiteGraph.registered_node_types[t])();
    if (n.onExecute) n.onExecute();
    if (n.onAction) n.onAction();
  } catch (e) { errors.push(t + ": " + e.message); }
});

// d) all boilerplate samples still compile -- a node-file edit (new node type, changed slot type on an
// EXISTING node) can silently break an unrelated sample that happens to use it
var sampleResults = {};
Samples.list.forEach(function (s) {
  var sg = new LGraph();
  try {
    Samples.load(s.id, sg);
    FunctionCalls.rescan(sg);
    sampleResults[s.id] = Compiler.compile(sg, { scriptName: s.id }).ok ? "OK" : "FAIL";
  } catch (e) { sampleResults[s.id] = "THREW: " + e.message; }
});
```

All four should come back clean (`mismatches.length === 0`, `same === true`, `errors.length === 0`, every
sample `"OK"`) before you write the file or report the graph as done.

### 6. Serialize and write the file

```js
JSON.stringify(g.serialize(), null, 2);
```

The tool result comes back as a JSON-escaped string in the harness — when you (the model) read it, it's
already decoded to real text; write it straight to the target `.json` path with the `Write` tool. 2-space
pretty-printing matches this repo's existing convention for hand-inspectable graph files. Validate the
written file parses (`python -c "import json; json.load(open(path))"` is a fast sanity check) before
treating the file as done.

## Known-good reference

`ess/object/spawn`, `ess/player/getposition`, `flow/combinecoords`, `flow/offsetnumber`,
`flow/functionstart`, `flow/call/<Name>` are all real, previously-confirmed-working node types — if in
doubt about the general shape of an action node vs. a pure-data node, read one of these directly in
`src/nodes-*.js` rather than re-deriving the pattern from scratch.

## When something doesn't work

- **A wire's data reads as `undefined`/the default property value in compiled output, no error anywhere**:
  almost always the ordering caveat (section 3) — check whether the source of that wire is an action node
  and the consumer is pure-data.
- **`FunctionCalls.rescan` throws "node type not found"**: means something else touched
  `LiteGraph.registered_node_types` directly out of sync with its own bookkeeping — shouldn't happen via
  this workflow; if it does, it's a real bug in `nodes-function-calls.js`, not a builder-script mistake.
- **A freshly-edited node file's changes don't show up**: the page wasn't actually reloaded fresh — redo
  step 0 with a NEW random `?bust=` value, not the same one as before.
- **`javascript_tool` returns `undefined` from an otherwise-correct-looking script**: has happened
  transiently in this environment for no clear reason (not a real error) — re-run the same read-only query
  (e.g. `Compiler.compile(...).code` as its own separate call) rather than assuming the graph state is bad.
