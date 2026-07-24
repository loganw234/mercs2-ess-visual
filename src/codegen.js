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
  var lines = [];

  function reset() { lines = []; }

  function emit(line) { lines.push(line); }

  // Turn arbitrary widget text into a Lua single-quoted string literal. Never string-concatenate user
  // text straight into generated code -- an apostrophe in a template name or message would otherwise
  // silently corrupt the generated chunk (same rule as mercs2-webtool-template's luaStringLiteral).
  function luaString(s) {
    return "'" + String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
  }

  // Resolve a node's input slot: whatever's wired in, else its property value formatted for Lua.
  // For NUMBER-typed properties the raw value is used as-is (a Lua expression or a number); for anything
  // else it's treated as a string literal. This mirrors litegraph's own "connected wire overrides widget"
  // convention (getInputData returns undefined when nothing's wired).
  function resolveNumberInput(node, slotIndex, propName) {
    var wired = node.getInputData(slotIndex);
    if (wired !== undefined && wired !== null && wired !== "") return wired;
    return node.properties[propName];
  }

  function getLines() { return lines.slice(); }

  return { reset: reset, emit: emit, luaString: luaString, resolveNumberInput: resolveNumberInput, getLines: getLines };
})();
