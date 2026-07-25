/* codegen.js -- the shared "compile buffer" every action node writes a line of Lua into, plus the one
 * helper every node needs: turning arbitrary widget text into a safe Lua string literal.
 *
 * IMPORTANT MODEL NOTE: nothing in this graph ever computes a real runtime value. A data node like
 * RandomNumber doesn't produce a number -- it produces the LUA SOURCE TEXT "math.random(1, 10)". Every
 * wire in this graph, data or event, carries either control flow (event/action slots) or a fragment of
 * generated Lua (data slots). "Running" the graph (CodeGen.compile, in compiler.js) never executes
 * anything for real -- it walks the graph once and assembles a string. This is why data nodes are safe to
 * pre-execute once regardless of order: their "value" is just a deterministic string template, not
 * something that changes between calls.
 */
window.CodeGen = (function () {
  // ---- buffer: a STACK of line-arrays, not one flat array -------------------------------------------------
  // emit()/emitNative() always write to the CURRENT (top) scope. Plain action chains never push/pop, so for
  // every node file written before this existed, nothing changes -- one implicit root scope, same flat
  // output as always. pushScope()/popScope() exist for a node that needs to capture a SELF-CONTAINED
  // sub-chain's lines separately from what comes before/after it, to wrap them in something (Branch/If's
  // if-then-else being the motivating case -- see nodes-flow.js) instead of splicing them flatly into the
  // parent sequence. Indentation tracks scope depth automatically so a nested if-block actually reads like
  // one once downloaded, instead of every line sitting flush-left regardless of nesting.
  var stack = [[]];

  function indent() { return new Array(stack.length).join("  "); }

  function pushScope() { stack.push([]); }

  // Pops the current scope and returns its captured lines (already indented one level deeper than whatever
  // is now the top scope) -- the caller re-inserts them verbatim via emitLines, not emit() (emit() would
  // indent them AGAIN on top of the indentation they already carry).
  function popScope() { return stack.pop(); }

  function emitLines(linesArr) {
    var top = stack[stack.length - 1];
    linesArr.forEach(function (l) { top.push(l); });
  }

  // ---- captured values ---------------------------------------------------------------------------------
  // Some real Ess/native calls return something worth keeping around -- Ess.Object.spawnAhead's guid,
  // Marker.Add's handle. newLocal(prefix) mints a fresh, guaranteed-unique Lua local variable name
  // ("spawn1", "spawn2", ... -- one counter per prefix, so different capturing nodes don't collide or
  // force one shared global counter); emitCapture(name, expr) emits "local <name> = <expr>". The capturing
  // node then does `this.setOutputData(slot, name)` so its data output carries the bare variable name --
  // spliced unquoted into whatever consumes it downstream, exactly like any other raw-Lua-expression data
  // wire in this repo (see codegen.js's own header note below on why that's always been the model here).
  //
  // ORDERING CAVEAT, worth knowing before wiring one of these: the local only exists from the moment its
  // own action node actually executes in the compiled script, so its output is only meaningful when
  // consumed by ANOTHER ACTION node further down the SAME exec chain (onAction fires in real execution
  // order). Wiring a captured value into a pure-data node's input would read stale/undefined data, since
  // every pure-data node's onExecute runs once in compiler.js's pre-pass, before any trigger -- and
  // therefore before this node's own onAction has run. Every consumer of a raw guid/expression input in
  // this repo is itself an action node today, so this hasn't been an issue in practice; just don't be the
  // first node file to wire a captured value into a pure-data node's input without accounting for it.
  var localCounters = {};

  function newLocal(prefix) {
    prefix = (prefix && String(prefix).trim()) || "v";
    localCounters[prefix] = (localCounters[prefix] || 0) + 1;
    return "__" + prefix + localCounters[prefix];
  }

  function emitCapture(varName, expr) { emit("local " + varName + " = " + expr); }

  // ---- Native tier -----------------------------------------------------------------------------------
  // Everything above this point is for Ess.* nodes (Ess's own pcall-guarded, "fails safe" wrappers).
  // "Native" nodes (nodes-native-*.js) instead emit BARE engine calls -- Object.SetPosition, Camera.Shake,
  // Marker.Add, and so on -- straight from the wiki's namespace reference docs, not through Ess at all.
  // These exist for capability Ess doesn't wrap yet (animation, winch/cargo, attachment, raw markers,
  // vehicle doors/turrets, ...). What distinguishes them from every Ess node in this repo:
  // emitNative(line) below wraps the call in `pcall(function() ... end)` -- Ess itself pcalls nearly
  // everything as a blanket defensive habit (see e.g. src/11_object.lua), and native nodes match that
  // even though the wiki's own live-probe notes found these engine namespaces mostly fail SAFE on bad
  // args (return nil, not a thrown error) -- pcall is defense in depth against the cases that aren't
  // confirmed safe, not a response to a specific known crash. (Their distinct on-canvas color used to be
  // set here too, via NATIVE_COLOR/NATIVE_BGCOLOR constants each native node's constructor read from --
  // that's now centralized in palette.js's colorize() instead, see its header comment.)

  function emitNative(line) { emit("pcall(function() " + line + " end)"); }

  // emitNativeCapture(varName, expr) -- for a native call worth keeping the return value of (Marker.Add's
  // handle, mainly): pcall itself returns (ok, result) on success or (false, errorString) on failure, so
  // capturing straight into varName via naive `local _, varName = pcall(...)` would leave varName holding
  // the ERROR STRING on failure, not nil -- a real footgun for downstream code that assumes any non-nil
  // "handle" is real. The extra `if not ok then varName = nil end` line closes that gap, matching every
  // guid-returning Ess function's own "nil on failure" convention, so a failed native capture behaves the
  // same way a failed Ess call already would.
  function emitNativeCapture(varName, expr) {
    var okVar = newLocal("ok");
    emit("local " + okVar + ", " + varName + " = pcall(function() return " + expr + " end)");
    emit("if not " + okVar + " then " + varName + " = nil end");
  }

  function reset() { stack = [[]]; localCounters = {}; }

  function emit(line) { stack[stack.length - 1].push(indent() + line); }

  // Turn arbitrary widget text into a Lua single-quoted string literal. Never string-concatenate user
  // text straight into generated code -- an apostrophe in a template name or message would otherwise
  // silently corrupt the generated chunk (same rule as mercs2-webtool-template's luaStringLiteral).
  //
  // \r is escaped alongside \n, not just \n: Lua's own lexer treats a bare CR as a newline exactly like LF
  // (llex.c's currIsNewline checks for both), so a Windows-newline paste into any widget -- where \n got
  // escaped but the \r in front of it didn't -- ended the literal early and failed the whole chunk with
  // "unfinished string". Escaping only one half of a CRLF pair is worse than escaping neither.
  function luaString(s) {
    return "'" + String(s == null ? "" : s)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n") + "'";
  }

  // Resolve a node's input slot: whatever's wired into it, else the node's own property value. Mirrors
  // litegraph's "a connected wire overrides the widget" convention -- getInputData returns undefined when
  // nothing's connected, and an unwritten link reads null (compile() clears them all before each run).
  //
  // The result is spliced UNQUOTED wherever it's used -- it's Lua source text either way, whether that's a
  // number, an expression, a guid, or a table literal (see this file's header on the "data is Lua source
  // text" model). If a value needs to end up as a Lua STRING, its node calls luaString on it explicitly;
  // this helper never quotes anything.
  //
  // NAMING: `resolveNumberInput` is the original name from when only Random Number -> Spawn Ahead's
  // distance existed, and roughly 600 call sites still use it, so it stays as an alias rather than
  // churning every node file. It never had any number-specific behavior -- an earlier version of this
  // comment claimed it treated non-number properties as string literals, which the code has never done.
  // `resolveInput` is the name to use in new code. Nine node files each carried a byte-identical private
  // copy of this function called `resolveRawInput` -- an artifact of that misleading name -- and now just
  // bind their local name straight to this one.
  function resolveInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  // Parse a comma-separated declaration list ("targetGuid, amount") into trimmed, non-empty names. Used by
  // Function Start/Return's params/returns widgets (nodes-function.js), the dynamically-generated Call node
  // types built from them (nodes-function-calls.js), and compile()'s returns-mismatch guardrail
  // (compiler.js) -- all three parse the SAME user-typed text, and all three had their own identical copy.
  // Three copies of one splitter is three chances for them to disagree about what an empty entry means,
  // which is exactly the sort of drift that turns into a wrong-shaped function signature.
  function splitNames(text) {
    return String(text || "").split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
  }

  // The root scope -- by the time compile() calls this, every pushScope() a node made during the trigger
  // walk should already be balanced by a matching popScope() (see nodes-flow.js's Branch), leaving exactly
  // one scope: this one.
  function getLines() { return stack[0].slice(); }

  return {
    reset: reset, emit: emit, luaString: luaString, getLines: getLines,
    resolveInput: resolveInput, resolveNumberInput: resolveInput,   // same function, see resolveInput's comment
    splitNames: splitNames,
    emitNative: emitNative, emitNativeCapture: emitNativeCapture,
    pushScope: pushScope, popScope: popScope, emitLines: emitLines, newLocal: newLocal, emitCapture: emitCapture
  };
})();
