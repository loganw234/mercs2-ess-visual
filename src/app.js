/* app.js -- canvas setup, a default example graph so the tool demonstrates itself on load, and the
 * Compile/Download wiring. */
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

  // ---- default example graph: On Key Press -> Give Cash -> Toast Message -> Spawn Ahead, with a
  // Random Number feeding Spawn Ahead's distance instead of a fixed value -- exercises both the exec
  // chain and a data wire in one small, readable graph. ----
  function buildExampleGraph() {
    var onKey = LiteGraph.createNode("ess/onkeypress");
    onKey.pos = [60, 200];
    graph.add(onKey);

    var giveCash = LiteGraph.createNode("ess/givecash");
    giveCash.pos = [320, 140];
    graph.add(giveCash);

    var toast = LiteGraph.createNode("ess/toastmessage");
    toast.properties.message = "Cash + a ride!";
    toast.pos = [580, 140];
    graph.add(toast);

    var spawn = LiteGraph.createNode("ess/spawnahead");
    spawn.pos = [840, 140];
    graph.add(spawn);

    var rnd = LiteGraph.createNode("ess/randomnumber");
    rnd.pos = [580, 340];
    graph.add(rnd);

    onKey.connect(0, giveCash, 0);
    giveCash.connect(0, toast, 0);
    toast.connect(0, spawn, 0);
    rnd.connect(0, spawn, 1);
  }

  buildExampleGraph();
  resize();
  graph.start(); // litegraph's own render/interaction loop -- NOT what runs our compile step (see compiler.js)
  Palette.render(graph, canvas); // left sidebar node browser -- see palette.js (also trims litegraph's stock nodes)

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
