/* nodes-flow.js -- control-flow and value utility nodes: not wrappers around any single Ess/native call,
 * but the primitives that turn a flat sequence of one-liners into a real "semi-complex script" -- a
 * conditional, basic comparisons/boolean logic/arithmetic to feed one, a way to capture and reuse a value
 * once, and a debug log line.
 *
 * BRANCH is the one genuinely new piece of compiler machinery here (see codegen.js's pushScope/popScope/
 * emitLines header comment for the general mechanism) -- everything else in this file is a plain pure-data
 * node in the exact RandomNumber/PlayerCharacter shape (emits a Lua EXPRESSION as text, never a computed
 * value) or a plain action node in the exact nodes.js three-part shape. Registers under "flow/*", a third
 * type-namespace alongside "ess/*" and "native/*" (palette.js's trim step already keeps both of those;
 * this file's category label falls through its default "General"-per-file-title handling, no palette.js
 * change needed since flow/* nodes don't collide with any ess/*-or-native/*-prefixed type).
 */
(function () {
  "use strict";

  // ============================================================
  // Flow/Branch -- if <condition> then <true chain> else <false chain> end. `condition` is raw Lua
  // boolean-expression text (same "data is Lua source text" convention as everywhere else in this repo --
  // type it directly, or wire in one of the Compare/And/Or/Not nodes below, which emit exactly that).
  //
  // No third "then"/merge output, deliberately -- same shape as Unreal Blueprint's Branch node (the design
  // this whole tool takes its cue from, per the README): true and false are independent continuations, not
  // rejoining paths. If you want something to run either way, wire it from BOTH outputs.
  // ============================================================
  function Branch() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("true", LiteGraph.EVENT);
    this.addOutput("false", LiteGraph.EVENT);
    this.addInput("condition", "string");
    this.addProperty("condition", "true");
    this.addWidget("text", "condition", this.properties.condition, function (v) { this.properties.condition = v; }.bind(this));
  }
  Branch.title = "Branch (If)";
  Branch.desc = "if <condition> then <true> else <false> end -- condition is raw Lua boolean-expression text (type it, or wire in Compare/And/Or/Not)";
  Branch.prototype.onAction = function () {
    var condition = CodeGen.resolveNumberInput(this, 1, "condition");  // input 0 is "exec"
    CodeGen.pushScope();
    this.triggerSlot(0);                 // fires everything wired to "true", captured into the pushed scope
    var trueLines = CodeGen.popScope();

    CodeGen.pushScope();
    this.triggerSlot(1);                 // fires everything wired to "false"
    var falseLines = CodeGen.popScope();

    CodeGen.emit("if " + condition + " then");
    CodeGen.emitLines(trueLines);
    if (falseLines.length) {
      CodeGen.emit("else");
      CodeGen.emitLines(falseLines);
    }
    CodeGen.emit("end");
  };
  LiteGraph.registerNodeType("flow/branch", Branch);

  // ============================================================
  // Flow/SetLocal -- local <name> = <value>, once. Evaluates a raw expression (a guid, a captured spawn's
  // handle, a number, anything) a single time and exposes the resulting Lua local for reuse anywhere a
  // "data is Lua source text" input is expected. Two real reasons to reach for this instead of just wiring
  // the source node's output straight to every consumer:
  //   1. A source that's only meaningful once its own onAction has run (Spawn Ahead's guid output, or
  //      anything else built on CodeGen.newLocal/emitCapture) -- SetLocal re-captures it under a name of
  //      your choosing, useful mainly for readability in the downloaded .lua.
  //   2. A PURE-DATA node whose "value" is really a fresh expression evaluated at each splice site, not a
  //      stored one -- Random Number is the sharpest example: wire it into TWO different consumers without
  //      SetLocal in between and the compiled script calls Ess.RNG.new():int(...) separately at each site,
  //      so the two consumers can get DIFFERENT rolls despite the graph visually looking like "one roll,
  //      used twice." Routing it through SetLocal first evaluates it exactly once and both consumers read
  //      the same captured local.
  // ============================================================
  function SetLocal() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("value", "string");
    this.addProperty("value", "Ess.Player.character(0)");
    this.addWidget("text", "value", this.properties.value, function (v) { this.properties.value = v; }.bind(this));
    this.addProperty("name", "");
    this.addWidget("text", "name (optional label)", this.properties.name, function (v) { this.properties.name = v; }.bind(this));
    this.addOutput("captured", "string");
  }
  SetLocal.title = "Set Local";
  SetLocal.desc = "local <name> = <value>, evaluated once -- reuse the \"captured\" output anywhere a raw expression is expected";
  SetLocal.prototype.onAction = function () {
    var value = CodeGen.resolveNumberInput(this, 1, "value");  // raw expression, spliced unquoted (input 0 is exec)
    var varName = CodeGen.newLocal(this.properties.name);
    CodeGen.emitCapture(varName, value);
    this.setOutputData(1, varName);   // "captured" is output slot 1 -- "then" (EVENT) took slot 0
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("flow/setlocal", SetLocal);

  // ============================================================
  // Flow/Log -- Ess.Log(msg). A debug line for checking a captured value or confirming a branch actually
  // took the path you expected -- msg is raw expression text (so you can log a captured guid/number
  // directly, e.g. wire Set Local's "captured" output straight in), not auto-quoted; wrap it in
  // CodeGen.luaString yourself via a literal string property if you want to log fixed text instead.
  // ============================================================
  function FlowLog() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("msg", "string");
    this.addProperty("msg", "'checkpoint'");
    this.addWidget("text", "msg", this.properties.msg, function (v) { this.properties.msg = v; }.bind(this));
  }
  FlowLog.title = "Log";
  FlowLog.desc = "Ess.Log(msg) -- msg is raw expression text, not auto-quoted (wrap literal text in quotes yourself)";
  FlowLog.prototype.onAction = function () {
    var msg = CodeGen.resolveNumberInput(this, 1, "msg");  // input 0 is "exec"
    CodeGen.emit("Ess.Log(tostring(" + msg + "))");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("flow/log", FlowLog);

  // ============================================================
  // Flow/CustomCode -- an escape hatch: splices a raw block of Lua text verbatim into the compiled
  // script, for anything this tool doesn't have a dedicated node for yet. Click the widget to open a
  // multiline editor (litegraph's "text" widget supports a {multiline: true} option that swaps its
  // click-to-edit prompt for a textarea -- same widget TYPE as every other text field in this repo, just
  // with that option set).
  //
  // No data pins -- the block can reference any __prefixN local another node earlier in the SAME exec
  // chain already captured (see codegen.js's capture header for the ordering rule that applies), but this
  // node has no way to surface what's actually in scope, so getting a variable name right is on you.
  // Splicing is a single CodeGen.emit() call -- emit() indents once per call, not once per source line
  // inside the string, so a multi-line block nested in an if/branch reads flush-left past its first line.
  // Harmless for Lua (whitespace isn't significant), just a cosmetic wrinkle in the downloaded file.
  // ============================================================
  function CustomCode() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("code", "-- your Lua here");
    this.addWidget("text", "code", this.properties.code, function (v) { this.properties.code = v; }.bind(this), { multiline: true });
    this.size = [220, 80];
  }
  CustomCode.title = "Custom Code";
  CustomCode.desc = "Splices a raw block of Lua text verbatim into the compiled script -- an escape hatch for anything without a dedicated node yet.";
  CustomCode.prototype.onAction = function () {
    CodeGen.emit(this.properties.code);
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("flow/customcode", CustomCode);

  // ============================================================
  // Pure-data comparison/boolean/arithmetic nodes -- all emit a Lua EXPRESSION as text (never a computed
  // value, same model as Random Number), meant mainly to feed Branch's "condition" or another one of these
  // without hand-typing Lua operators, though hand-typing directly into Branch's condition text widget
  //
  // CHAINING CAVEAT: wiring one of these into ANOTHER one of these (e.g. two Compare nodes into one And) is
  // a data-node-to-data-node chain, which compiler.js's pre-pass runs in plain graph._nodes order, not a
  // real topological sort (see README's "What's deliberately not here yet") -- it happens to work whenever
  // the upstream node's onExecute runs first, but isn't guaranteed by construction. Keep chains shallow (one
  // level) until that pre-pass gets a real dependency sort.
  // works exactly as well -- these are convenience, not the only way in.
  // ============================================================
  function Compare() {
    this.addInput("a", "string");
    this.addProperty("a", "0");
    this.addWidget("text", "a", this.properties.a, function (v) { this.properties.a = v; }.bind(this));
    this.addProperty("op", "==");
    this.addWidget("combo", "op", this.properties.op, function (v) { this.properties.op = v; }.bind(this), { values: ["==", "~=", "<", "<=", ">", ">="] });
    this.addInput("b", "string");
    this.addProperty("b", "0");
    this.addWidget("text", "b", this.properties.b, function (v) { this.properties.b = v; }.bind(this));
    this.addOutput("value", "string");
  }
  Compare.title = "Compare";
  Compare.desc = "(a <op> b) -- ==, ~=, <, <=, >, >= ; works on numbers, or == / ~= on guids and strings";
  Compare.prototype.onExecute = function () {
    var a = CodeGen.resolveNumberInput(this, 0, "a");
    var b = CodeGen.resolveNumberInput(this, 1, "b");
    this.setOutputData(0, "(" + a + " " + this.properties.op + " " + b + ")");
  };
  LiteGraph.registerNodeType("flow/compare", Compare);

  function boolBinaryNode(typeName, title, luaOp) {
    function Node() {
      this.addInput("a", "string");
      this.addProperty("a", "true");
      this.addWidget("text", "a", this.properties.a, function (v) { this.properties.a = v; }.bind(this));
      this.addInput("b", "string");
      this.addProperty("b", "true");
      this.addWidget("text", "b", this.properties.b, function (v) { this.properties.b = v; }.bind(this));
      this.addOutput("value", "string");
    }
    Node.title = title;
    Node.desc = "(a " + luaOp + " b) -- a and b are raw Lua boolean-expression text";
    Node.prototype.onExecute = function () {
      var a = CodeGen.resolveNumberInput(this, 0, "a");
      var b = CodeGen.resolveNumberInput(this, 1, "b");
      this.setOutputData(0, "(" + a + " " + luaOp + " " + b + ")");
    };
    LiteGraph.registerNodeType(typeName, Node);
  }
  boolBinaryNode("flow/and", "And", "and");
  boolBinaryNode("flow/or", "Or", "or");

  function Not() {
    this.addInput("a", "string");
    this.addProperty("a", "true");
    this.addWidget("text", "a", this.properties.a, function (v) { this.properties.a = v; }.bind(this));
    this.addOutput("value", "string");
  }
  Not.title = "Not";
  Not.desc = "(not a) -- a is raw Lua boolean-expression text";
  Not.prototype.onExecute = function () {
    var a = CodeGen.resolveNumberInput(this, 0, "a");
    this.setOutputData(0, "(not " + a + ")");
  };
  LiteGraph.registerNodeType("flow/not", Not);

  function arithmeticNode(typeName, title, luaOp) {
    function Node() {
      this.addInput("a", "number");
      this.addProperty("a", 0);
      this.addWidget("number", "a", this.properties.a, function (v) { this.properties.a = v; }.bind(this));
      this.addInput("b", "number");
      this.addProperty("b", 0);
      this.addWidget("number", "b", this.properties.b, function (v) { this.properties.b = v; }.bind(this));
      this.addOutput("value", "number");
    }
    Node.title = "Number: " + title;
    Node.desc = "(a " + luaOp + " b)";
    Node.prototype.onExecute = function () {
      var a = CodeGen.resolveNumberInput(this, 0, "a");
      var b = CodeGen.resolveNumberInput(this, 1, "b");
      this.setOutputData(0, "(" + a + " " + luaOp + " " + b + ")");
    };
    LiteGraph.registerNodeType(typeName, Node);
  }
  arithmeticNode("flow/add", "Add", "+");
  arithmeticNode("flow/subtract", "Subtract", "-");
  arithmeticNode("flow/multiply", "Multiply", "*");
  arithmeticNode("flow/divide", "Divide", "/");

  // ============================================================
  // Flow/CombineCoordinates -- {x=x, y=y, z=z}, combining three separate numbers into the position-table
  // shape several Ess calls expect as ONE argument (AI Orders: Guard's `at`, and others like it). An ACTION
  // node, not pure data, despite doing no real work of its own -- see codegen.js's "ORDERING CAVEAT" note:
  // a captured value (e.g. Player: Get Position's x/y/z) is only safe to read from ANOTHER ACTION node
  // further down the SAME exec chain, never from a pure-data node's onExecute (that runs once in
  // compiler.js's flat pre-pass, before any trigger fires, i.e. before the capturing node's own onAction
  // has run). Wiring exec straight through (in == out, same tick) makes this the first thing downstream
  // of Player: Get Position that's actually safe to feed captured x/y/z into. Only solves the SINGLE-point
  // case; something like AI Orders: Patrol's `points` needs a LIST of these, which still needs to be typed
  // as a table of table-literals -- wiring N separate combiners into one list has no dedicated node yet.
  // ============================================================
  function CombineCoordinates() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("x", "number");
    this.addProperty("x", 0);
    this.addWidget("number", "x", this.properties.x, function (v) { this.properties.x = v; }.bind(this));
    this.addInput("y", "number");
    this.addProperty("y", 0);
    this.addWidget("number", "y", this.properties.y, function (v) { this.properties.y = v; }.bind(this));
    this.addInput("z", "number");
    this.addProperty("z", 0);
    this.addWidget("number", "z", this.properties.z, function (v) { this.properties.z = v; }.bind(this));
    this.addOutput("pos", "string");
  }
  CombineCoordinates.title = "Combine Coordinates";
  CombineCoordinates.desc = "{x=x, y=y, z=z} -- combines three numbers into the position-table shape AI Orders: Guard's `at` (and similar) expect. Wire this in the exec chain right after whatever captures x/y/z (e.g. Player: Get Position) -- see node comment for why.";
  CombineCoordinates.prototype.onAction = function () {
    var x = CodeGen.resolveNumberInput(this, 1, "x");
    var y = CodeGen.resolveNumberInput(this, 2, "y");
    var z = CodeGen.resolveNumberInput(this, 3, "z");
    this.setOutputData(1, "{x=" + x + ", y=" + y + ", z=" + z + "}");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("flow/combinecoords", CombineCoordinates);

  // ============================================================
  // Flow/OffsetNumber -- value + by. Same job as the pure-data Number: Add above, but an ACTION node (exec
  // in, exec out) for the same reason Combine Coordinates is: it's meant to sit directly after a capturing
  // node (Player: Get Position, Spawn's guid, ...) in that node's OWN exec chain and read its output the
  // moment it's set, rather than racing compiler.js's flat pre-pass -- see codegen.js's "ORDERING CAVEAT"
  // and Combine Coordinates' own comment above for the full reasoning. Kept separate from Number: Add
  // itself (rather than giving every arithmetic node optional exec pins) so the pure-data nodes keep their
  // simple "wire two operands, get an expression" shape for the many existing chains that don't need exec
  // ordering at all (e.g. Compare/And/Or feeding Branch).
  // ============================================================
  function OffsetNumber() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("value", "number");
    this.addProperty("value", 0);
    this.addWidget("number", "value", this.properties.value, function (v) { this.properties.value = v; }.bind(this));
    this.addInput("by", "number");
    this.addProperty("by", 0);
    this.addWidget("number", "by", this.properties.by, function (v) { this.properties.by = v; }.bind(this));
    this.addOutput("result", "number");
  }
  OffsetNumber.title = "Offset Number";
  OffsetNumber.desc = "value + by -- e.g. offset a spawn point from a captured player position. An ACTION node so it's safe to wire right after a capturing node in the same exec chain -- see node comment for why (same reasoning as Combine Coordinates).";
  OffsetNumber.prototype.onAction = function () {
    var value = CodeGen.resolveNumberInput(this, 1, "value");
    var by = CodeGen.resolveNumberInput(this, 2, "by");
    this.setOutputData(1, "(" + value + " + " + by + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("flow/offsetnumber", OffsetNumber);

  // ============================================================
  // Flow/CombineList4 -- { a, b, c, d }, combining four raw expressions (guids, numbers, anything) into one
  // Lua table literal -- e.g. four individually-captured Spawn guids into the list an AI Orders node's
  // `guids` argument expects. Fixed at exactly four slots (this draft's list-shaped-parameter story is
  // still "type the table literal by hand" everywhere else -- see README's "What's deliberately not here
  // yet"; a real variable-arity list-builder is a nicer next step than hand-typing). An ACTION node for the
  // same ordering reason as Combine Coordinates/Offset Number above: each captured guid is only valid once
  // its OWN capturing node (e.g. Spawn) has actually run, so this needs to sit later in the same exec chain,
  // not in the pure-data pre-pass.
  // ============================================================
  function CombineList4() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    ["a", "b", "c", "d"].forEach(function (n) {
      this.addInput(n, "string");
      this.addProperty(n, "nil");
      this.addWidget("text", n, this.properties[n], function (v) { this.properties[n] = v; }.bind(this));
    }, this);
    this.addOutput("list", "string");
  }
  CombineList4.title = "Combine List (4)";
  CombineList4.desc = "{ a, b, c, d } -- combines four expressions (guids, numbers, anything) into one Lua table literal. Leave a slot at its \"nil\" default if you have fewer than four real values.";
  CombineList4.prototype.onAction = function () {
    var a = CodeGen.resolveNumberInput(this, 1, "a");
    var b = CodeGen.resolveNumberInput(this, 2, "b");
    var c = CodeGen.resolveNumberInput(this, 3, "c");
    var d = CodeGen.resolveNumberInput(this, 4, "d");
    this.setOutputData(1, "{ " + a + ", " + b + ", " + c + ", " + d + " }");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("flow/combinelist4", CombineList4);
})();
