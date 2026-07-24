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

  Samples.load("cash-and-ride", graph); // the default starting graph -- see samples.js for this + 4 others
  resize();
  graph.start(); // litegraph's own render/interaction loop -- NOT what runs our compile step (see compiler.js)
  Palette.render(graph, canvas); // left sidebar node browser -- see palette.js (also trims litegraph's stock nodes)

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
    sampleHint.textContent = sample.desc;
    graph.setDirtyCanvas(true, true);
    doCompile();
  });

  // ---- compile + preview + download ----
  var codeEl = document.getElementById("code");
  var statusEl = document.getElementById("status");

  function doCompile() {
    var result = Compiler.compile(graph, { scriptName: "GraphOutput" });
    codeEl.textContent = result.code;
    statusEl.textContent = result.triggerCount === 0
      ? "No trigger node found -- add an \"On Key Press\" node."
      : result.triggerCount + " trigger" + (result.triggerCount === 1 ? "" : "s") + ", " + result.lineCount + " line" + (result.lineCount === 1 ? "" : "s") + " generated.";
    return result;
  }

  document.getElementById("btnCompile").addEventListener("click", doCompile);

  document.getElementById("btnDownload").addEventListener("click", function () {
    var result = doCompile();
    var blob = new Blob([result.code], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "GraphOutput.lua";
    a.click();
  });

  doCompile(); // show something in the panel immediately, matching the default graph
})();
