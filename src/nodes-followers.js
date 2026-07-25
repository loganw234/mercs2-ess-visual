/* nodes-followers.js -- ess/followers/* nodes: Ess.Followers (mercs2-lua-essentials), the lifecycle-aware
 * "who's currently assigned to me" roster built on Ess.AIOrders/Ess.On.death/Ess.Mark. Same exec-in/then-out
 * action-node shape as nodes-encounter.js's ess/aiorders/* nodes, which these mirror closely -- Followers'
 * whole point is that you DON'T re-pass a guids list to every order the way ess/aiorders/* nodes require,
 * so these have no "guids" input at all; Ess.Followers.list() supplies it internally on the Lua side.
 *
 * Two "visual compactor" nodes live here too (guardmyposition/patrolaroundme) -- see nodes-object.js's
 * SpawnFriendlyUnit for the other one and the general rationale: collapsing a 2-4 node chain this tool's own
 * boilerplate graphs kept needing by hand (Player: Get Position -> offset math -> AI Orders: Guard/Patrol,
 * or Player: Get Position -> trig -> Object: Spawn -> Relations: Set Feeling) into one node that does the
 * whole thing, still spliced as plain Lua text like everything else here -- not a new codegen mechanism.
 */
(function () {
  "use strict";

  // ============================================================
  // Ess/Followers/Recruit -- Ess.Easy.Followers.recruit(guid)
  // ============================================================
  function FollowersRecruit() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  FollowersRecruit.title = "Followers: Recruit";
  FollowersRecruit.desc = "Ess.Easy.Followers.recruit(guid) -- makes guid follow the player (auto-holds distance, rides along in vehicles on its own) and remembers it, so Followers: Order commands it later with no guid list to re-thread through your own graph.";
  FollowersRecruit.prototype.onAction = function () {
    var guid = CodeGen.resolveNumberInput(this, 1, "guid");   // input 0 is "exec"
    CodeGen.emit("Ess.Easy.Followers.recruit(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/followers/recruit", FollowersRecruit);

  // ============================================================
  // Ess/Followers/Dismiss -- Ess.Followers.dismiss(guid)
  // ============================================================
  function FollowersDismiss() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
  }
  FollowersDismiss.title = "Followers: Dismiss";
  FollowersDismiss.desc = "Ess.Followers.dismiss(guid) -- reverts the recruit sequence (Vip/LivingWorld/Role) and forgets the guid. A no-op if it was never recruited.";
  FollowersDismiss.prototype.onAction = function () {
    var guid = CodeGen.resolveNumberInput(this, 1, "guid");
    CodeGen.emit("Ess.Followers.dismiss(" + guid + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/followers/dismiss", FollowersDismiss);

  // ============================================================
  // Ess/Followers/OrderAttack -- Ess.Easy.Followers.orderAttack(target)
  // ============================================================
  function FollowersOrderAttack() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("target", "string");
    this.addProperty("target", "Ess.Player.character(0)");
    this.addWidget("text", "target", this.properties.target, function (v) { this.properties.target = v; }.bind(this));
  }
  FollowersOrderAttack.title = "Followers: Order Attack";
  FollowersOrderAttack.desc = "Ess.Easy.Followers.orderAttack(target) -- commands the WHOLE current roster at once, no guids list needed. Auto-resumes Follow the moment target dies.";
  FollowersOrderAttack.prototype.onAction = function () {
    var target = CodeGen.resolveNumberInput(this, 1, "target");
    CodeGen.emit("Ess.Easy.Followers.orderAttack(" + target + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/followers/orderattack", FollowersOrderAttack);

  // ============================================================
  // Ess/Followers/OrderPatrol -- Ess.Easy.Followers.orderPatrol(points)
  // ============================================================
  function FollowersOrderPatrol() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("points", "string");
    this.addProperty("points", "{ {0,0,0}, {10,0,10} }");
    this.addWidget("text", "points", this.properties.points, function (v) { this.properties.points = v; }.bind(this));
  }
  FollowersOrderPatrol.title = "Followers: Order Patrol";
  FollowersOrderPatrol.desc = "Ess.Easy.Followers.orderPatrol(points) -- commands the whole current roster to walk a route. Auto-resumes Follow once every follower finishes a non-looping route.";
  FollowersOrderPatrol.prototype.onAction = function () {
    var points = CodeGen.resolveNumberInput(this, 1, "points");
    CodeGen.emit("Ess.Easy.Followers.orderPatrol(" + points + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/followers/orderpatrol", FollowersOrderPatrol);

  // ============================================================
  // Ess/Followers/OrderGuard -- Ess.Easy.Followers.orderGuard(at)
  // ============================================================
  function FollowersOrderGuard() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("at", "string");
    this.addProperty("at", "{0,0,0}");
    this.addWidget("text", "at", this.properties.at, function (v) { this.properties.at = v; }.bind(this));
  }
  FollowersOrderGuard.title = "Followers: Order Guard";
  FollowersOrderGuard.desc = "Ess.Easy.Followers.orderGuard(at) -- commands the whole current roster to hold a position and fight anything inside it. No natural \"done\" -- stays on guard until you order something else.";
  FollowersOrderGuard.prototype.onAction = function () {
    var at = CodeGen.resolveNumberInput(this, 1, "at");
    CodeGen.emit("Ess.Easy.Followers.orderGuard(" + at + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/followers/orderguard", FollowersOrderGuard);

  // ============================================================
  // Ess/Followers/SetMarkersEnabled -- Ess.Followers.setMarkersEnabled(bOn). ON by default (see the Lua
  // module's own header) -- wire this to explicitly turn markers off, or back on after turning them off.
  // ============================================================
  function FollowersSetMarkersEnabled() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("enabled", true);
    this.addWidget("toggle", "enabled", this.properties.enabled, function (v) { this.properties.enabled = v; }.bind(this));
  }
  FollowersSetMarkersEnabled.title = "Followers: Set Markers Enabled";
  FollowersSetMarkersEnabled.desc = "Ess.Followers.setMarkersEnabled(bOn) -- per-follower world markers + order-destination markers are ON by default; this toggles them off (or back on).";
  FollowersSetMarkersEnabled.prototype.onAction = function () {
    CodeGen.emit("Ess.Followers.setMarkersEnabled(" + (this.properties.enabled ? "true" : "false") + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/followers/setmarkersenabled", FollowersSetMarkersEnabled);

  // ============================================================
  // Ess/Followers/IsFollower -- pure data. Ess.Followers.isFollower(guid) -> true/false expression, e.g.
  // for a Compare/Branch condition.
  // ============================================================
  function FollowersIsFollower() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("isFollower", "string");
  }
  FollowersIsFollower.title = "Followers: Is Follower";
  FollowersIsFollower.desc = "Ess.Followers.isFollower(guid) -- true/false, e.g. wire into a Compare/Branch condition.";
  FollowersIsFollower.prototype.onExecute = function () {
    var guid = CodeGen.resolveNumberInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Followers.isFollower(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/followers/isfollower", FollowersIsFollower);

  // ============================================================
  // Ess/Followers/Count -- pure data. Ess.Followers.count() -> how many followers are currently recruited.
  // ============================================================
  function FollowersCount() {
    this.addOutput("count", "number");
  }
  FollowersCount.title = "Followers: Count";
  FollowersCount.desc = "Ess.Followers.count() -- how many followers are currently recruited.";
  FollowersCount.prototype.onExecute = function () {
    this.setOutputData(0, "Ess.Followers.count()");
  };
  LiteGraph.registerNodeType("ess/followers/count", FollowersCount);

  // ============================================================
  // Ess/Followers/GuardMyPosition -- "visual compactor": Player: Get Position + Combine Coordinates +
  // Followers: Order Guard, collapsed into one node -- orders the whole current roster to guard wherever
  // the player is standing THIS TICK, no position wiring needed.
  // ============================================================
  function FollowersGuardMyPosition() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
  }
  FollowersGuardMyPosition.title = "Followers: Guard My Position";
  FollowersGuardMyPosition.desc = "\"Visual compactor\" for Player: Get Position -> Combine Coordinates -> Followers: Order Guard -- orders the whole current roster to guard wherever the player is standing right now.";
  FollowersGuardMyPosition.prototype.onAction = function () {
    var pxVar = CodeGen.newLocal("gpx");
    var pyVar = CodeGen.newLocal("gpy");
    var pzVar = CodeGen.newLocal("gpz");
    CodeGen.emit("local " + pxVar + ", " + pyVar + ", " + pzVar + " = Ess.Player.pose(0)");
    CodeGen.emit("Ess.Easy.Followers.orderGuard({x=" + pxVar + ", y=" + pyVar + ", z=" + pzVar + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/followers/guardmyposition", FollowersGuardMyPosition);

  // ============================================================
  // Ess/Followers/PatrolAroundMe -- "visual compactor": builds a 4-corner box patrol route around wherever
  // the player is standing THIS TICK (radius on each axis) and orders the whole current roster to patrol
  // it -- replaces hand-typing a "{ {x=...}, {x=...}, ... }" points table, the exact pain point this tool's
  // own boilerplate graphs kept hitting.
  // ============================================================
  function FollowersPatrolAroundMe() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("radius", 8);
    this.addWidget("number", "radius", this.properties.radius, function (v) { this.properties.radius = v; }.bind(this));
  }
  FollowersPatrolAroundMe.title = "Followers: Patrol Around Me";
  FollowersPatrolAroundMe.desc = "\"Visual compactor\" -- builds a 4-corner box patrol route (radius on each axis) around wherever the player is standing right now, and orders the whole current roster to patrol it.";
  FollowersPatrolAroundMe.prototype.onAction = function () {
    var pxVar = CodeGen.newLocal("ppx");
    var pyVar = CodeGen.newLocal("ppy");
    var pzVar = CodeGen.newLocal("ppz");
    CodeGen.emit("local " + pxVar + ", " + pyVar + ", " + pzVar + " = Ess.Player.pose(0)");
    var r = this.properties.radius;
    var pts = "{ {x=" + pxVar + "-" + r + ", y=" + pyVar + ", z=" + pzVar + "-" + r + "}, " +
      "{x=" + pxVar + "+" + r + ", y=" + pyVar + ", z=" + pzVar + "-" + r + "}, " +
      "{x=" + pxVar + "+" + r + ", y=" + pyVar + ", z=" + pzVar + "+" + r + "}, " +
      "{x=" + pxVar + "-" + r + ", y=" + pyVar + ", z=" + pzVar + "+" + r + "} }";
    CodeGen.emit("Ess.Easy.Followers.orderPatrol(" + pts + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/followers/patrolaroundme", FollowersPatrolAroundMe);
})();
