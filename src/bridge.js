/* bridge.js -- thin adapter over the vendored EssBridge client (lib/bridge-client.js), same "own the
 * instance in exactly one place" shape as every other tool in this ecosystem (see mercs2-webtool-template's
 * 00_bridge.js). Exists so app.js only ever touches Bridge, never `new EssBridge(...)` directly.
 */
window.Bridge = (function () {
  "use strict";
  var B = null;
  var state = "closed";
  var onStatus = function () {};

  return {
    state: function () { return state; },
    connected: function () { return state === "open"; },
    onStatus: function (fn) { onStatus = fn; },

    connect: function (url) {
      if (B) { try { B.close(); } catch (e) {} B = null; }
      if (typeof EssBridge === "undefined") {
        state = "error";
        onStatus(state);
        return;
      }
      B = new EssBridge(url || "ws://127.0.0.1:27050", {
        maxReconnectDelay: 4000,
        onStatus: function (s) { state = s; onStatus(s); }
      });
      B.connect().catch(function () {});
    },

    disconnect: function () {
      if (B) { B.close(); B = null; }
      state = "closed";
      onStatus(state);
    },

    /* run(code) -> Promise<{ ok, value, acked, timedOut, error? }> -- see lib/bridge-client.js. */
    run: function (code, opts) {
      if (!B || state !== "open") return Promise.resolve({ ok: false, acked: false, error: "not connected" });
      return B.run(code, opts);
    }
  };
})();
