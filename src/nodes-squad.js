/* nodes-squad.js -- ess/squad/* nodes: Ess.Squad (mercs2-lua-essentials), the opt-in team/role layer over
 * Ess.Followers for scripts managing enough followers that "the whole roster" stops being the right unit of
 * command. A team NAME is always a plain string (quoted via CodeGen.luaString, like Followers: Order
 * Enter's "role" combo), never a raw wired expression -- teams are design-time identifiers, not computed
 * guids -- so every node below gives it a plain text widget with no input slot, same as that "role" field.
 *
 * Two multi-part API shapes needed their own small builder nodes rather than a raw-text property, matching
 * how this repo already solved that (see flow/combinelist4's own header): guids/steps lists still lean on
 * the existing Combine List (4) node (wire up to four Squad: Queue Step / captured-guid outputs into it),
 * and Squad: Queue Step itself builds ONE step table from a behavior combo + a raw-text opts table, the
 * same "type the nested table by hand" concession Combine List (4) already accepts for now.
 *
 * Squad: Queue's "on complete" is the SAME wired-output-else-falls-back-to-text-elsewhere pattern Loop:
 * Start's "on tick" established (see nodes-utility.js) -- a real exec sub-chain captured via
 * CodeGen.pushScope()/popScope() and wrapped in a Lua closure at emit time, not inlined.
 *
 * "Simple helpers" compactor nodes live at the bottom (addtoteam/guardteamhere/patrolteamaroundme) --
 * same rationale as nodes-followers.js's own guardmyposition/patrolaroundme and nodes-object.js's
 * SpawnFriendlyUnit: collapsing a hand-typed multi-line/multi-node chain into one node that does the whole
 * thing, still spliced as plain Lua text like everything else here.
 */
