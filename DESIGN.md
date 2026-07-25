# Design notes

Why this tool is shaped the way it is. [README.md](README.md) covers what it does and how to use it; this
file is the reasoning behind the parts that aren't obvious from the code, and it's the thing to read before
extending any of them.

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
params (a guid list, a spawn table) in the newer node files — see their own header comments.

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
expose a captured return value this way — Spawn Ahead, Object: Spawn, every `Easy.Spawn.*` and
`Vehicle: Summon`, Mark Enemy/Objective/Zone, Camera Watch/Orbit, every Trigger's arm, every
Objective/Quest/Contract/Sandbox starter, Cinematic: Play, Object: Damage/Snap To Ground, Vehicle: Fly
To/Orbit Flight, all five **Marker Add\*** natives, Object: Attach, and HUD MessageBox: Add Message — wire a
spawn's `guid` output straight into Mark Enemy/AI Orders/Camera Watch instead of only ever spawning things
you have no way to reference again in the same script. Two of those calls genuinely return MORE than one
value (Lua's native multi-return, not a single expression) and get a hand-written capture instead of the
standard helper, each documented at its own call site: **Vehicle: Enter Seat Excluding** exposes `ok` and
`seatUsed` as two separate outputs, and **Object: Attach** (native) discards the redundant `bResult` pcall
already gives you and exposes only the useful `guid`.

`Flow: Set Local` generalizes capture to ANY raw expression, not just a return value — useful both for
readability and for a real correctness gotcha: wiring one data node's output into TWO different consumers
without Set Local in between means each consumer splices the SAME expression text independently, so
`Random Number` wired to two places gives two *different* rolls at runtime despite looking like "one value,
used twice" — routing it through Set Local evaluates it once and both consumers read the identical captured
local.

**The ordering caveat**: a captured value's local only exists from the moment its own action node executes,
so it's only safe to consume from another ACTION node further down the same exec chain — see `codegen.js`'s
header for why a pure-data node consumer would read stale data.

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
(see README's "What's deliberately not here yet") — keep chains shallow until that gets a real topological
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
next step than this.

## Function blocks

Reusable, parameterized functions — the piece that turns "a sequence of one-liners" into something closer
to a real program. Two static node types (`src/nodes-function.js`) plus one dynamically-generated node
type per function you actually define (`src/nodes-function-calls.js`).

**Function Start** marks a function's entry point — name it, list its `params` and its `returns` (both
comma-separated text, e.g. `targetGuid, amount`). Its param names become real output pins, each carrying
its own literal name as Lua text (referencing `targetGuid` inside the function body IS the real bound
local, once compiled — like every other data wire here, it's never a computed value). Its `returns`
declaration is the single source of truth for what a **Function Return** node inside this function is
allowed to return, and what a **Call: name** node's output pins look like elsewhere in the graph.

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
signature. A real, documented limitation, not a bug.

Compiling gets a pass ahead of the main trigger walk: every Function Start's own chain compiles into
its own `local function name(params) ... end` block (the same `CodeGen.pushScope()`/`popScope()` mechanism
Branch already uses), assembled once regardless of how many Call nodes reference it — a Call node never
re-walks into the callee's own definition at compile time, it just emits a plain `name(args)` expression,
so a function calling itself (real Lua recursion) is completely safe here.

**Why inline, on the same canvas, rather than a separate mini-graph you switch into**: litegraph actually
ships its own general-purpose Subgraph system (`graph/subgraph`, `graph/input`, `graph/output`) that looks
like a shortcut here, but it's built for litegraph's own continuous dataflow execution (`graph.runStep()`)
— something this tool never uses at all, since everything here compiles once via `Compiler.compile()`'s own
one-shot walk instead. Adopting it would mean fighting a large subsystem built for a different execution
model. Building Function Start/Return/Call from scratch, living on the same graph the rest of the script
already does, reuses the exact single-graph compile pass already in place and needed no new
graph-switching UI.

## Compiler guardrails

Checks that run in `compile()` before anything is emitted, each of which fails the compile with a specific
message rather than silently producing something wrong:

- **One key per script.** A compiled script binds to exactly one key (`KEYVAL`, declared once for the OnKey
  loader), so multiple `On Key Press` nodes with *different* keys fail to compile. Previously the second
  trigger's chain ran on the *first* trigger's key, and the second key was never reachable at all.
- **Unique function names**, and **every reachable Function Return's `returns` must match its own Start's**.
- **A static cycle check** (white/gray/black DFS over the exec-link graph, same shape `runviz.js` already
  walks for its animation) catches an exec chain that loops back into itself before compiling recurses into
  it for real. In practice this is hard to construct through normal wiring at all — each node's exec input
  accepts exactly one incoming link, so closing a loop back onto an already-externally-reachable node just
  steals that connection instead of creating a real cycle — but it's a cheap, correct safety net.

Two things that are reported as **warnings**, not errors, because the compile genuinely did succeed:

- **Unreachable nodes.** Compiling only walks outward from a root (a trigger or a Function Start), so a node
  with nothing wired into its `exec` input contributes nothing to the output. This is the single easiest
  mistake to make in this tool and the hardest to spot — the compile still reports success for everything
  else — so `findUnreachable()` names them in the status line.
- **Data-wire staleness is prevented rather than reported**: litegraph caches a data slot's value on the
  LINK (`setOutputData` writes `link.data`, `getInputData` reads it back), and nothing clears it between
  compiles, so a link could hand a consumer a `__spawn1` from a previous compile that this one never
  declares. `compile()` wipes every link's cached data before walking anything.

## Persistence, history, and the two real bugs testing caught

**Save Graph / Load Graph** (`src/graphio.js`) round-trip the whole graph as a `.json` file, straight off
litegraph's own `graph.serialize()`/`configure()` — already a complete, well-formed snapshot, nothing custom
to invent.

**Undo/Redo** is a plain stack of serialized snapshots, not a diff system — simple, and a hand-built graph
serializes to a few KB, so keeping up to 50 full copies around costs nothing that matters. It's wired to
`graph.on_change`, not the `beforeChange`/`afterChange` pair litegraph's own source explicitly comments
"used for undo" — that pair turned out to only fire from a handful of litegraph's own interactive paths
(drag-end, its own paste flow); plain `graph.add()`, which is what the palette's click-to-add and every
programmatic graph build in this tool goes through, calls `this.change()` (→ `on_change`) instead, and far
more broadly. Recording is debounced 400ms so a drag in progress collapses into one undo step, not one per
frame.

**The two-pass restore, and the two real bugs this caught by actually testing it**, not just reading
the code:

1. This graph's node types aren't all static — a `flow/call/<name>` type only exists once
   `FunctionCalls.rescan(graph)` has seen that function's Function Start node, which itself only exists once
   the graph has been restored. A single `configure()` pass on a save containing a Call node hits that
   ordering gap and gets a dead placeholder node instead. `GraphIO.restoreGraph()` configures twice — once
   so Function Start nodes land for real and a rescan can see them, again now that every Call type the graph
   needs is registered — simpler than detecting which case applies and branching.
2. Function Start/Return's `onConfigure` originally called the SAME rebuild function the params/returns
   text widget uses — which works for a live edit, but on load it ran AFTER litegraph had already restored
   the correct wires, and silently destroyed every one of them (removeInput/addOutput replace a slot
   outright, with no attempt to preserve what was connected). A Save → Load round trip on any graph with a
   function looked fine right up until you compiled it and got `nil` where a real value used to be. Fixed by
   having `onConfigure` only re-derive the plain-JS paramNames/returnNames cache from the (already-correct)
   restored properties, never touching the pins themselves.

## The two patches to litegraph

`lib/litegraph.js` is vendored **unmodified**, so it can be re-vendored from upstream without a diff.
Everything this tool needs to change about litegraph's behavior is a monkey-patch in our own file, loaded
right after it:

- **`src/widgetsync.js`** — `LGraphNode.configure()` copies restored data into `this.properties` correctly,
  but a widget has its OWN separate `.value` field (what's actually drawn), and configure()'s widget-sync
  step only updates that for a widget built with an `options.property` binding — which nothing across this
  codebase's node types uses; every widget here is wired with a plain manual callback. So after configure()
  ran, `.properties` was correct but every widget kept showing its construction-time value: the node LOOKED
  unconfigured even though it compiled correctly. This affects every path that recreates a node — Load
  Graph, undo/redo, autosave restore, and litegraph's own copy/paste — so one patch to the shared prototype
  fixes all of them at once. Matching a widget to a property by NAME is a heuristic: a handful of nodes give
  a widget a friendlier label than its raw property key (e.g. Impulse's "uGuid (nil = auto)") and won't be
  caught.
- **`src/nodesize.js`** — litegraph draws each widget's label left-aligned and its value right-aligned in
  the same box and never checks whether they fit, while node widths come from `computeSize`, which ignores
  widget values entirely. A text widget's value is clamped to 30 *characters*, with no idea how wide the
  node is. Since `Ess.Player.character(0)` is the standing default for every guid input across the library,
  a large fraction of the node set rendered as label-over-value garbage the moment it was dropped. This
  patch measures the real rendered text with litegraph's own widget font and widens the node at creation
  time (never shrinks it, never fights a size you set by hand, capped so a node holding a whole Lua function
  literal doesn't demand a canvas-wide box).

## Node colors

Every node's title-bar and body color is assigned centrally, in `palette.js`'s `colorize()` step (right
after the stock-litegraph trim, before the sidebar is built) — see that file's header for the mechanism:
`node.constructor.color`, litegraph's own fallback for a node that doesn't set its own instance `.color`.
Rather than one color per raw category (36 of them — Ess's ~19 namespace segments, Native's 8, Flow
Control), which would be more visual noise than signal at node-title-bar size, categories are grouped into
**16 colors**: 7 cool-toned super-groups across the Ess tier (world & spawn, player & human, vehicle,
encounter & AI, missions, presentation, utility), one warm-toned shade per Native sub-category
(object/vehicle/human/player/marker/camera/hud/sound — object keeps its original brown), and one teal
accent for Flow Control.

`On Key Press` is the one exception, setting its own color directly on the instance — it's the script's
entry point and belongs to no category, so it gets a notably brighter, more saturated green than anything
in the 16 group colors, all of which sit in the same dark/desaturated band. (Its original one-off green was
three points per channel away from the World & Spawn group's, which made "distinct entry-point marker" true
in the source and invisible on canvas.)

## Where node signatures come from

Trust order, highest first, for anything a node emits:

1. **The decompiled game source** and the loader's own implementation — e.g. the valid `KEYVAL` key names
   are transcribed from `ResolveKeyName()` in the lua-bridge loader's C source, which is the code that
   actually turns that string into a key binding. Anything it doesn't recognize resolves to no binding at
   all, silently.
2. **Ess itself** (`mercs2-lua-essentials/src/*.lua`), which builds directly on that source — every
   `Ess.*` node's argument shape and return value is checked against the real function. Note that Ess and
   the loader genuinely disagree in places: the loader accepts `alt` as a key name, Ess's own `NAMES` table
   in `25_keys.lua` does not, so `On Key Press` and `Keys: On` offer deliberately different lists.
3. **The wiki** ([wiki.mercs2.tools](https://wiki.mercs2.tools)), for the Native tier — reverse-engineered
   and still being built, so it's the last resort rather than the first. Every Native candidate was checked
   against the wiki's own per-function confidence notes ("Confirmed in real scripts", "Live-confirmed via
   WebSocket lua-bridge probe", or "no call sites found — unconfirmed"); a node only exists if its argument
   shape is real, not guessed from the function name, anything flagged as a bare unclear `(...)` signature
   was left out, and unconfirmed-but-simple ones say so plainly in their `.desc`.

## Node coverage rationale

Within the Ess tier, coverage favors the namespaces a mod script actually reaches for
(Object/Human/Vehicle/Player/Camera/Relations/Hud/Sound/Loop) over generic infrastructure (`Ess.Table.*`,
`Ess.Safe.*`, `Ess.Override.*`, `Ess.Save*`, the raw `Ess.UI.*` builder API — none of these are "mod
actions," they're plumbing for other Lua code, so they stay out) and skips any getter whose real return is
genuinely multi-value with no single primary one (documented with a one-line skip comment at each call
site — e.g. `Object.pos`/`.velocity`/`.size`, `Player.pose`/`.viewYaw`, `Vehicle.followGhost`,
`Human.allWeapons`) — this node model is one Lua value per output slot; see `nodes-player.js`'s header for
the `targetUnderReticle`-style exception (a multi-return function whose own doc comment already establishes
a primary first value survives fine). (`Ess.Raw.*` itself — Ess's own thin pcall wrappers underneath
Easy/Core — isn't separately represented; the Native tier reaches past even that, straight to the bare
engine.)

**The Native tier is visually and mechanically distinct from every Ess node on purpose**, so a graph never
quietly mixes "goes through Ess's safety net" with "doesn't" without it being obvious at a glance: a
distinct warm color per namespace, a `"native/<namespace>/<name>"` type string that buckets into its own
"Native: X" sidebar category, and `CodeGen.emitNative(line)` instead of `CodeGen.emit(line)` — which
auto-wraps the call in `pcall(function() ... end)`, since these calls skip Ess's own pervasive pcall
guarding entirely. (The wiki's own live-probe notes found most of these engine namespaces fail safe on bad
arguments already — return `nil`, not a thrown error — so this is defense in depth, not a response to a
specific confirmed crash.)

**Callback parameters** (`Confirm`'s `onYes`/`onNo`, `Triggers.*`'s `fn`, `Menu`'s `entries` actions, every
`onDone`/`onFail`/`onComplete` across `Objective`/`Quest`) are modeled as raw Lua-source **text**
properties — the same "data is Lua source text" convention table/list params already use — rather than
visually-wired exec branches. An earlier version of `Confirm` tried the opposite: two EVENT outputs that
both fired immediately at compile time, which produced Lua where the real callback was an empty no-op while
anything wired after the output ran unconditionally at call time, not when the callback actually fired.

**`Keys: On` and `Loop: Start` are the two callback-shaped nodes that DO support a real wired chain**, via a
second EVENT output ("on press" / "on tick", alongside the usual "then") captured through the exact same
`CodeGen.pushScope()`/`popScope()` mechanism Branch's true/false already use: whatever's wired compiles into
its own isolated scope, and THAT gets wrapped in a real Lua closure at emit time instead of inlined
immediately. `Loop: Start`'s wrapped body gets one thing `Keys: On`'s doesn't: a `return true` appended
automatically after whatever's wired, since `Ess.Loop.start` stops the moment a tick returns anything falsy
and a wired chain has no natural return value of its own. Left unwired, both fall back to their raw-text
property for a quick one-liner. The other callback-shaped nodes above could adopt the same "wired output,
falls back to text" shape; only these two have been converted so far.

**Two deliberate exceptions**, both genuinely not callback-shaped and out of scope for the reason given:
`Ess.Easy.Cinematic.shot` (sugar for building one entry of a `steps` list you're already hand-typing — see
`nodes-cinematic.js`) and `Contract`/`Sandbox`'s `opts` tables (nil-safe with no callback inside — see
`nodes-missions.js`).

**"Visual compactor" nodes** collapse a multi-node chain this tool's own boilerplate graphs kept needing by
hand into one node, still spliced as plain Lua text like everything else here — not a new codegen mechanism,
just fewer nodes to wire for a common shape. Six so far: `Spawn Friendly Unit`, `Followers: Guard My
Position`, `Followers: Patrol Around Me`, `Squad: Add To Team`, and the team-scoped `Squad: Guard Team
Here`/`Patrol Team Around Me`.
