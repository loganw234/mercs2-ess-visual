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
fixed value — one of 5 boilerplate starting points under **Load a boilerplate sample** (`src/samples.js`).
Hit **Compile** to see the generated Lua, **Download .lua** to save it, or **Connect** (lua-bridge on the
running game) and hit **Run in game** to send the compiled script straight over and watch the exec chain
light up on canvas as it goes (`src/bridge.js` / `src/runviz.js`).

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

**Captured values** — some real Ess/native calls return something worth keeping: `Ess.Object.spawnAhead`/
`.spawn`'s guid, `Marker.Add*`'s handle. `CodeGen.newLocal(prefix)` mints a fresh unique Lua local name
("spawn1", "spawn2", ..., one counter per prefix) and `emitCapture`/`emitNativeCapture` emit `local <name> =
<expr>` (the native variant also pcall-wraps and normalizes a failed call's result to `nil`, matching every
guid-returning Ess function's own convention, rather than leaving the local holding pcall's raw error
string on failure). The capturing node then does `this.setOutputData(slot, name)`, so the bare variable
name splices into any downstream consumer exactly like any other raw-Lua-expression data wire — **Spawn
Ahead**, **Object: Spawn**, and all five **Marker Add\*** natives now expose their return value this way;
wire a spawn's `guid` output straight into Mark Enemy/AI Orders/Camera Watch instead of only ever spawning
things you have no way to reference again in the same script. `Flow: Set Local` generalizes this to ANY raw
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
from a combo), `And`/`Or`/`Not`, `Add`/`Subtract`/`Multiply`/`Divide`, `Set Local`, and `Log`
(`Ess.Log(tostring(msg))`, for checking a captured value or confirming a branch took the path you expected).
All the comparison/boolean/arithmetic nodes are pure-data, same "emit an expression, never a computed
value" model as Random Number — chaining one into another (e.g. two `Compare`s into one `And`) works
whenever the upstream node happens to execute first in the pre-pass, but isn't guaranteed by construction
(see "What's deliberately not here yet" below) — keep chains shallow until that gets a real topological
sort.

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
ten namespace-grouped files added across three later passes, **164 nodes total** — every `Ess.Easy.*`
function has a node (two narrow, documented exceptions below), plus a wide slice of the **Core** tier
(the direct `Ess.*` namespaces, not just their `Easy` wrappers) for the namespaces modders touch most:

| File | Covers |
|---|---|
| `src/nodes-world.js` | `Easy.Vehicle`, `Easy.Spawn`, `Easy.World`, `Easy.Fun` |
| `src/nodes-player.js` | `Easy.Player`, `Easy.Human`, `Easy.Debug`, plus Core `Player.camera`/`.targetUnderReticle`/`.inVehicle`/`.onFoot`/`.giveFuel`/`.removeBoundaries`/`.setInputEnabled`/`.rumble`/`.teleport` |
| `src/nodes-markers-camera.js` | `Easy.Mark`, `Easy.Camera`, `Easy.Sound`, `Easy.Confirm`, plus Core `Camera.fov`/`.restoreFov`/`.panicRevert` |
| `src/nodes-encounter.js` | `Easy.AIOrders`, `Easy.Relations`, `Easy.Airstrike`, plus Core `Relations.setFeeling`/`.getFeeling`/`.set-`/`.getPerceivability` |
| `src/nodes-missions.js` | `Easy.Objective`, `Easy.Quest`, `Easy.Contract`, `Easy.Sandbox` |
| `src/nodes-cinematic.js` | `Easy.Cinematic.play` (declarative cutscene timelines) |
| `src/nodes-utility.js` | `Easy.Console`, `Easy.Impulse`, `Easy.Menu` (`ess/ui/menu`), `Easy.Time`, `Easy.Triggers`, plus Core `Loop.start`/`.stop` |
| `src/nodes-object.js` | Core `Ess.Object.*` (34 nodes — health/life, transform, physics, visibility/labels, spawn) |
| `src/nodes-human-vehicle.js` | Core `Ess.Human.*` (14) and `Ess.Vehicle.*` (11) |
| `src/nodes-hud-sound.js` | Core `Ess.Hud.*` and `Ess.Sound.*` |

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
`onDone`/`onFail`/`onComplete` across `Objective`/`Quest`) are modeled as raw Lua-source **text** properties
— the same "data is Lua source text" convention table/list params already use (see `codegen.js`'s header) —
rather than visually-wired exec branches. An earlier version of `Confirm` tried the opposite: two EVENT
outputs that both fired immediately at compile time, which produced Lua where the real callback was an
empty no-op while anything wired after the output ran unconditionally at call time, not when the callback
actually fired. Text is less visual, but it compiles to exactly what it shows; wiring real visual nodes
*inside* a callback would need the compiler to support nesting emitted code inside a generated closure — a
real, separate piece of work, not a template tweak.

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
- **Color** — every native node sets `this.color = CodeGen.NATIVE_COLOR; this.bgcolor =
  CodeGen.NATIVE_BGCOLOR;` in its constructor (a dark amber/brown, vs. Ess nodes' default litegraph
  styling), the same mechanism `OnKeyPress` already used for its own distinct green.
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
a marker you have no way to clean up or modify again in the same script.

**Grand total: 368 nodes** (164 Ess + 193 Native + 11 Flow Control).

## What's deliberately not here yet

- **Only one compile target** (an OnKey script). An OnLoad target and an "HTML tool button" target were
  both discussed as natural next steps — same node library, different compiler backends (OnKey-style
  toggle state needs `Ess.State`, an HTML button's toggle state is just a JS variable, and anything reading
  live game data from a browser is async in a way nothing in-game ever is).
- **No save/load for a custom graph.** The 5 boilerplate samples (`src/samples.js`) are rebuilt in code
  every time you load one; there's no project-file persistence for a graph you've built/modified yourself.
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
