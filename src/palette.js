/* palette.js -- two jobs, both about making the editor legible instead of a bare litegraph canvas:
 *
 * 1. TRIM: litegraph.js ships ~200 bundled stock node types (basic/*, math/*, audio/*, midi/*, network/*,
 *    geometry/*, ...) meant for its general dataflow/ComfyUI-style use cases. compiler.js only understands
 *    isTriggerNode and this repo's own "ess/*"/"native/*"/"flow/*" action/data nodes (see its isDataNode
 *    check and CodeGen.emit/emitNative calls) -- a stock node dropped into a graph here would just
 *    silently contribute nothing to the compiled output. So they're unregistered on load, before the user
 *    ever opens the Add Node menu.
 *
 * 2. BROWSE: builds the left sidebar's searchable, categorized node list straight from whatever's left in
 *    LiteGraph.registered_node_types -- reading each node's own .title/.desc statics (the same metadata
 *    every nodes*.js file already declares) rather than a hand-maintained list here that would drift the
 *    moment a new node file is added. Category is the type string's own second path segment ("ess/world/
 *    tint" -> "world"; a flat "ess/givecash" falls into "General") -- for "native/*" types, prefixed
 *    "Native: " (native/object/setname -> "Native: Object") so the two tiers never silently merge into one
 *    flat "Object" bucket in the list, even though an ess/object/* node and a native/object/* node share
 *    the same namespace segment; and every "flow/*" type (all flat, no sub-namespace of their own) buckets
 *    into one shared "Flow Control" category. Click an item to drop that node onto the canvas -- the same
 *    LiteGraph.createNode + graph.add the right-click menu itself uses.
 */
(function () {
  "use strict";

  // ---- 1. trim ---------------------------------------------------------------------------------------
  var KEEP_PREFIXES = ["ess/", "native/", "flow/"];
  Object.keys(LiteGraph.registered_node_types).forEach(function (type) {
    var keep = KEEP_PREFIXES.some(function (p) { return type.indexOf(p) === 0; });
    if (!keep) LiteGraph.unregisterNodeType(type);
  });

  // ---- 2. browse ---------------------------------------------------------------------------------------
  var CATEGORY_LABELS = { aiorders: "AI Orders", ui: "UI", mark: "Markers" };
  function categoryLabel(tier, seg) {
    if (tier === "flow") return "Flow Control";
    var base = seg ? (CATEGORY_LABELS[seg] || (seg.charAt(0).toUpperCase() + seg.slice(1))) : "General";
    return tier === "native" ? "Native: " + base : base;
  }

  function collectCategories() {
    var byCat = {};
    Object.keys(LiteGraph.registered_node_types).sort().forEach(function (type) {
      var cls = LiteGraph.registered_node_types[type];
      var parts = type.split("/");   // "ess/world/tint" -> ["ess","world","tint"]; "native/object/setname" -> ["native","object","setname"]
      var label = categoryLabel(parts[0], parts.length > 2 ? parts[1] : null);
      (byCat[label] = byCat[label] || []).push({ type: type, title: cls.title || type, desc: cls.desc || "" });
    });
    return byCat;
  }

  function render(graph, canvas) {
    var listEl = document.getElementById("palette");
    var searchEl = document.getElementById("paletteSearch");
    var countEl = document.getElementById("paletteCount");
    var byCat = collectCategories();
    var catNames = Object.keys(byCat).sort(function (a, b) {
      if (a === "General") return -1;
      if (b === "General") return 1;
      return a < b ? -1 : a > b ? 1 : 0;
    });

    var total = 0;
    catNames.forEach(function (c) { total += byCat[c].length; });
    countEl.textContent = total + " nodes / " + catNames.length + " categories";

    function addNodeToCanvas(type) {
      var node = LiteGraph.createNode(type);
      if (!node) return;
      var rect = canvas.canvas.getBoundingClientRect();
      var center = [rect.width / 2, rect.height / 2];
      var canvasPos = canvas.ds ? canvas.ds.convertOffsetToCanvas(center) : center;
      node.pos = [canvasPos[0] + (Math.random() * 60 - 30), canvasPos[1] + (Math.random() * 60 - 30)];
      graph.add(node);
      canvas.selectNode(node);
      graph.setDirtyCanvas(true, true);
    }

    function buildList(filterText) {
      listEl.innerHTML = "";
      var q = (filterText || "").trim().toLowerCase();
      catNames.forEach(function (cat) {
        var items = byCat[cat].filter(function (n) {
          return !q || n.title.toLowerCase().indexOf(q) !== -1 || n.desc.toLowerCase().indexOf(q) !== -1;
        });
        if (!items.length) return;

        var details = document.createElement("details");
        details.open = !!q || cat === "General";

        var summary = document.createElement("summary");
        summary.textContent = cat + " (" + items.length + ")";
        details.appendChild(summary);

        var ul = document.createElement("ul");
        items.forEach(function (n) {
          var li = document.createElement("li");
          li.title = n.desc;
          li.textContent = n.title;
          li.addEventListener("click", function () { addNodeToCanvas(n.type); });
          ul.appendChild(li);
        });
        details.appendChild(ul);
        listEl.appendChild(details);
      });

      if (!listEl.children.length) {
        var empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "no nodes match \"" + filterText + "\"";
        listEl.appendChild(empty);
      }
    }

    searchEl.addEventListener("input", function () { buildList(searchEl.value); });
    buildList("");
  }

  window.Palette = { render: render };
})();