(function () {
  "use strict";

  var BEHAVIORS = ["move", "face", "hold", "defend", "attack", "patrol", "follow", "flee", "enter", "deploy", "animate"];

  // ============================================================
  // Ess/Squad/CreateTeam -- Ess.Squad.createTeam(teamName, guids)
  // ============================================================
  function SquadCreateTeam() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
    this.addInput("guids", "string");
    this.addProperty("guids", "{}");
    this.addWidget("text", "guids", this.properties.guids, function (v) { this.properties.guids = v; }.bind(this));
  }
  SquadCreateTeam.title = "Squad: Create Team";
  SquadCreateTeam.desc = "Ess.Squad.createTeam(team, guids) -- (re)defines a team's membership from a guid list (wire Combine List (4) for up to four captured guids). Non-followers are silently dropped -- recruit() them first.";
  SquadCreateTeam.prototype.onAction = function () {
    var guids = CodeGen.resolveNumberInput(this, 1, "guids");
    CodeGen.emit("Ess.Squad.createTeam(" + CodeGen.luaString(this.properties.team) + ", " + guids + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/createteam", SquadCreateTeam);

  // ============================================================
  // Ess/Squad/AssignRole -- Ess.Squad.assignRole(guid, roleType). Only "driver" has any behavioral effect
  // today (Squad: Mount Up boards a role="driver" guid first) -- the rest are descriptive labels a script
  // can read back with Squad: Role Of, same as the free-form string the Lua side accepts.
  // ============================================================
  function SquadAssignRole() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("role", "driver");
    this.addWidget("combo", "role", this.properties.role, function (v) { this.properties.role = v; }.bind(this), { values: ["driver", "passenger", "heavy", "marksman", "demolitions"] });
  }
  SquadAssignRole.title = "Squad: Assign Role";
  SquadAssignRole.desc = "Ess.Squad.assignRole(guid, roleType) -- \"driver\" is the one value Squad: Mount Up actually reads; everything else is a label your own graph can check back via Squad: Role Of.";
  SquadAssignRole.prototype.onAction = function () {
    var guid = CodeGen.resolveNumberInput(this, 1, "guid");
    CodeGen.emit("Ess.Squad.assignRole(" + guid + ", " + CodeGen.luaString(this.properties.role) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/assignrole", SquadAssignRole);

  // ============================================================
  // Ess/Squad/OrderTeamAttack -- Ess.Squad.orderTeam(team, "attack", {target=target})
  // ============================================================
  function SquadOrderTeamAttack() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
    this.addInput("target", "string");
    this.addProperty("target", "Ess.Player.character(0)");
    this.addWidget("text", "target", this.properties.target, function (v) { this.properties.target = v; }.bind(this));
  }
  SquadOrderTeamAttack.title = "Squad: Order Team Attack";
  SquadOrderTeamAttack.desc = "Ess.Squad.orderTeam(team, 'attack', {target=target}) -- commands just this team, leaving every other team (and any un-teamed follower) undisturbed. Auto-resumes Follow the moment target dies.";
  SquadOrderTeamAttack.prototype.onAction = function () {
    var target = CodeGen.resolveNumberInput(this, 1, "target");
    CodeGen.emit("Ess.Squad.orderTeam(" + CodeGen.luaString(this.properties.team) + ", 'attack', {target=" + target + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/orderteamattack", SquadOrderTeamAttack);

  // ============================================================
  // Ess/Squad/OrderTeamPatrol -- Ess.Squad.orderTeam(team, "patrol", {points=points})
  // ============================================================
  function SquadOrderTeamPatrol() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
    this.addInput("points", "string");
    this.addProperty("points", "{ {0,0,0}, {10,0,10} }");
    this.addWidget("text", "points", this.properties.points, function (v) { this.properties.points = v; }.bind(this));
  }
  SquadOrderTeamPatrol.title = "Squad: Order Team Patrol";
  SquadOrderTeamPatrol.desc = "Ess.Squad.orderTeam(team, 'patrol', {points=points}) -- commands just this team to walk a route.";
  SquadOrderTeamPatrol.prototype.onAction = function () {
    var points = CodeGen.resolveNumberInput(this, 1, "points");
    CodeGen.emit("Ess.Squad.orderTeam(" + CodeGen.luaString(this.properties.team) + ", 'patrol', {points=" + points + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/orderteampatrol", SquadOrderTeamPatrol);

  // ============================================================
  // Ess/Squad/OrderTeamGuard -- Ess.Squad.orderTeam(team, "defend", {at=at})
  // ============================================================
  function SquadOrderTeamGuard() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
    this.addInput("at", "string");
    this.addProperty("at", "{0,0,0}");
    this.addWidget("text", "at", this.properties.at, function (v) { this.properties.at = v; }.bind(this));
  }
  SquadOrderTeamGuard.title = "Squad: Order Team Guard";
  SquadOrderTeamGuard.desc = "Ess.Squad.orderTeam(team, 'defend', {at=at}) -- commands just this team to hold a position. No natural \"done\" -- stays on guard until ordered elsewhere.";
  SquadOrderTeamGuard.prototype.onAction = function () {
    var at = CodeGen.resolveNumberInput(this, 1, "at");
    CodeGen.emit("Ess.Squad.orderTeam(" + CodeGen.luaString(this.properties.team) + ", 'defend', {at=" + at + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/orderteamguard", SquadOrderTeamGuard);

  // ============================================================
  // Ess/Squad/OrderTeamFollow -- Ess.Squad.orderTeam(team, "follow", {})
  // ============================================================
  function SquadOrderTeamFollow() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
  }
  SquadOrderTeamFollow.title = "Squad: Order Team Follow";
  SquadOrderTeamFollow.desc = "Ess.Squad.orderTeam(team, 'follow', {}) -- puts just this team back into regular Follow. The explicit way back for guard/hold/a looping patrol.";
  SquadOrderTeamFollow.prototype.onAction = function () {
    CodeGen.emit("Ess.Squad.orderTeam(" + CodeGen.luaString(this.properties.team) + ", 'follow', {})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/orderteamfollow", SquadOrderTeamFollow);

  // ============================================================
  // Ess/Squad/TeamOf -- pure data. Ess.Squad.teamOf(guid) -> team name string, or nil if never assigned.
  // ============================================================
  function SquadTeamOf() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("team", "string");
  }
  SquadTeamOf.title = "Squad: Team Of";
  SquadTeamOf.desc = "Ess.Squad.teamOf(guid) -- which team this guid was last assigned to (nil if never), e.g. for a Compare/Branch condition.";
  SquadTeamOf.prototype.onExecute = function () {
    var guid = CodeGen.resolveNumberInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Squad.teamOf(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/squad/teamof", SquadTeamOf);

  // ============================================================
  // Ess/Squad/RoleOf -- pure data. Ess.Squad.roleOf(guid) -> role string, or nil if never assigned.
  // ============================================================
  function SquadRoleOf() {
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addOutput("role", "string");
  }
  SquadRoleOf.title = "Squad: Role Of";
  SquadRoleOf.desc = "Ess.Squad.roleOf(guid) -- the role last assigned via Squad: Assign Role (nil if never).";
  SquadRoleOf.prototype.onExecute = function () {
    var guid = CodeGen.resolveNumberInput(this, 0, "guid");
    this.setOutputData(0, "Ess.Squad.roleOf(" + guid + ")");
  };
  LiteGraph.registerNodeType("ess/squad/roleof", SquadRoleOf);

  // ============================================================
  // Ess/Squad/QueueStep -- builds ONE { behavior=, opts=, timeout= } step table for Squad: Queue. An ACTION
  // node (not pure data) for the same ordering reason as Combine List (4)/Offset Number -- opts may
  // reference a guid captured earlier in the SAME exec chain (e.g. an attack step's target), which only
  // exists once that capturing node has actually run.
  // ============================================================
  function SquadQueueStep() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("behavior", "move");
    this.addWidget("combo", "behavior", this.properties.behavior, function (v) { this.properties.behavior = v; }.bind(this), { values: BEHAVIORS });
    this.addInput("opts", "string");
    this.addProperty("opts", "{}");
    this.addWidget("text", "opts", this.properties.opts, function (v) { this.properties.opts = v; }.bind(this));
    this.addInput("timeout", "number");
    this.addProperty("timeout", 30);
    this.addWidget("number", "timeout", this.properties.timeout, function (v) { this.properties.timeout = v; }.bind(this));
    this.addOutput("step", "string");
  }
  SquadQueueStep.title = "Squad: Queue Step";
  SquadQueueStep.desc = "Builds one { behavior=, opts=, timeout= } step for Squad: Queue -- opts is the same table shape Ess.AIOrders.command/Squad: Order Team already take (e.g. {at={0,0,0}} for move, {target=...} for attack). Combine several with Combine List (4).";
  SquadQueueStep.prototype.onAction = function () {
    var opts = CodeGen.resolveNumberInput(this, 1, "opts");
    var timeout = CodeGen.resolveNumberInput(this, 2, "timeout");
    this.setOutputData(1, "{behavior=" + CodeGen.luaString(this.properties.behavior) + ", opts=" + opts + ", timeout=" + timeout + "}");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/queuestep", SquadQueueStep);

  // ============================================================
  // Ess/Squad/Queue -- Ess.Squad.queue(team, steps, {onComplete=...}). Wire "on complete" for a real exec
  // chain once every step finishes -- same wired-output-else-text-fallback shape as Loop: Start's "on tick"
  // (see nodes-utility.js), except there's no raw-text fallback here since a queue's whole point is the
  // step sequence, not a one-off completion action; leave "on complete" unwired if you don't need one.
  // ============================================================
  function SquadQueue() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
    this.addInput("steps", "string");
    this.addProperty("steps", "{}");
    this.addWidget("text", "steps", this.properties.steps, function (v) { this.properties.steps = v; }.bind(this));
    this.addOutput("on complete", LiteGraph.EVENT);
  }
  SquadQueue.title = "Squad: Queue";
  SquadQueue.desc = "Ess.Squad.queue(team, steps, opts) -- runs a multi-step sequence (build each step with Squad: Queue Step, combine with Combine List (4)). Every step also gets its own timeout watchdog, so one stuck unit can't freeze the whole thing.";
  SquadQueue.prototype.onAction = function () {
    var steps = CodeGen.resolveNumberInput(this, 1, "steps");
    var team = CodeGen.luaString(this.properties.team);
    var onCompleteSlot = this.outputs[1];
    var isWired = onCompleteSlot && onCompleteSlot.links && onCompleteSlot.links.length > 0;
    if (isWired) {
      CodeGen.pushScope();
      this.triggerSlot(1);
      var bodyLines = CodeGen.popScope();
      var fnVar = CodeGen.newLocal("onQueueDone");
      CodeGen.emit("local function " + fnVar + "()");
      CodeGen.emitLines(bodyLines);
      CodeGen.emit("end");
      CodeGen.emit("Ess.Squad.queue(" + team + ", " + steps + ", {onComplete = " + fnVar + "})");
    } else {
      CodeGen.emit("Ess.Squad.queue(" + team + ", " + steps + ")");
    }
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/queue", SquadQueue);

  // ============================================================
  // Ess/Squad/CancelQueue -- Ess.Squad.cancelQueue(team) -- aborts the currently-running step and reverts
  // the team to Follow, its documented safe fallback.
  // ============================================================
  function SquadCancelQueue() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
  }
  SquadCancelQueue.title = "Squad: Cancel Queue";
  SquadCancelQueue.desc = "Ess.Squad.cancelQueue(team) -- aborts the currently-running step and reverts the team to Follow.";
  SquadCancelQueue.prototype.onAction = function () {
    CodeGen.emit("Ess.Squad.cancelQueue(" + CodeGen.luaString(this.properties.team) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/cancelqueue", SquadCancelQueue);

  // ============================================================
  // Ess/Squad/MountUp -- Ess.Squad.Tactics.mountUp(vehGuid, team, {passengerRole=...}). Whoever's Squad:
  // Assign Role'd "driver" among the team boards first, as driver; everyone else boards as passengerRole.
  // ============================================================
  function SquadMountUp() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("vehicle", "string");
    this.addProperty("vehicle", "Ess.Player.inVehicle(0)");
    this.addWidget("text", "vehicle", this.properties.vehicle, function (v) { this.properties.vehicle = v; }.bind(this));
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
    this.addProperty("passengerRole", "passenger");
    this.addWidget("combo", "passengerRole", this.properties.passengerRole, function (v) { this.properties.passengerRole = v; }.bind(this), { values: ["passenger", "gunner"] });
  }
  SquadMountUp.title = "Squad: Mount Up";
  SquadMountUp.desc = "Ess.Squad.Tactics.mountUp(vehicle, team, {passengerRole=...}) -- role-aware boarding: the assignRole(guid,'driver') guid(s) board first as driver, everyone else as passengerRole. Fires \"onVehicleMounted\" once everyone's seated (or gives up silently if the vehicle's full/blocked).";
  SquadMountUp.prototype.onAction = function () {
    var vehicle = CodeGen.resolveNumberInput(this, 1, "vehicle");
    CodeGen.emit("Ess.Squad.Tactics.mountUp(" + vehicle + ", " + CodeGen.luaString(this.properties.team) + ", {passengerRole=" + CodeGen.luaString(this.properties.passengerRole) + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/mountup", SquadMountUp);

  // ============================================================
  // Ess/Squad/DismountAndSecure -- Ess.Squad.Tactics.dismountAndSecure(team, atPos, radius). Ejects
  // passengers via Deploy AND explicitly exits whoever's still driving (CONFIRMED LIVE: Deploy alone leaves
  // the driver seated), then holds a defend perimeter at atPos.
  // ============================================================
  function SquadDismountAndSecure() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
    this.addInput("at", "string");
    this.addProperty("at", "{0,0,0}");
    this.addWidget("text", "at", this.properties.at, function (v) { this.properties.at = v; }.bind(this));
    this.addInput("radius", "number");
    this.addProperty("radius", 15);
    this.addWidget("number", "radius", this.properties.radius, function (v) { this.properties.radius = v; }.bind(this));
  }
  SquadDismountAndSecure.title = "Squad: Dismount And Secure";
  SquadDismountAndSecure.desc = "Ess.Squad.Tactics.dismountAndSecure(team, at, radius) -- disembarks the whole team (driver included) from whatever vehicle(s) it's riding, then holds a defend perimeter at `at`.";
  SquadDismountAndSecure.prototype.onAction = function () {
    var at = CodeGen.resolveNumberInput(this, 1, "at");
    var radius = CodeGen.resolveNumberInput(this, 2, "radius");
    CodeGen.emit("Ess.Squad.Tactics.dismountAndSecure(" + CodeGen.luaString(this.properties.team) + ", " + at + ", " + radius + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/dismountandsecure", SquadDismountAndSecure);

  // ============================================================
  // Ess/Squad/SetFormation -- Ess.Squad.setFormation(team, formationType, {spacing=...}). Explicitly
  // "visual sugar" (see the Lua module's own header) -- a wedge/column/line/diamond of units walking to
  // staggered waypoints around the leader (default the local player), not a precision tactical system.
  // ============================================================
  function SquadSetFormation() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
    this.addProperty("formation", "wedge");
    this.addWidget("combo", "formation", this.properties.formation, function (v) { this.properties.formation = v; }.bind(this), { values: ["wedge", "column", "line", "diamond"] });
    this.addInput("spacing", "number");
    this.addProperty("spacing", 3);
    this.addWidget("number", "spacing", this.properties.spacing, function (v) { this.properties.spacing = v; }.bind(this));
  }
  SquadSetFormation.title = "Squad: Set Formation";
  SquadSetFormation.desc = "Ess.Squad.setFormation(team, formation, {spacing=...}) -- \"visual sugar\": the team walks staggered waypoints around the local player, recomputed every tick as they move/turn. Not a precision tactical system.";
  SquadSetFormation.prototype.onAction = function () {
    var spacing = CodeGen.resolveNumberInput(this, 1, "spacing");
    CodeGen.emit("Ess.Squad.setFormation(" + CodeGen.luaString(this.properties.team) + ", " + CodeGen.luaString(this.properties.formation) + ", {spacing=" + spacing + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/setformation", SquadSetFormation);

  // ============================================================
  // Ess/Squad/ClearFormation -- Ess.Squad.clearFormation(team) -- stops the formation loop, freezing the
  // team wherever they currently stand (does NOT auto-resume Follow -- wire Squad: Order Team Follow after
  // this if that's what should happen next).
  // ============================================================
  function SquadClearFormation() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
  }
  SquadClearFormation.title = "Squad: Clear Formation";
  SquadClearFormation.desc = "Ess.Squad.clearFormation(team) -- stops the formation loop, freezing the team wherever they currently stand. Wire Squad: Order Team Follow afterward if they should resume following.";
  SquadClearFormation.prototype.onAction = function () {
    CodeGen.emit("Ess.Squad.clearFormation(" + CodeGen.luaString(this.properties.team) + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/clearformation", SquadClearFormation);

  // ============================================================
  // Ess/Squad/AddToTeam -- "visual compactor": Followers: Recruit + (read current team, append, Squad:
  // Create Team) collapsed into one node -- the common "spawn a friendly unit, add it to my squad" workflow
  // one guid at a time, without needing to re-list every existing member through a Combine List each time.
  // ============================================================
  function SquadAddToTeam() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addInput("guid", "string");
    this.addProperty("guid", "Ess.Player.character(0)");
    this.addWidget("text", "guid", this.properties.guid, function (v) { this.properties.guid = v; }.bind(this));
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
  }
  SquadAddToTeam.title = "Squad: Add To Team";
  SquadAddToTeam.desc = "\"Visual compactor\" for Followers: Recruit -> (read the team's current members, append this guid, Squad: Create Team) -- add one unit to a squad without re-listing everyone already on it.";
  SquadAddToTeam.prototype.onAction = function () {
    var guid = CodeGen.resolveNumberInput(this, 1, "guid");
    var team = CodeGen.luaString(this.properties.team);
    var listVar = CodeGen.newLocal("teamList");
    CodeGen.emit("Ess.Followers.recruit(" + guid + ")");
    CodeGen.emit("local " + listVar + " = Ess.Squad.team(" + team + ")");
    CodeGen.emit("table.insert(" + listVar + ", " + guid + ")");
    CodeGen.emit("Ess.Squad.createTeam(" + team + ", " + listVar + ")");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/addtoteam", SquadAddToTeam);

  // ============================================================
  // Ess/Squad/GuardTeamHere -- "visual compactor": Player: Get Position + Squad: Order Team Guard, scoped
  // to one team -- see nodes-followers.js's FollowersGuardMyPosition for the whole-roster version this
  // mirrors.
  // ============================================================
  function SquadGuardTeamHere() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
  }
  SquadGuardTeamHere.title = "Squad: Guard Team Here";
  SquadGuardTeamHere.desc = "\"Visual compactor\" for Player: Get Position -> Combine Coordinates -> Squad: Order Team Guard -- orders just this team to guard wherever the player is standing right now.";
  SquadGuardTeamHere.prototype.onAction = function () {
    var pxVar = CodeGen.newLocal("sqgpx");
    var pyVar = CodeGen.newLocal("sqgpy");
    var pzVar = CodeGen.newLocal("sqgpz");
    CodeGen.emit("local " + pxVar + ", " + pyVar + ", " + pzVar + " = Ess.Player.pose(0)");
    CodeGen.emit("Ess.Squad.orderTeam(" + CodeGen.luaString(this.properties.team) + ", 'defend', {at={x=" + pxVar + ", y=" + pyVar + ", z=" + pzVar + "}})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/guardteamhere", SquadGuardTeamHere);

  // ============================================================
  // Ess/Squad/PatrolTeamAroundMe -- "visual compactor": builds a 4-corner box patrol route around wherever
  // the player is standing THIS TICK and orders just this team to patrol it -- see nodes-followers.js's
  // FollowersPatrolAroundMe for the whole-roster version this mirrors.
  // ============================================================
  function SquadPatrolTeamAroundMe() {
    this.addInput("exec", LiteGraph.ACTION);
    this.addOutput("then", LiteGraph.EVENT);
    this.addProperty("team", "Alpha");
    this.addWidget("text", "team", this.properties.team, function (v) { this.properties.team = v; }.bind(this));
    this.addProperty("radius", 8);
    this.addWidget("number", "radius", this.properties.radius, function (v) { this.properties.radius = v; }.bind(this));
  }
  SquadPatrolTeamAroundMe.title = "Squad: Patrol Team Around Me";
  SquadPatrolTeamAroundMe.desc = "\"Visual compactor\" -- builds a 4-corner box patrol route (radius on each axis) around wherever the player is standing right now, and orders just this team to patrol it.";
  SquadPatrolTeamAroundMe.prototype.onAction = function () {
    var pxVar = CodeGen.newLocal("sqppx");
    var pyVar = CodeGen.newLocal("sqppy");
    var pzVar = CodeGen.newLocal("sqppz");
    CodeGen.emit("local " + pxVar + ", " + pyVar + ", " + pzVar + " = Ess.Player.pose(0)");
    var r = this.properties.radius;
    var pts = "{ {x=" + pxVar + "-" + r + ", y=" + pyVar + ", z=" + pzVar + "-" + r + "}, " +
      "{x=" + pxVar + "+" + r + ", y=" + pyVar + ", z=" + pzVar + "-" + r + "}, " +
      "{x=" + pxVar + "+" + r + ", y=" + pyVar + ", z=" + pzVar + "+" + r + "}, " +
      "{x=" + pxVar + "-" + r + ", y=" + pyVar + ", z=" + pzVar + "+" + r + "} }";
    CodeGen.emit("Ess.Squad.orderTeam(" + CodeGen.luaString(this.properties.team) + ", 'patrol', {points=" + pts + "})");
    this.triggerSlot(0);
  };
  LiteGraph.registerNodeType("ess/squad/patrolteamaroundme", SquadPatrolTeamAroundMe);
})();
