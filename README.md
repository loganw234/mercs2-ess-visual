# mercs2-ess-visual

A draft node-graph editor for scripting Mercenaries 2 Ess mods visually — wire up a trigger and a
sequence of actions, hit Compile, get a real `scripts/OnKey/*.lua` file out. Built on
[litegraph.js](https://github.com/jagenjo/litegraph.js) — the same engine ComfyUI's own node canvas runs
on, vendored here (MIT) rather than pulled in as a live dependency.

**Status: draft / proof of concept.** Small on purpose — see "What's deliberately not here yet" below
before extending it.

## Try it

No build step. `python -m http.server` (or any static server) in this folder, or just open `index.html`
directly, and open it in a browser. The default graph is already wired up: **On Key Press → Give Cash →
Toast Message → Spawn Ahead**, with a **Random Number** node feeding Spawn Ahead's distance instead of a
fixed value. Hit **Compile** to see the generated Lua, **Download .lua** to save it.

## The model: two kinds of wire, and neither one is "real" at compile time

This is the thing that actually makes a node graph worth it over Scratch/Blockly-style stacked blocks for
this domain, and it's worth understanding before adding nodes:

- **Event/exec wires** (the dotted white connections between `then`/`exec` pins) represent *sequence* —
  "this happens, then this happens." This is litegraph's own built-in `LiteGraph.ACTION`/`LiteGraph.EVENT`
  slot system (see `FilterEvent` in `lib/litegraph.js` for the same pattern upstream) — not something
  invented for this repo.
- **Data wires** (the plain colored connections, e.g. Random Number → Spawn Ahead's `distance`) represent
  *value composition* — chaining one call's result into another's argument, the thing that gets cramped
  fast in stacked-block editors.

**Neither wire carries a real, computed JavaScript value.** A data node's "value" is Lua *source text* —
`Random Number` doesn't compute an actual random number in the browser, it emits the expression
`"(Ess.RNG.new():int(11) + 4)"` (via the engine-safe `Ess.RNG`, not raw `math.random` — see that node's own
comment in `src/nodes.js` for why that distinction matters on this engine), so the randomness happens
in-game, at runtime, when the compiled script actually runs. "Compiling" a graph never executes anything
for real; it walks the graph once (`compiler.js`) and assembles a string. See `src/codegen.js`'s header
comment for the full reasoning. The same "data is Lua source text" idea extends to table/list-shaped
params (a guid list, a spawn table) in the newer node files below — see their own header comments.

## Adding your own node

Every node in `src/nodes.js` follows the same three-part shape:

```js
function MyAction() {
  this.addInput("exec", LiteGraph.ACTION);      // chain in
  this.addOutput("then", LiteGraph.EVENT);      // chain out
  this.addInput("someValue", "number");         // a value slot -- widget by default, wire overrides it
  this.addProperty("someValue", 10);
  this.addWidget("number", "someValue", 10, function (v) { this.properties.someValue = v; }.bind(this));
}
MyAction.prototype.onAction = function () {
  var v = CodeGen.resolveNumberInput(this, 1, "someValue");   // input 1, NOT 0 -- "exec" already took slot 0
  CodeGen.emit("Ess.Whatever.doThing(" + v + ")");
  this.triggerSlot(0);
};
LiteGraph.registerNodeType("ess/myaction", MyAction);
```

**The one bug worth knowing about in advance** (found and fixed while building the example graph): input
slot indices are shared across every `addInput` call on a node, in call order — if `"exec"` is added
first, it's slot 0, and your next `addInput` is slot 1, not 0. `resolveNumberInput`'s second argument is
that slot index; get it wrong and the node silently falls back to its widget default instead of reading a
connected wire, with no error anywhere. Easy to miss without actually compiling and reading the output —
which is exactly how this one was caught.

A pure-data node (no exec pins at all, like `Random Number`) just needs `onExecute` calling
`this.setOutputData(slot, "<lua expression text>")` — no `onAction`/`triggerSlot` involved.

## Node coverage

`src/nodes.js` (the original 5: On Key Press, Give Cash, Toast Message, Spawn Ahead, Random Number) plus
five namespace-grouped files added in a second pass, ~60 nodes total covering most of Ess's **Easy tier**:

| File | Covers |
|---|---|
| `src/nodes-world.js` | `Easy.Vehicle`, `Easy.Spawn`, `Easy.World`, `Easy.Fun` |
| `src/nodes-player.js` | `Easy.Player`, `Easy.Human`, `Easy.Debug` (+ a `Player.character` data node) |
| `src/nodes-markers-camera.js` | `Easy.Mark`, `Easy.Camera`, `Easy.Sound`, `Easy.Confirm` |
| `src/nodes-encounter.js` | `Easy.AIOrders`, `Easy.Relations`, `Easy.Airstrike` |
| `src/nodes-missions.js` | `Easy.Objective`, `Easy.Quest`, `Easy.Contract`, `Easy.Sandbox` |

**Still genuinely small next to Ess's full surface.** This is Easy-tier only — none of Core or Raw tier is
represented (by design; Easy is the one-liner tier this node model fits best), and even within Easy tier,
`Ess.Easy.Triggers.*` (`onPlayerNear`/`onDeath`/`after`) and every `onDone`/`onFail`/`onComplete` callback
parameter across `Objective`/`Contract`/`Quest`/`Confirm` are deliberately not wired up — all of those take
a Lua callback, and this compiler only assembles a flat sequence of statements right now. `Ess.Easy.Confirm`
is implemented but only fires both its "yes" and "no" exec outputs immediately at compile time as a
documented placeholder (see `nodes-markers-camera.js`) rather than actually branching on the in-game
answer. Wiring real callback bodies through would need the compiler to support nesting emitted code inside
a generated closure — a real, separate piece of work, not a template tweak.

## What's deliberately not here yet

- **Only one compile target** (an OnKey script). An OnLoad target and an "HTML tool button" target were
  both discussed as natural next steps — same node library, different compiler backends (OnKey-style
  toggle state needs `Ess.State`, an HTML button's toggle state is just a JS variable, and anything reading
  live game data from a browser is async in a way nothing in-game ever is).
- **Callback-shaped calls** — see "Node coverage" above.
- **No save/load.** The example graph is rebuilt in code (`src/app.js`) every page load; there's no
  project-file persistence yet.
- **No data-node-to-data-node chains in the compiler.** `compiler.js`'s pre-pass runs every data node
  once, in whatever order `graph._nodes` returns; a data node that reads another data node's output would
  need a real topological sort first. Not needed for anything in this draft's node set.
- **List/table-shaped parameters are raw text widgets, not a real list-building UI.** A "guids" or "spawns"
  parameter is a string widget whose text IS a Lua table literal, spliced in unquoted — you type
  `{ Ess.Guid('some_unit') }` by hand rather than building it from connected nodes. Consistent with the
  "data is Lua source text" model, but a real list-builder node (append/remove entries visually) would be
  a nicer next step than hand-typing table syntax.

## Credit

`lib/litegraph.js` / `lib/litegraph.css` are vendored, unmodified, from
[jagenjo/litegraph.js](https://github.com/jagenjo/litegraph.js) (MIT). `lib/tokens.css` is vendored from
this ecosystem's own `mercs2-tools-shared` (local-only, not yet published).

## License

[MIT](LICENSE) for everything in this repo other than the vendored `lib/litegraph.*` (also MIT, upstream
license applies).
