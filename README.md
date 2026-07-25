# mercs2-ess-visual

A node-graph editor for scripting Mercenaries 2 Ess mods visually — wire up a trigger and a sequence of
actions, hit Compile, get a real `scripts/OnKey/*.lua` file out. Built on
[litegraph.js](https://github.com/jagenjo/litegraph.js) — the same engine ComfyUI's own node canvas runs
on, vendored here (MIT) rather than pulled in as a live dependency.

**Status: draft / proof of concept.** Small on purpose — see [What's not here yet](#whats-not-here-yet)
before extending it.

## Quick start

Live at **[visual.mercs2.tools](https://visual.mercs2.tools)**. To run it locally: no build step, no
dependencies — `python -m http.server` in this folder, or just open `index.html` directly in a browser.

1. **Pick a starting point.** The tool opens on **Spawn & Control** — spawn a car ahead, capture its guid,
   face it at you, heal it, log where it landed, clean it up. Nine more under **Load a boilerplate sample**
   (top right), each adapted from a real script in
   [mercs2-lua-essentials](https://github.com/loganw234/mercs2-lua-essentials)'s own `samples/`.
2. **Edit it.** Click a node in the left sidebar to drop it on the canvas, or double-click empty canvas to
   search all 411 of them by name. Drag from a node's dot to wire it.
3. **Set your hotkey** on the **On Key Press** node — the bright green one, where every script starts.
4. **Hit Compile.** The generated Lua appears on the right. The status line under the buttons tells you how
   many lines came out, and warns you about any node that isn't connected to a trigger (those compile to
   nothing).
5. **Name it and hit Download .lua.**
6. **Install it**: drop the `.lua` in your game folder's `scripts/OnKey/`, load a save, press the key.

Or skip step 6 entirely: with the game running and
[lua-bridge](https://github.com/loganw234/mercs2-qol-mods) listening, hit **Connect** then **Run in game**
to send the compiled script straight over and watch the exec chain light up on canvas as it fires.

## Working with a graph

| | |
|---|---|
| **Fit to View** | Frames the whole graph on screen. Shortcut: `F`. Runs automatically on load and whenever you switch samples. |
| **Save / Load Graph** | Round-trips the whole graph as a portable `.json` file. |
| **Autosave** | Saves to this browser as you work, and picks up where you left off next time — no prompt, no lost work. A banner offers a sample instead, and can hand your graph back if you take it. |
| **Undo / Redo** | `Ctrl+Z` / `Ctrl+Y`, or the toolbar buttons. Up to 50 steps. |
| **Copy / Paste / Select All / Delete** | `Ctrl+C` / `Ctrl+V` / `Ctrl+A` / `Del` — litegraph's own, and paste-then-nudge is how you duplicate a node. |
| **New Group** | Select some nodes, click it, give it a title: a labelled, colored box around exactly what you selected. Right-click a group → **Edit Group** to rename, recolor or resize it afterward. |

## What's in the box

**411 node types**, in three tiers:

- **Ess (201)** — one node per real `Ess.*` call. Every `Ess.Easy.*` function has one, plus a wide slice of
  the Core tier for the namespaces modders touch most: Object, Human, Vehicle, Player, Camera, Markers,
  Relations, AI Orders, Followers, Squad, Hud, Sound, Missions, Cinematic, Loop, Keys, Triggers.
- **Native (193)** — bare engine calls (`Object.SetName`, `Marker.AddDisc`, `Camera.SetPitch`) for
  capability Ess doesn't wrap yet: animation, winch/cargo, attachment, vehicle doors/turrets/hijacking, raw
  markers, HUD fanfares, the dynamic music system, player costumes/disguise/satellite-scan. Colored warm and
  bucketed under their own "Native: X" sidebar categories so a graph never quietly mixes "goes through
  Ess's safety net" with "doesn't".
- **Flow Control (17)** — `Branch (If)`, `Compare`/`And`/`Or`/`Not`, arithmetic, `Set Local`, `Log`,
  `Custom Code`, and the **Function Start / Function Return / Call** trio for reusable, parameterized
  functions compiled into real `local function name(...) end` blocks.

Plus one dynamically-generated **Call: name** node per function you define.

### The boilerplate samples

| Sample | Adapted from | Demonstrates |
|---|---|---|
| Spawn & Control | `recipes/spawn_and_control.lua` | the foundational spawn → capture guid → act pattern, with the guid **wired** into both consumers |
| Command a Squad | `recipes/command_a_squad.lua` | a captured **guid list** feeding straight into `AI Orders: Attack`, no per-unit bookkeeping |
| Mark & Notify | `recipes/mark_things.lua` + `notify_the_player.lua` | two captured Mark handles and all four HUD notification styles |
| Direct the Camera | `recipes/direct_the_camera.lua` | capturing a **closure** (Camera: Orbit's `stop`) and calling it later from Custom Code |
| Command a Helicopter | `recipes/command_a_helicopter.lua` | the "(Full)" crewed-template and `Vehicle: Fly To` gotchas baked in |
| A Quick Mission | `recipes/a_quick_mission.lua` | `Quest: Create`'s typed steps table — an auto reach-marker step then a manual one |
| Call In Support | `recipes/call_in_support.lua` | the airstrike beat of Ess's support call-in system |
| World Tweaks | `recipes/world_tweaks.lua` | a fully node-based delayed cleanup |
| Timers & Loop | `recipes/do_it_later.lua` | `Trigger: After` vs. `Loop: Start` side by side |
| Trailer Hitch | `demos/TrailerHitch.lua` | the one **Native**-tier sample — two spawns, two captured guids, welded together with `Object.Attach` |

Every sample compiles to runnable Lua with no edits first, and each one's Ess calls, parameter shapes and
cleanup timing are the real recipe's, translated node-for-node wherever node coverage allows. Where a value
has a real pin, the samples **wire** it rather than typing a capture name — the point of a node graph. The
few places that still name a `__spawn1` in text are the ones with no pin to wire into: a `Custom Code`
block, or a `Trigger: After`'s deferred `fn`.

## Adding your own node

Every node follows the same three-part shape:

```js
function MyAction() {
  this.addInput("exec", LiteGraph.ACTION);      // chain in
  this.addOutput("then", LiteGraph.EVENT);      // chain out
  this.addInput("someValue", "number");         // a value slot -- widget by default, wire overrides it
  this.addProperty("someValue", 10);
  this.addWidget("number", "someValue", 10, function (v) { this.properties.someValue = v; }.bind(this));
}
MyAction.prototype.onAction = function () {
  var v = CodeGen.resolveInput(this, 1, "someValue");   // input 1, NOT 0 -- "exec" already took slot 0
  CodeGen.emit("Ess.Whatever.doThing(" + v + ")");
  this.triggerSlot(0);
};
LiteGraph.registerNodeType("ess/myaction", MyAction);
```

**The one bug worth knowing about in advance**: input slot indices are shared across every `addInput` call
on a node, in call order — if `"exec"` is added first, it's slot 0, and your next `addInput` is slot 1, not
0. `resolveInput`'s second argument is that slot index; get it wrong and the node silently falls back to
its widget default instead of reading a connected wire, with no error anywhere. Always compile and read the
output.

A pure-data node (no exec pins at all, like `Random Number`) just needs `onExecute` calling
`this.setOutputData(slot, "<lua expression text>")` — no `onAction`/`triggerSlot` involved.

**Never string-concatenate user text into a Lua string literal** — use `CodeGen.luaString(s)`. And check
the real function signature before you write the node: the decompiled game source first, then Ess's own
`src/*.lua`, then the wiki. See [DESIGN.md](DESIGN.md#where-node-signatures-come-from) for why that order.

`.claude/skills/ess-graph-build/SKILL.md` documents the workflow for building a large graph
programmatically rather than clicking it together, including the verification sweep to run before shipping
one.

## What's not here yet

- **Only one compile target** (an OnKey script). An OnLoad target and an "HTML tool button" target are both
  natural next steps — same node library, different compiler backends.
- **No real topological sort for data-node-to-data-node chains.** `compiler.js`'s pre-pass runs every data
  node once, in whatever order `graph._nodes` returns (creation order, not dependency order) — so chaining
  Flow Control's Compare/And/Or/arithmetic nodes into each other works whenever the upstream one happens to
  land earlier in that list, but isn't guaranteed. Keep those chains shallow.
- **List/table-shaped parameters are raw text widgets, not a real list-building UI.** A "guids" or "spawns"
  parameter is a string widget whose text IS a Lua table literal — you type `{ Ess.Guid('some_unit') }` by
  hand. `Combine List (4)` covers the fixed-four case; a real variable-arity list-builder would be nicer.
- **An already-placed Call node doesn't resize when you edit its function's signature.** Delete and re-drop
  it. See [DESIGN.md](DESIGN.md#function-blocks).

## Design notes

[DESIGN.md](DESIGN.md) covers the reasoning: the two-kinds-of-wire model and why neither carries a real
value, how branching and captured values compile, why function blocks live on the same canvas instead of in
litegraph's own Subgraph system, the compiler's guardrails, the two monkey-patches to litegraph and the
bugs that motivated them, and where node signatures are sourced from.

## Credit

`lib/litegraph.js` / `lib/litegraph.css` are vendored, unmodified, from
[jagenjo/litegraph.js](https://github.com/jagenjo/litegraph.js) (MIT). `lib/tokens.css` and
`lib/bridge-client.js` are vendored from this ecosystem's own
[mercs2-tools-shared](https://github.com/loganw234/mercs2-tools-shared).

## License

[MIT](LICENSE) for everything in this repo other than the vendored `lib/litegraph.*` (also MIT, upstream
license applies).
