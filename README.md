# mercs2-ess-visual

A draft node-graph editor for scripting Mercenaries 2 Ess mods visually — wire up a trigger and a
sequence of actions, hit Compile, get a real `scripts/OnKey/*.lua` file out. Built on
[litegraph.js](https://github.com/jagenjo/litegraph.js) — the same engine ComfyUI's own node canvas runs
on, vendored here (MIT) rather than pulled in as a live dependency.

**Status: draft / proof of concept.** Small on purpose — see "What's deliberately not here yet" below
before extending it.

## Try it

No build step. `python -m http.server` (or any static server) in this folder, or just open `index.html`
directly, and open it in a browser. The default graph is already wired up: **Spawn & Control** (spawn a car
ahead, capture its guid, face/heal it, log where it landed, clean it up) — one of 10 boilerplate starting
points under **Load a boilerplate sample** (`src/samples.js`), each adapted from a real, smoke-tested script
in [mercs2-lua-essentials](https://github.com/loganw234/mercs2-lua-essentials)'s own `samples/` — see
"Boilerplate samples" below. Hit **Compile** to see the generated Lua, **Download .lua** to save it, or
**Connect** (lua-bridge on the running game) and hit **Run in game** to send the compiled script straight
over and watch the exec chain light up on canvas as it goes (`src/bridge.js` / `src/runviz.js`).

## Working with a graph: save, load, undo, autosave

**Copy (Ctrl+C), Paste (Ctrl+V), Select All (Ctrl+A), and Delete already work** — litegraph ships all four
built in (`LGraphCanvas.prototype.processKey` in `lib/litegraph.js`), confirmed working end-to-end against
this app with zero code changes needed. They just had no visible affordance anywhere, so there was nothing
to tell you they existed — the sidebar's shortcut legend now says so. Paste-then-nudge is also how you
duplicate a node; there's no separate dedicated shortcut for that.

**Save Graph / Load Graph** (`src/graphio.js`) round-trip the whole graph as a `.json` file, straight off
litegraph's own `graph.serialize()`/`configure()` — already a complete, well-formed snapshot, nothing custom
to invent. **Autosaves to this browser** as you work (localStorage, debounced) with zero setup — reopening
the tool offers to restore it instead of the default sample. A real gap this closes: until this pass, there
was no persistence at all, so a refresh silently lost everything.

**Undo/Redo** (Ctrl+Z / Ctrl+Y, or the toolbar buttons) is a plain stack of serialized snapshots, not a
diff system — simple, and a hand-built graph serializes to a few KB, so keeping up to 50 full copies around
costs nothing that matters. It's wired to `graph.on_change`, not the `beforeChange`/`afterChange` pair
litegraph's own source explicitly comments "used for undo" — that pair turned out to only fire from a
handful of litegraph's own interactive paths (drag-end, its own paste flow); plain `graph.add()`, which is
what the palette's click-to-add and every programmatic graph build in this tool goes through, calls
`this.change()` (→ `on_change`) instead, and far more broadly. Recording is debounced 400ms so a drag in
progress collapses into one undo step, not one per frame.

**New Group** (toolbar button) labels a cluster of nodes for a reader — select the nodes first (drag a box
around them, or shift/ctrl-click each one), then click the button: it prompts for a title and sizes/positions
a litegraph `LGraphGroup` around exactly what was selected, in a curated default color rather than
litegraph's flat gray. Litegraph's own "Add Group" (right-click empty canvas) already exists and still
works — it just drops an unlabeled, unsized 140x80 box wherever you clicked, which is real but genuinely easy
to miss; this button is the one gap it had worth fixing (asking for a title up front, sizing to a selection).
Renaming, recoloring, and resizing an existing group afterward are litegraph's own built-ins (right-click a
group → **Edit Group**) and weren't reimplemented here. Groups are purely a visual/spatial aid — litegraph
determines membership by bounding-box overlap (`LGraphGroup.recomputeInsideNodes`), not an explicit list, and
`graph.serialize()`/`configure()` already round-trip them with zero changes needed here, same as every other
graph shape. Useful for fencing off each Function Block (see "Function blocks" below) with its own labeled box in a
graph meant to teach.

**The two-pass restore, and the two real bugs this pass caught by actually testing it**, not just reading
the code:
1. This graph's node types aren't all static — a `flow/call/<name>` type (see "Function blocks" above)
   only exists once `FunctionCalls.rescan(graph)` has seen that function's Function Start node, which itself
   only exists once the graph has been restored. A single `configure()` pass on a save containing a Call
   node hits that ordering gap and gets a dead placeholder node instead. `GraphIO.restoreGraph()` configures
   twice — once so Function Start nodes land for real and a rescan can see them, again now that every Call
   type the graph needs is registered — simpler than detecting which case applies and branching.
2. Function Start/Return's `onConfigure` originally called the SAME rebuild function the params/returns
   text widget uses — which works for a live edit, but on load it ran AFTER litegraph had already restored
   the correct wires, and silently destroyed every one of them (removeInput/addOutput replace a slot
   outright, with no attempt to preserve what was connected). A Save → Load round trip on any graph with a
   function looked fine right up until you compiled it and got `nil` where a real value used to be. Fixed by
   having `onConfigure` only re-derive the plain-JS paramNames/returnNames cache from the (already-correct)
   restored properties, never touching the pins themselves.

## Boilerplate samples

`src/samples.js` ships **10 starting graphs** (**Load a boilerplate sample**, top-right) — each one adapted
from a real script in [mercs2-lua-essentials](https://github.com/loganw234/mercs2-lua-essentials)'s own
`samples/`: the framework's smoke-tested recipes (`samples/recipes/*.lua`, each ending in a self-verifying
`[SMOKE] <name>: PASS/FAIL` log line and run before every Ess release) or its larger demos
(`samples/demos/*.lua`). Not a token gesture at "inspired by" — the Ess calls, parameter shapes, and cleanup
timing below are the real recipe's, translated node-for-node wherever this tool's node coverage allows.

| Sample | Adapted from | Demonstrates |
|---|---|---|
| Spawn & Control | `recipes/spawn_and_control.lua` | the foundational spawn → capture guid → act pattern; one Custom Code line for the position report (`Object.pos`/`Math.dist2D` aren't wrapped as nodes) |
| Command a Squad | `recipes/command_a_squad.lua` | a captured **guid list** (`Spawn: Enemies`) feeding straight into `AI Orders: Attack`, no per-unit bookkeeping |
| Mark & Notify | `recipes/mark_things.lua` + `notify_the_player.lua` | two captured Mark handles, all four HUD notification styles, and the one Custom Code line `Ess.Mark.clear` needs (no dedicated "clear" node yet) |
| Direct the Camera | `recipes/direct_the_camera.lua` | capturing a **closure** (Camera: Orbit's `stop`) and calling it later from Custom Code, alongside a captured guid |
| Command a Helicopter | `recipes/command_a_helicopter.lua` | fully node-based, no Custom Code — the "(Full)" crewed-template + `Vehicle: Fly To` gotchas baked in |
| A Quick Mission | `recipes/a_quick_mission.lua` | `Quest: Create`'s typed steps table -- an auto reach-marker step then a manual one, no Contract |
| Call In Support | `recipes/call_in_support.lua` | the airstrike beat of Ess's support call-in system |
| World Tweaks | `recipes/world_tweaks.lua` | a fully node-based delayed cleanup (`Trigger: After` needs no captured value when the callback takes no arguments) |
| Timers & Loop | `recipes/do_it_later.lua` | `Trigger: After` vs. `Loop: Start` side by side, with a bare global (not a captured value) for state that persists across repeated ticks |
| Trailer Hitch | `demos/TrailerHitch.lua` | this library's one **Native**-tier sample -- welding two spawned vehicles together with the engine's raw `Object.Attach` |

**A note on the captured-variable text a few of these type directly into a Custom Code block or a Trigger's
raw `fn`** (e.g. `__spawn1`, `__mark2`): that's the exact compiled local name `CodeGen.newLocal` will
produce for that capture, in that graph, at that position in the chain — verified by actually compiling each
sample and reading the real output, not hand-calculated. Three of these were wrong on the first pass (a
guessed `__guids1`/`__handle1`/`__stop1` that didn't match the node's real chosen prefix) and would have
shipped as Lua referencing an undefined variable — caught only because every sample here was compiled and
checked before it shipped, the same standard the rest of this tool holds itself to.

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

## Branching, captured values, and Flow Control

Three additions past the base exec/data model above, together aimed at real "semi-complex" scripts instead
of a flat sequence of one-liners:

**Branching** — `Flow: Branch (If)` (`src/nodes-flow.js`) gives you `if <condition> then <true chain> else
<false chain> end`, condition as raw Lua boolean-expression text (type it, or wire in `Compare`/`And`/`Or`/
`Not`, which each emit exactly that). No merge/"then" output afterward, deliberately — same shape as Unreal
Blueprint's Branch node (this tool's own design reference): true and false are independent continuations,
not rejoining paths. Under the hood this is the one genuinely new piece of compiler machinery in this repo:
`codegen.js`'s `emit`/`getLines` moved from one flat line array to a **stack of scopes** —
`CodeGen.pushScope()`/`popScope()` let a node capture a self-contained sub-chain's lines separately from
whatever comes before/after it (Branch pushes a scope, fires its "true" output via `triggerSlot`, pops the
captured lines, repeats for "false", then wraps both in the if/then/else text) — with indentation tracked
automatically so nesting (a Branch inside another Branch's true/false chain) reads correctly once
downloaded, not flush-left regardless of depth.

**Captured values** — some real Ess/native calls return something worth keeping: a spawned entity's guid, a
marker/objective/quest handle, a `cancel()`/`stop()` closure to undo something later, a success flag, a
computed number. `CodeGen.newLocal(prefix)` mints a fresh unique Lua local name ("spawn1", "spawn2", ...,
one counter per prefix) and `emitCapture`/`emitNativeCapture` emit `local <name> = <expr>` (the native
variant also pcall-wraps and normalizes a failed call's result to `nil`, matching every guid-returning Ess
function's own convention, rather than leaving the local holding pcall's raw error string on failure). The
capturing node then does `this.setOutputData(slot, name)`, so the bare variable name splices into any
downstream consumer exactly like any other raw-Lua-expression data wire. **38 nodes across both tiers**
expose a captured return value this way now — Spawn Ahead, Object: Spawn, every `Easy.Spawn.*` and
`Vehicle: Summon`, Mark Enemy/Objective/Zone, Camera Watch/Orbit, every Trigger's arm, every
Objective/Quest/Contract/Sandbox starter, Cinematic: Play, Object: Damage/Snap To Ground, Vehicle: Fly
To/Orbit Flight, all five **Marker Add\*** natives, Object: Attach, and HUD MessageBox: Add Message — wire a
spawn's `guid` output straight into Mark Enemy/AI Orders/Camera Watch instead of only ever spawning things
you have no way to reference again in the same script. Two of those calls genuinely return MORE than one
value (Lua's native multi-return, not a single expression) and get a hand-written capture instead of the
standard helper, each documented at its own call site: **Vehicle: Enter Seat Excluding** exposes `ok` and
`seatUsed` as two separate outputs, and **Object: Attach** (native) discards the redundant `bResult` pcall
already gives you and exposes only the useful `guid`. `Flow: Set Local` generalizes capture to ANY raw
expression, not just a return value — useful both for readability and for a real correctness gotcha: wiring
one data node's output into TWO different consumers without Set Local in between means each consumer
splices the SAME expression text independently, so `Random Number` wired to two places gives two
*different* rolls at runtime despite looking like "one value, used twice" — routing it through Set Local
evaluates it once and both consumers read the identical captured local. (Ordering caveat: a captured
value's local only exists from the moment its own action node executes, so it's only safe to consume from
another ACTION node further down the same exec chain — see `codegen.js`'s header for why a pure-data node
consumer would read stale data.)

**Flow Control nodes** (`src/nodes-flow.js`, registered under a third type-namespace, `"flow/*"`, alongside
`"ess/*"` and `"native/*"`; its own sidebar category): `Compare` (`==`/`~=`/`</<=`/`>`/`>=`, operator picked
from a combo), `And`/`Or`/`Not`, `Add`/`Subtract`/`Multiply`/`Divide`, `Set Local`, `Log`
(`Ess.Log(tostring(msg))`, for checking a captured value or confirming a branch took the path you expected),
and `Custom Code` — the escape hatch: one multiline text widget (click it to open a real textarea, not a
single-line prompt), spliced verbatim into the compiled script via a single `CodeGen.emit()` call, for
anything without a dedicated node yet. It can reference any `__prefixN` local captured earlier in the same
exec chain, but has no way to surface what's actually in scope, so getting a variable name right is on you.
All the comparison/boolean/arithmetic nodes are pure-data, same "emit an expression, never a computed
value" model as Random Number — chaining one into another (e.g. two `Compare`s into one `And`) works
whenever the upstream node happens to execute first in the pre-pass, but isn't guaranteed by construction
(see "What's deliberately not here yet" below) — keep chains shallow until that gets a real topological
sort.

Three nodes break that "arithmetic/combiner nodes here are pure-data" pattern on purpose: `Combine
Coordinates` (`{x=.., y=.., z=..}`, for feeding a single position argument like AI Orders: Guard's `at`),
`Offset Number` (`value + by`, for nudging a captured coordinate by a fixed amount — e.g. spawning four
units around a captured player position instead of on top of it), and `Combine List (4)` (`{ a, b, c, d }`,
for combining four individually-captured values, like four Spawn nodes' guids, into the list shape an AI
Orders node's `guids` argument expects). All three are real ACTION nodes (exec in, exec out) rather than
this section's usual pure-data shape, specifically so each can safely sit right after — and read from — a
capturing node like `Player: Get Position` or `Spawn` in the SAME exec chain, instead of racing the
pre-pass (see `codegen.js`'s "ORDERING CAVEAT" note — a pure-data consumer of a captured value reads
stale/undefined data, since pre-pass nodes all run before any action node's own onAction has set its
output). `Combine List (4)` is fixed at exactly four slots — a real variable-arity list-builder is a nicer
next step than this (see "What's deliberately not here yet" below). (Also `flow/*`, but substantial enough
for their own section: **Function Start**, **Function Return**, and dynamically-generated **Call** nodes —
see "Function blocks" below.)

## Function blocks

Reusable, parameterized functions — the piece that turns "a sequence of one-liners" into something closer
to a real program. Two static node types (`src/nodes-function.js`) plus one dynamically-generated node
type per function you actually define (`src/nodes-function-calls.js`).

**Function Start** marks a function's entry point — name it, list its `params` and its `returns` (both
comma-separated text, e.g. `targetGuid, amount`). Its param names become real output pins, each carrying
its own literal name as Lua text (referencing `targetGuid` inside the function body IS the real bound
local, once compiled — like every other data wire here, it's never a computed value, see `codegen.js`'s
header). Its `returns` declaration is the single source of truth for what a **Function Return** node inside
this function is allowed to return, and what a **Call: name** node's output pins look like elsewhere in the
graph.

**Function Return** ends execution with `return a, b, ...` — a function can have several of these (one per
early-return branch), each independently declaring its own `returns` list, checked against its owning
Function Start's `returns` at COMPILE TIME, not live-synced in the UI. (Several Return nodes tracking one
Start node's property live would need real cross-node event wiring for a benefit a clear compile error
covers just as well — see the file's own header for the full reasoning.)

**Call: name** nodes don't exist until you've defined a function — `FunctionCalls.rescan(graph)` scans the
CURRENT graph for every Function Start and registers a matching `flow/call/<name>` type (params as inputs,
returns as outputs, both with the same typed-default-or-wire pattern every other data slot in this tool
has, not a wire-only pin with no way to type a literal). This runs after every sample load and right before
every compile, so compiling always reflects each function's current signature — but an ALREADY-PLACED Call
node instance doesn't retroactively resize if you edit that function afterward (litegraph has no live pin
migration for an existing instance when its type re-registers); delete and re-drop it to pick up the new
signature. A real, documented limitation, not a bug — not worth solving properly for a draft tool.

Compiling gets a new pass, ahead of the main trigger walk: every Function Start's own chain compiles into
its own `local function name(params) ... end` block (the same `CodeGen.pushScope()`/`popScope()` mechanism
Branch already uses), assembled once regardless of how many Call nodes reference it — a Call node never
re-walks into the callee's own definition at compile time, it just emits a plain `name(args)` expression,
so a function calling itself (real Lua recursion) is completely safe here. Two new compiler guardrails
alongside the existing key/cycle ones: every Function Start needs a unique name, and every reachable
Function Return's `returns` must match its own Start's — both fail the compile with a clear error instead
of silently producing a broken or wrong-shaped function.

**Why inline, on the same canvas, rather than a separate mini-graph you switch into**: litegraph actually
ships its own general-purpose Subgraph system (`graph/subgraph`, `graph/input`, `graph/output`) that looks
like a shortcut here, but it's built for litegraph's own continuous dataflow execution (`graph.runStep()`)
— something this tool never uses at all, since everything here compiles once via `Compiler.compile()`'s own
one-shot walk instead. Adopting it would mean fighting a large subsystem built for a different execution
model. Building Function Start/Return/Call from scratch, living on the same graph the rest of the script
already does, reuses the exact single-graph compile pass already in place and needed no new
graph-switching UI.

**Compiler guardrails**, both new checks in `compile()` before anything is emitted: a compiled script binds
to exactly one key (`KEYVAL`, declared once for the OnKey loader), so multiple `On Key Press` nodes with
*different* keys now fail to compile with a clear error instead of silently keying off only the first one
while still including every other trigger's chain in the body (previously: the second trigger's chain ran
on the *first* trigger's key, and the second key was never reachable at all). And a static cycle check
(white/gray/black DFS over the exec-link graph, same shape `runviz.js` already walks for its animation)
catches an exec chain that loops back into itself before compiling recurses into it for real — in practice
this is hard to construct through normal wiring at all (each node's exec input accepts exactly one incoming
link, so closing a loop back onto an already-externally-reachable node just steals that connection instead
of creating a real cycle), but it's a cheap, correct safety net to have regardless.

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
eleven namespace-grouped files added across four later passes, **183 nodes total** — every `Ess.Easy.*`
function has a node (two narrow, documented exceptions below), plus a wide slice of the **Core** tier
(the direct `Ess.*` namespaces, not just their `Easy` wrappers) for the namespaces modders touch most:

| File | Covers |
|---|---|
| `src/nodes-world.js` | `Easy.Vehicle`, `Easy.Spawn`, `Easy.World`, `Easy.Fun` |
| `src/nodes-player.js` | `Easy.Player`, `Easy.Human`, `Easy.Debug`, plus Core `Player.camera`/`.targetUnderReticle`/`.inVehicle`/`.onFoot`/`.giveFuel`/`.removeBoundaries`/`.setInputEnabled`/`.rumble`/`.teleport` |
| `src/nodes-markers-camera.js` | `Easy.Mark`, `Easy.Camera`, `Easy.Sound`, `Easy.Confirm`, plus Core `Camera.fov`/`.restoreFov`/`.panicRevert` |
| `src/nodes-encounter.js` | `Easy.AIOrders`, `Easy.Relations`, `Easy.Airstrike`, plus Core `Relations.setFeeling`/`.getFeeling`/`.set-`/`.getPerceivability` |
| `src/nodes-followers.js` | `Ess.Followers` (Core `recruit`/`dismiss`/`order`/`setMarkersEnabled`/`isFollower`/`count` — `Order Follow` is `order("follow", ...)` directly, no Easy wrapper of its own — plus Easy's `recruit`/`orderAttack`/`orderPatrol`/`orderGuard`), and two "visual compactor" nodes (`Guard My Position`, `Patrol Around Me` — see below) |
| `src/nodes-missions.js` | `Easy.Objective`, `Easy.Quest`, `Easy.Contract`, `Easy.Sandbox` |
| `src/nodes-cinematic.js` | `Easy.Cinematic.play` (declarative cutscene timelines) |
| `src/nodes-utility.js` | `Easy.Console`, `Easy.Impulse`, `Easy.Menu` (`ess/ui/menu`), `Easy.Time`, `Easy.Triggers`, plus Core `Loop.start`/`.stop`, `Input.held` (`Is Key Held`), and `Keys.*` |
| `src/nodes-object.js` | Core `Ess.Object.*` (34 nodes — health/life, transform, physics, visibility/labels, spawn), plus the `Spawn Friendly Unit` "visual compactor" (see below) |
| `src/nodes-human-vehicle.js` | Core `Ess.Human.*` (14) and `Ess.Vehicle.*` (11) |
| `src/nodes-hud-sound.js` | Core `Ess.Hud.*` and `Ess.Sound.*` |

**`Ess.Followers`** is a lifecycle-aware "who's currently assigned to me" roster, built entirely on
`Ess.AIOrders`/`Ess.On.death`/`Ess.Mark` — `Ess.AIOrders.command` itself is stateless (every call re-passes
an explicit guid list, and never remembers who you've recruited). `Followers: Recruit` runs the confirmed
`Ai.Feeling`/`Ai.LivingWorld`/`Ai.SetState("Vip")`/`Ai.Role("Follow")` sequence AND remembers the guid;
`Followers: Dismiss` reverts it AND forgets it; a dead follower prunes itself automatically, no polling. The
payoff is `Followers: Order Attack`/`Order Patrol`/`Order Guard` — command the WHOLE current roster with no
guid list to re-thread through the graph at all. Per-follower world markers (each in its own color) plus a
temporary marker at wherever the current order's destination/target is are ON by default (`Followers: Set
Markers Enabled` toggles them); a follower auto-resumes Follow on natural completion (attack's target dies,
a non-looping move/patrol finishes) — guard/hold/a looping patrol have no natural "done" and stay on that
order until told otherwise.

**"Visual compactor" nodes** collapse a multi-node chain this tool's own boilerplate graphs kept needing by
hand into one node, still spliced as plain Lua text like everything else here — not a new codegen mechanism,
just fewer nodes to wire for a common shape. Three so far: `Spawn Friendly Unit` (`Player: Get Position` +
offset trig + `Object: Spawn` + `Relations: Set Feeling` both ways, picked by an angle/distance around the
player instead of hand-typed x/z offsets), `Followers: Guard My Position` (`Player: Get Position` + `Combine
Coordinates` + `Followers: Order Guard`), and `Followers: Patrol Around Me` (builds a 4-corner box patrol
route around the player from a single radius, instead of hand-typing a `{ {x=...}, ... }` points table).

Within this Ess tier, coverage favors the namespaces a mod script actually reaches for
(Object/Human/Vehicle/Player/Camera/Relations/Hud/Sound/Loop) over generic infrastructure (`Ess.Table.*`,
`Ess.Safe.*`, `Ess.Override.*`, `Ess.Save*`, the raw `Ess.UI.*` builder API — none of these are "mod
actions," they're plumbing for other Lua code, so they stay out) and skips any getter whose real return is
genuinely multi-value with no single primary one (documented with a one-line skip comment at each call
site — e.g. `Object.pos`/`.velocity`/`.size`, `Player.pose`/`.viewYaw`, `Vehicle.followGhost`,
`Human.allWeapons`) — this node model is one Lua value per output slot; see `nodes-player.js`'s header for
the `targetUnderReticle`-style exception (a multi-return function whose own doc comment already establishes
a primary first value survives fine). (`Ess.Raw.*` itself — Ess's own thin pcall wrappers underneath
Easy/Core, e.g. `Ess.Raw.Impulse.*` — isn't separately represented; the **Native** tier below reaches past
even that, straight to the bare engine.)

**Callback parameters** (`Confirm`'s `onYes`/`onNo`, `Triggers.*`'s `fn`, `Menu`'s `entries` actions, every
`onDone`/`onFail`/`onComplete` across `Objective`/`Quest`) are still modeled as raw Lua-source **text**
properties — the same
"data is Lua source text" convention table/list params already use (see `codegen.js`'s header) — rather than
visually-wired exec branches. An earlier version of `Confirm` tried the opposite: two EVENT outputs that
both fired immediately at compile time, which produced Lua where the real callback was an empty no-op while
anything wired after the output ran unconditionally at call time, not when the callback actually fired.

**`Keys: On` and `Loop: Start` (`src/nodes-utility.js`) are the two callback-shaped nodes that now DO
support a real wired chain**, via a second EVENT output ("on press" / "on tick", alongside the usual "then")
captured through the exact same `CodeGen.pushScope()`/`popScope()` mechanism Branch's true/false already
use: whatever's wired compiles into its own isolated scope, and THAT gets wrapped in a real Lua closure at
emit time instead of inlined immediately — the "nesting emitted code inside a generated closure" this
section used to call out as unsolved. `Loop: Start`'s wrapped body gets one thing `Keys: On`'s doesn't: a
`return true` appended automatically after whatever's wired, since `Ess.Loop.start` stops the moment a tick
returns anything falsy and a wired chain has no natural return value of its own. Left unwired, both fall back
to their raw-text property (`Keys: On`'s `call`, `Loop: Start`'s `tickFn`) for a quick one-liner — `tickFn`
still owns its own `return true`/`false` in that case, unchanged from before this existed. This is a real
pattern now, not just a possibility — the other callback-shaped nodes above (`Confirm`, `Triggers.*`, `Menu`,
`Objective`/`Quest`) could adopt the same "wired output, falls back to text" shape; only these two have been
converted so far.

**Two deliberate exceptions**, both genuinely not callback-shaped and out of scope for the reason given:
`Ess.Easy.Cinematic.shot` (sugar for building one entry of a `steps` list you're already hand-typing — see
`nodes-cinematic.js`) and `Contract`/`Sandbox`'s `opts` tables (nil-safe with no callback inside — see
`nodes-missions.js`).

## Native tier — bare engine calls, straight from the wiki

**193 more nodes**, a second category entirely: these skip `Ess` altogether and emit BARE engine calls —
`Object.SetName(...)`, `Marker.AddDisc(...)`, `Camera.SetPitch(...)` — sourced from
[merc2-tools-wiki](https://wiki.mercs2.tools)'s reverse-engineered namespace reference docs (`pairs()`-
enumerated + decompiled-corpus-cross-referenced, not from Ess's own source), for real engine capability Ess
doesn't wrap at all yet: animation, winch/cargo, object attachment, vehicle doors/turrets/hijacking, raw
markers (custom colors/blips/tripwires beyond Ess.Mark's canned zone/enemy/objective), HUD fanfares/
message-box/radar/resource-counter, the dynamic music system, player costumes/disguise/satellite-scan/PDA
map mode, and a handful of Camera/Relations primitives Ess's own wrappers don't expose directly.

**Visually and mechanically distinct from every Ess node on purpose**, so a graph never quietly mixes
"goes through Ess's safety net" with "doesn't" without it being obvious at a glance:
- **Color** — a distinct warm shade per Native namespace (see "Node colors" below), not one shared brown
  across all 193 nodes.
- **Type namespace** — registers as `"native/<namespace>/<name>"`, never `"ess/*"`, and the left sidebar
  groups them under a separate "Native: X" category per namespace rather than merging into Ess's same-named
  category (`palette.js` derives this from the type string's own first segment).
- **`CodeGen.emitNative(line)`** instead of `CodeGen.emit(line)` for every native action node — auto-wraps
  the call in `pcall(function() ... end)`, since these calls skip Ess's own pervasive pcall-guarding
  entirely. (The wiki's own live-probe notes found most of these engine namespaces fail safe on bad
  arguments already — return `nil`, not a thrown error — so this is defense in depth, not a response to a
  specific confirmed crash.)

| File | Covers |
|---|---|
| `src/nodes-native-object.js` | `Object.*` (49 — position/transform, health, physics, **animation**, **winch & cargo**, **attachment**, labels/metadata, visibility/state, lifecycle) |
| `src/nodes-native-vehicle-human.js` | `Vehicle.*` (29 — seats/riders, **doors & turrets**, **hijacking**, state/physics) and `Human.*` (16 — weapons/inventory, actions/animation, state, misc) |
| `src/nodes-native-player-marker-camera.js` | `Player.*` (41 — **costumes & disguise**, **satellite scan**, **PDA map mode**, boundaries, input/control, misc), `Marker.*` (12 — the raw `Add`/`Add3D`/`AddBlip`/`AddDisc`/`AddTripwire` family plus `Pulse`/`Remove`/setters), `Camera.*` (6 — `SetShot`, pitch, `StopBlending`, raw FOV) |
| `src/nodes-native-hud-sound.js` | `Hud.*` (15 — MessageBox, the Fanfare family, Radar, ObjectiveTray, ResourceCounter) and `Sound.*` (25 — the Dynamic Music System, category fades/pitch, reverb) |

Every candidate was checked against the wiki's own per-function confidence notes ("Confirmed in real
scripts", "Live-confirmed via WebSocket lua-bridge probe", or "no call sites found — unconfirmed") — a node
only exists here if its argument shape is real, not guessed from the function name; anything the wiki
itself flags as a bare, unclear `(...)` signature was left out, and unconfirmed-but-simple ones say so
plainly in their `.desc`. All five `Marker.Add*` functions return a HANDLE, which now IS captured (see
"Branching, captured values, and Flow Control" above) — each exposes a `handle` output via
`CodeGen.emitNativeCapture`, wire it into Marker Remove/Pulse/etc. downstream instead of only ever placing
a marker you have no way to clean up or modify again in the same script. Two more native calls got the same
treatment: `Object: Attach` exposes the new attachment `guid`, and `Hud: MessageBox: Add Message` exposes
the `msgIds` table real scripts reuse to modify/remove the message later.

## Node colors

Every node's title-bar and body color is assigned centrally, in `palette.js`'s `colorize()` step (right
after the stock-litegraph trim, before the sidebar is built) — see that file's header for the mechanism:
`node.constructor.color`, litegraph's own fallback for a node that doesn't set its own instance `.color`.
Rather than one color per raw category (36 of them — Ess's ~19 namespace segments, Native's 8, Flow
Control), which would be more visual noise than signal at node-title-bar size, categories are grouped into
**16 colors**: 7 cool-toned super-groups across the Ess tier (world & spawn, player & human, vehicle,
encounter & AI, missions, presentation, utility), one warm-toned shade per Native sub-category
(object/vehicle/human/player/marker/camera/hud/sound — object keeps its original brown), and one teal
accent for Flow Control. `On Key Press` is the one exception, keeping its own distinct green set directly
on the instance — a one-off entry-point marker, not a category.

**Grand total: 393 static node types** (183 Ess + 193 Native + 17 Flow Control), plus one dynamically-
generated Call node per function you define (see "Function blocks" above).

## What's deliberately not here yet

- **Only one compile target** (an OnKey script). An OnLoad target and an "HTML tool button" target were
  both discussed as natural next steps — same node library, different compiler backends (OnKey-style
  toggle state needs `Ess.State`, an HTML button's toggle state is just a JS variable, and anything reading
  live game data from a browser is async in a way nothing in-game ever is).
- **No real topological sort for data-node-to-data-node chains.** `compiler.js`'s pre-pass runs every data
  node once, in whatever order `graph._nodes` returns (creation order, not dependency order) -- so
  Flow Control's Compare/And/Or/arithmetic nodes chained into each other work whenever the upstream one
  happens to land earlier in that list, but aren't guaranteed by construction. Keep chains shallow until
  this gets a real topological sort.
- **List/table-shaped parameters are raw text widgets, not a real list-building UI.** A "guids" or "spawns"
  parameter is a string widget whose text IS a Lua table literal, spliced in unquoted — you type
  `{ Ess.Guid('some_unit') }` by hand rather than building it from connected nodes. Consistent with the
  "data is Lua source text" model, but a real list-builder node (append/remove entries visually) would be
  a nicer next step than hand-typing table syntax.

## Credit

`lib/litegraph.js` / `lib/litegraph.css` are vendored, unmodified, from
[jagenjo/litegraph.js](https://github.com/jagenjo/litegraph.js) (MIT). `lib/tokens.css` and
`lib/bridge-client.js` are vendored from this ecosystem's own
[mercs2-tools-shared](https://github.com/loganw234/mercs2-tools-shared).

## License

[MIT](LICENSE) for everything in this repo other than the vendored `lib/litegraph.*` (also MIT, upstream
license applies).
