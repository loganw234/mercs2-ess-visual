/* app.js -- canvas setup, the sample picker (loads one of samples.js's boilerplate graphs so the tool
 * demonstrates itself on load), and the Compile/Download wiring. */
(function () {
  "use strict";

  var graph = new LGraph();
  var canvas = new LGraphCanvas("#graphcanvas", graph);
  canvas.background_image = null;
  canvas.render_shadows = false;

  function resize() {
    var el = document.getElementById("graphcanvas");
    el.width = el.parentElement.clientWidth;
    el.height = el.parentElement.clientHeight;
    canvas.draw(true, true);
  }
  window.addEventListener("resize", resize);

  // ---- initial graph: restore an autosave from this browser if one exists, otherwise the default sample.
  // window.confirm blocks like every other "replace the graph" prompt in this file (sample picker, Load
  // Graph below) -- same established pattern, not a new one. ----
  var autosaved = GraphIO.readAutosave();
  if (autosaved && window.confirm("Restore your previous graph from this browser? (Cancel loads the default sample instead.)")) {
    GraphIO.restoreGraph(graph, autosaved, function () { FunctionCalls.rescan(graph); });
  } else {
    Samples.load("cash-and-ride", graph); // the default starting graph -- see samples.js for this + 4 others
    FunctionCalls.rescan(graph); // registers a "Call: name" type for every Function Start already in the graph -- before Palette.render so they show up in the initial sidebar too
  }
  resize();
  graph.start(); // litegraph's own render/interaction loop -- NOT what runs our compile step (see compiler.js)
  Palette.render(graph, canvas); // left sidebar node browser -- see palette.js (also trims litegraph's stock nodes)

  // ---- undo/redo + autosave -- both driven off graph.on_change, litegraph's own general "something
  // mutated" hook (see graphio.js's header comment for why this one, not the more narrowly-fired
  // beforeChange/afterChange pair that's explicitly commented "used for undo") -- attached AFTER the
  // initial load above so restoring/loading the starting graph doesn't itself become an undo step;
  // undoStack.pushInitial() seeds that instead. ----
  var btnUndo = document.getElementById("btnUndo");
  var btnRedo = document.getElementById("btnRedo");
  var undoStack = GraphIO.createUndoStack(graph, {
    rescanFn: function () { FunctionCalls.rescan(graph); },
    onRestore: function () {
      Palette.refresh();
      graph.setDirtyCanvas(true, true);
      doCompile();
    },
    onChange: function () {
      btnUndo.disabled = !undoStack.canUndo();
      btnRedo.disabled = !undoStack.canRedo();
    }
  });
  graph.on_change = function () {
    undoStack.record();
    GraphIO.scheduleAutosave(graph);
  };
  undoStack.pushInitial();

  btnUndo.addEventListener("click", function () { undoStack.undo(); });
  btnRedo.addEventListener("click", function () { undoStack.redo(); });

  // Litegraph's own key handler (LGraphCanvas.prototype.processKey) already covers Ctrl+C/V/A and Delete
  // -- see README's "Node colors"-adjacent UX section for the full list -- but has no undo/redo of its
  // own, so this is a separate listener rather than an extension of that one.
  document.addEventListener("keydown", function (e) {
    if (e.target.localName === "input" || e.target.localName === "textarea") return;
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === "z" && !e.shiftKey) { if (undoStack.undo()) e.preventDefault(); }
    else if (e.key === "y" || (e.key === "z" && e.shiftKey)) { if (undoStack.redo()) e.preventDefault(); }
  });

  // ---- save / load / new graph ----
  document.getElementById("btnSaveGraph").addEventListener("click", function () {
    var json = JSON.stringify(graph.serialize(), null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "graph.json";
    a.click();
  });

  var fileLoadGraph = document.getElementById("fileLoadGraph");
  document.getElementById("btnLoadGraph").addEventListener("click", function () { fileLoadGraph.click(); });
  fileLoadGraph.addEventListener("change", function () {
    var file = fileLoadGraph.files[0];
    fileLoadGraph.value = ""; // so picking the SAME file again still fires "change"
    if (!file) return;
    if (!window.confirm('Replace the current graph with "' + file.name + '"? Unsaved changes will be lost.')) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        GraphIO.restoreGraph(graph, reader.result, function () { FunctionCalls.rescan(graph); });
      } catch (e) {
        window.alert("Couldn't load that file -- " + e.message);
        return;
      }
      Palette.refresh();
      graph.setDirtyCanvas(true, true);
      undoStack.pushInitial();
      doCompile();
    };
    reader.readAsText(file);
  });

  document.getElementById("btnNewGraph").addEventListener("click", function () {
    if (!window.confirm("Clear the canvas and start a blank graph? Unsaved changes will be lost.")) return;
    graph.clear();
    FunctionCalls.rescan(graph);
    Palette.refresh();
    graph.setDirtyCanvas(true, true);
    undoStack.pushInitial();
    GraphIO.scheduleAutosave(graph);
    doCompile();
  });

  // ---- sample picker ----
  var sampleSelect = document.getElementById("sampleSelect");
  var sampleHint = document.getElementById("sampleHint");
  Samples.list.forEach(function (s) {
    var opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    sampleSelect.appendChild(opt);
  });
  sampleSelect.value = "cash-and-ride";
  sampleHint.textContent = Samples.get("cash-and-ride").desc;
  sampleSelect.addEventListener("change", function () {
    var sample = Samples.get(sampleSelect.value);
    if (!window.confirm('Replace the current graph with "' + sample.name + '"? Unsaved changes will be lost.')) {
      return;
    }
    Samples.load(sample.id, graph);
    FunctionCalls.rescan(graph);
    Palette.refresh();
    sampleHint.textContent = sample.desc;
    graph.setDirtyCanvas(true, true);
    undoStack.pushInitial();
    doCompile();
  });

  // ---- compile + preview + download ----
  var codeEl = document.getElementById("code");
  var statusEl = document.getElementById("status");

  function doCompile() {
    // Rescanning here (not just on sample load) means compiling always reflects the CURRENT params/
    // returns on every Function Start, even mid-edit -- see nodes-function-calls.js's header for why an
    // already-PLACED Call node instance doesn't retroactively resize, though; only new drops pick it up.
    FunctionCalls.rescan(graph);
    Palette.refresh();
    var result = Compiler.compile(graph, { scriptName: "GraphOutput" });
    if (!result.ok) {
      codeEl.textContent = "";
      statusEl.textContent = "ERROR: " + result.error;
      return result;
    }
    codeEl.textContent = result.code;
    statusEl.textContent = result.triggerCount === 0
      ? "No trigger node found -- add an \"On Key Press\" node."
      : result.triggerCount + " trigger" + (result.triggerCount === 1 ? "" : "s") + ", " + result.lineCount + " line" + (result.lineCount === 1 ? "" : "s") + " generated.";
    return result;
  }

  document.getElementById("btnCompile").addEventListener("click", doCompile);

  document.getElementById("btnDownload").addEventListener("click", function () {
    var result = doCompile();
    if (!result.ok) return;
    var blob = new Blob([result.code], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "GraphOutput.lua";
    a.click();
  });

  doCompile(); // show something in the panel immediately, matching the default graph

  // ---- live connect ----
  var dot = document.getElementById("dot");
  var statusText = document.getElementById("statusText");
  var btnConnect = document.getElementById("btnConnect");
  var btnRun = document.getElementById("btnRun");

  Bridge.onStatus(function (s) {
    dot.className = "dot " + s;
    statusText.textContent = s === "open" ? "connected" : s;
    btnConnect.textContent = s === "open" ? "Disconnect" : "Connect";
    btnRun.disabled = s !== "open";
  });

  btnConnect.addEventListener("click", function () {
    if (Bridge.connected()) { Bridge.disconnect(); return; }
    Bridge.connect();
  });

  // ---- run in game: compile, send the chunk live, and (independently) animate the exec chain on canvas
  // so the flow is visible while it's presumably happening in-game -- see runviz.js for why these are two
  // separate, only loosely-synced things rather than one truly step-by-step trace. ----
  var running = false;
  btnRun.addEventListener("click", function () {
    if (running || !Bridge.connected()) return;
    var result = doCompile();
    if (!result.ok) return;              // doCompile() already showed the error in statusEl
    if (result.triggerCount === 0) {
      statusEl.textContent = "No trigger node found -- add an \"On Key Press\" node.";
      return;
    }

    running = true;
    btnRun.textContent = "Running...";

    var animation = RunViz.animate(graph, canvas);
    Bridge.run(result.code).then(function (r) {
      if (r.timedOut) statusEl.textContent = "Sent -- no confirmation within the timeout, but it likely ran.";
      else if (!r.ok) statusEl.textContent = "ERROR: " + (r.error || r.value);
      else statusEl.textContent = "Ran live in game.";
    });

    animation.then(function () {
      running = false;
      btnRun.textContent = "Run in game";
    });
  });
})();
