/* app.js -- canvas setup, the sample picker (loads one of samples.js's boilerplate graphs so the tool
 * demonstrates itself on load), and the Compile/Download wiring. */
(function () {
  "use strict";

  var graph = new LGraph();
  var canvas = new LGraphCanvas("#graphcanvas", graph);
  canvas.background_image = null;
  canvas.render_shadows = false;
  canvas.show_info = false;   // litegraph's built-in "T:/I:/N:/V:/FPS:" render-stats overlay -- useful when
                              // debugging litegraph itself, pure noise for someone building a mod script.

  function resize() {
    var el = document.getElementById("graphcanvas");
    el.width = el.parentElement.clientWidth;
    el.height = el.parentElement.clientHeight;
    canvas.draw(true, true);
  }
  window.addEventListener("resize", resize);

  // ---- fit to view: frame the whole graph in the visible canvas.
  //
  // litegraph opens every graph at scale 1, offset [0,0] -- i.e. showing whatever happens to sit near the
  // graph's own origin, with no regard for where the nodes actually are. The default sample alone is
  // ~1390px wide against a canvas that's usually under 1000, so the tool's own starting graph ran off the
  // right edge on first load with nothing on screen to suggest there was more.
  //
  // The transform is screen = (graphPos + offset) * scale (DragAndScale.convertOffsetToCanvas in
  // lib/litegraph.js), so offset is in GRAPH units and gets applied BEFORE the scale -- hence the
  // /scale terms in the centering math below rather than a plain pixel offset.
  var FIT_PAD = 60;
  function fitToView() {
    var el = canvas.canvas;
    var boxes = graph._nodes.map(function (n) { return n.getBounding(); });
    (graph._groups || []).forEach(function (g) { boxes.push([g.pos[0], g.pos[1], g.size[0], g.size[1]]); });
    if (!boxes.length || !el.width || !el.height) {
      canvas.ds.scale = 1;
      canvas.ds.offset = [0, 0];
      graph.setDirtyCanvas(true, true);
      return;
    }

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    boxes.forEach(function (b) {
      minX = Math.min(minX, b[0]);
      minY = Math.min(minY, b[1]);
      maxX = Math.max(maxX, b[0] + b[2]);
      maxY = Math.max(maxY, b[1] + b[3]);
    });

    var w = (maxX - minX) + FIT_PAD * 2;
    var h = (maxY - minY) + FIT_PAD * 2;
    // Never zoom PAST 1:1 -- a two-node graph blown up to fill the canvas looks broken, and litegraph's
    // widgets are drawn at fixed pixel sizes that don't read well enlarged. Only ever zoom out to fit.
    var scale = Math.min(1, el.width / w, el.height / h);
    scale = Math.max(canvas.ds.min_scale, scale);

    canvas.ds.scale = scale;
    canvas.ds.offset = [
      FIT_PAD - minX + (el.width / scale - w) / 2,
      FIT_PAD - minY + (el.height / scale - h) / 2
    ];
    graph.setDirtyCanvas(true, true);
  }

  // ---- initial graph: restore this browser's autosave if there is one, otherwise the default sample.
  //
  // NO PROMPT. This used to open with a blocking window.confirm ("Restore your previous graph?"), which was
  // both a rough first thing to meet and actively dangerous: Cancel loaded the default sample, and the
  // first edit after that overwrote the autosave -- so one misclick on a native dialog quietly discarded
  // the previous session's work. Restoring unconditionally makes the safe outcome the default one and the
  // destructive one an explicit, backed-up click (the banner below); nothing here can lose work by
  // accident any more. A corrupt/unparseable autosave falls through to the sample rather than dying on
  // load, since a graph you can't even open is exactly when you most need the tool to still start.
  var autosaved = GraphIO.readAutosave();
  var didRestore = false;
  if (autosaved) {
    try {
      GraphIO.restoreGraph(graph, autosaved, function () { FunctionCalls.rescan(graph); });
      didRestore = true;
    } catch (e) {
      graph.clear();
      didRestore = false;
    }
  }
  if (!didRestore) {
    Samples.load("spawn-and-control", graph); // the default starting graph -- see samples.js for this + others
    FunctionCalls.rescan(graph); // registers a "Call: name" type for every Function Start already in the graph -- before Palette.render so they show up in the initial sidebar too
  }
  resize();
  fitToView(); // AFTER resize() -- fitToView reads el.width/height, which resize() is what sets
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

  // ---- New Group: litegraph's own "Add Group" (right-click empty canvas) drops an unlabeled 140x80 gray
  // box wherever you clicked -- real, but undiscoverable and unhelpful for what this is actually for here:
  // visually fencing off one function block (or the main chain) with a title, for a graph meant to teach.
  // This button asks for a title UP FRONT and sizes/positions the box around whatever's currently selected,
  // so "select a function's nodes, click New Group, name it" is the whole workflow. Recoloring, renaming, and
  // resizing an existing group afterward are all litegraph's own built-ins (right-click a group -> Edit Group),
  // not reimplemented here -- this button only fixes the ONE real gap, creating a well-formed one to start. ----
  document.getElementById("btnFit").addEventListener("click", fitToView);

  var btnNewGroup = document.getElementById("btnNewGroup");
  btnNewGroup.addEventListener("click", function () {
    var selected = canvas.selected_nodes || {};
    var ids = Object.keys(selected);
    if (!ids.length) {
      alert("Select the nodes you want to label first -- drag a box around them, or shift-click each one -- then click New Group.");
      return;
    }
    var title = window.prompt("Group title:", "");
    if (title === null) return; // cancelled
    title = title.trim() || "Group";

    var PAD = 30, PAD_TOP = 50; // extra top padding clears the title text (group font_size defaults to 24)
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ids.forEach(function (id) {
      var b = selected[id].getBounding();
      minX = Math.min(minX, b[0]);
      minY = Math.min(minY, b[1]);
      maxX = Math.max(maxX, b[0] + b[2]);
      maxY = Math.max(maxY, b[1] + b[3]);
    });

    var group = new LGraphGroup(title);
    group.pos = [minX - PAD, minY - PAD_TOP];
    group.size = [(maxX - minX) + PAD * 2, (maxY - minY) + PAD_TOP + PAD];
    group.color = LGraphCanvas.node_colors.pale_blue.groupcolor; // a real default, not litegraph's flat gray -- still one of the stock Edit Group > Color presets, so recoloring later stays consistent
    graph.add(group);
    group.recomputeInsideNodes();
    graph.setDirtyCanvas(true, true);
  });

  // Litegraph's own key handler (LGraphCanvas.prototype.processKey) already covers Ctrl+C/V/A and Delete
  // -- see README's "Node colors"-adjacent UX section for the full list -- but has no undo/redo of its
  // own, so this is a separate listener rather than an extension of that one.
  document.addEventListener("keydown", function (e) {
    if (e.target.localName === "input" || e.target.localName === "textarea") return;
    // Bare "F" fits the graph to the viewport -- litegraph's own processKey doesn't claim plain letters
    // (only Delete/Backspace, Escape and its Ctrl+A/C/V), so this doesn't fight it for the key.
    if (!(e.ctrlKey || e.metaKey || e.altKey) && (e.key === "f" || e.key === "F")) { fitToView(); e.preventDefault(); return; }
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
      fitToView();
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
    fitToView();   // no nodes left -- resets pan/zoom to 1:1 origin, so a blank canvas starts somewhere sane
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
  sampleSelect.value = "spawn-and-control";
  sampleHint.textContent = Samples.get("spawn-and-control").desc;
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
    fitToView();
    undoStack.pushInitial();
    doCompile();
  });

  // ---- compile + preview + download ----
  var codeEl = document.getElementById("code");
  var statusEl = document.getElementById("status");
  var scriptNameEl = document.getElementById("scriptName");

  // The script's name reaches three places -- the generated header comment, its "[name] ran" log line, and
  // the download filename -- and all three were hardcoded "GraphOutput". So every graph you exported
  // landed on top of the last one in your downloads folder, and every one of them announced itself as the
  // same script in-game, which makes "did my script actually run?" unanswerable once you have two.
  // Restricted to filename-safe characters because it genuinely becomes a filename: the loader scans
  // scripts/OnKey/ and keys lua_loader.ini's [OnKey] entries off the file's own relative path.
  function scriptName() {
    var raw = (scriptNameEl.value || "").trim().replace(/[^A-Za-z0-9_-]/g, "");
    return raw || "GraphOutput";
  }
  scriptNameEl.addEventListener("input", function () { doCompile(); });

  function doCompile() {
    // Rescanning here (not just on sample load) means compiling always reflects the CURRENT params/
    // returns on every Function Start, even mid-edit -- see nodes-function-calls.js's header for why an
    // already-PLACED Call node instance doesn't retroactively resize, though; only new drops pick it up.
    FunctionCalls.rescan(graph);
    Palette.refresh();
    var result = Compiler.compile(graph, { scriptName: scriptName() });
    if (!result.ok) {
      codeEl.textContent = "";
      statusEl.textContent = "ERROR: " + result.error;
      return result;
    }
    codeEl.textContent = result.code;
    var summary = result.triggerCount === 0
      ? "No trigger node found -- add an \"On Key Press\" node."
      : result.triggerCount + " trigger" + (result.triggerCount === 1 ? "" : "s") + ", " + result.lineCount + " line" + (result.lineCount === 1 ? "" : "s") + " generated.";
    statusEl.textContent = summary;

    // Nodes nothing ever chains into compile to NOTHING, silently (see compiler.js's findUnreachable) --
    // the easiest mistake to make here and the hardest to spot, since the compile still "succeeds". Name
    // them rather than just counting them, so it's obvious WHICH node was left dangling. Built with real
    // DOM nodes rather than innerHTML: these are user-chosen node titles, and this panel is the one place
    // they'd get re-parsed as markup.
    var stray = result.unreachable || [];
    if (stray.length) {
      var shown = stray.slice(0, 3).join(", ") + (stray.length > 3 ? ", +" + (stray.length - 3) + " more" : "");
      var warn = document.createElement("span");
      warn.className = "warnline";
      warn.textContent = stray.length + (stray.length === 1 ? " node isn't" : " nodes aren't") +
        " connected to a trigger, so " + (stray.length === 1 ? "it's" : "they're") + " not in the script: " + shown;
      statusEl.appendChild(warn);
    }
    return result;
  }

  document.getElementById("btnCompile").addEventListener("click", doCompile);

  document.getElementById("btnDownload").addEventListener("click", function () {
    var result = doCompile();
    if (!result.ok) return;
    var blob = new Blob([result.code], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = scriptName() + ".lua";
    a.click();
  });

  doCompile(); // show something in the panel immediately, matching the default graph

  // ---- restore banner: the non-blocking replacement for the old startup confirm().
  //
  // Shown only when an autosave actually got restored above, and only until it's acted on -- it explains
  // what just happened (otherwise "why isn't this the sample I expected?" has no answer on screen) and
  // offers the one thing the old Cancel button did, minus the data loss: swapping to the default sample
  // stashes the restored graph first, and the banner then offers it straight back.
  var banner = document.getElementById("restoreBanner");
  var bannerText = document.getElementById("restoreBannerText");
  var btnUseSample = document.getElementById("btnUseSample");
  var btnUndoRestore = document.getElementById("btnUndoRestore");

  function replaceGraphAndRefresh(loadFn) {
    loadFn();
    FunctionCalls.rescan(graph);
    Palette.refresh();
    graph.setDirtyCanvas(true, true);
    fitToView();
    undoStack.pushInitial();
    doCompile();
  }

  if (didRestore) {
    banner.hidden = false;
    btnUseSample.addEventListener("click", function () {
      GraphIO.backupAutosave();   // BEFORE the sample load's own autosave overwrites it
      replaceGraphAndRefresh(function () { Samples.load(sampleSelect.value || "spawn-and-control", graph); });
      bannerText.textContent = "Loaded a sample. Your previous graph is still recoverable:";
      btnUseSample.hidden = true;
      btnUndoRestore.hidden = false;
    });
    btnUndoRestore.addEventListener("click", function () {
      var backup = GraphIO.readAutosaveBackup();
      if (!backup) { banner.hidden = true; return; }
      replaceGraphAndRefresh(function () {
        GraphIO.restoreGraph(graph, backup, function () { FunctionCalls.rescan(graph); });
      });
      banner.hidden = true;
    });
  }
  document.getElementById("btnDismissBanner").addEventListener("click", function () { banner.hidden = true; });

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

  // ---- the live graph, for the console and for tooling.
  //
  // Everything above lives in this IIFE's closure, which meant the running app's own graph was unreachable
  // from anywhere else -- .claude/skills/ess-graph-build's build workflow works around it by constructing a
  // SEPARATE LGraph and never touching the one on screen, and debugging a real graph from devtools meant
  // digging it out of the canvas element's undocumented `.data` back-reference. Exposing the two handles
  // costs nothing and makes both straightforward. Read/drive it, don't reassign it.
  window.EssVisual = { graph: graph, canvas: canvas, fitToView: fitToView, compile: doCompile };
})();
