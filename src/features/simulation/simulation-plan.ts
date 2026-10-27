/* simulation-plan.ts — deterministic plan construction and failure injection. */

import {
  generateAreaScan,
  getAreaFlightAltitudeM,
  getMissionHome,
  getMissionRouteWaypoints,
  getMissionRoutes,
  getMissionSequence,
  getMissionStart,
  generateAreaTraversal,
  isValidRing,
  normalizeMissionRoutes,
  type EnuVec,
  type StudioMission,
} from "../../domain/mission-model";
import { computeDerivedTransfers } from "../../domain/transfer-planner";
import type { SimEventItem, SimLeg, SimPlan } from "./simulation-types";

const DWELL_S: Record<string, number> = {
  photo: 1.5,
  "lidar-scan": 2,
  "video-start": 0,
  "video-stop": 0,
};

function pushLeg(
  legs: SimLeg[],
  clock: { t: number },
  from: EnuVec,
  to: EnuVec,
  speed: number,
  seq: number | null,
  dwell: number,
): void {
  const len = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  const move = speed > 0 ? len / speed : 0;
  const leg: SimLeg = {
    ax: from.x,
    ay: from.y,
    az: from.z,
    bx: to.x,
    by: to.y,
    bz: to.z,
    len,
    t0: clock.t,
    t1: clock.t + move,
    dwell,
    seq,
  };
  legs.push(leg);
  clock.t = clock.t + move + dwell;
}

export function buildSimPlan(
  mission: StudioMission,
  options: { includePhotoCaptureDwell?: boolean } = {},
): SimPlan | null {
  const norm = normalizeMissionRoutes(mission);
  const routeMetas = getMissionRoutes(norm);
  const routes = routeMetas.filter((route) =>
    norm.waypoints.some(
      (w) =>
        !w.generatedByArea &&
        !w.generatedByAvoid &&
        (w.routeId === route.id ||
          (!w.routeId && route.id === routeMetas[0]?.id)),
    ),
  );
  const transfers = computeDerivedTransfers(norm);

  // If any transfer between routes or areas is blocked, cannot build plan (no flight through Avoid)
  if (transfers.some((t) => t.blockedByAvoidId || t.errorMessage)) {
    return null;
  }

  const authored = norm.waypoints.filter(
    (w) => !w.generatedByArea && !w.generatedByAvoid,
  );
  const areas = (norm.areas ?? [])
    .filter((a) => isValidRing(a.points))
    .filter(
      (area) => (area.scanLines ?? generateAreaScan(area)).flat().length > 0,
    );
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const activeSequence = getMissionSequence(norm).filter((item) =>
    item.type === "route" ? routeById.has(item.id) : areaById.has(item.id),
  );
  if (authored.length < 2 && areas.length === 0) return null;

  const defaultSpeed = norm.targetSpeedMS > 0 ? norm.targetSpeedMS : 2;
  const legs: SimLeg[] = [];
  const events: SimEventItem[] = [];
  const clock = { t: 0 };
  // Home is the ground launch and landing point. Mission geometry starts at
  // waypoint 1 or the first Area scan point after take-off and transit.
  const start = getMissionStart(norm);
  const homeGround = getMissionHome(norm);
  const homeAir: EnuVec = { ...homeGround, z: Math.max(0, norm.takeoffAltM) };

  events.push({
    t: 0,
    kind: "takeoff",
    label: `Takeoff — climbing to ${homeAir.z} m at Home`,
  });
  pushLeg(legs, clock, homeGround, homeAir, Math.max(defaultSpeed, 1), null, 0);
  pushLeg(legs, clock, homeAir, start, defaultSpeed, null, 0);

  let prev: EnuVec = start;

  for (
    let blockIndex = 0;
    blockIndex < activeSequence.length;
    blockIndex += 1
  ) {
    const block = activeSequence[blockIndex];
    const route = block.type === "route" ? routeById.get(block.id) : undefined;
    const area = block.type === "area" ? areaById.get(block.id) : undefined;
    if (!route && !area) continue;

    const label = route?.label ?? area?.label ?? "mission block";
    const speed =
      route?.targetSpeedMS && route.targetSpeedMS > 0
        ? route.targetSpeedMS
        : defaultSpeed;
    if (blockIndex > 0) {
      const previous = activeSequence[blockIndex - 1];
      const transfer = transfers.find(
        (item) =>
          item.fromType === previous.type &&
          item.fromId === previous.id &&
          item.toType === block.type &&
          item.toId === block.id,
      );
      if (transfer && transfer.points.length >= 2) {
        events.push({
          t: clock.t,
          kind: "info",
          label: `Transfer to ${label}`,
        });
        for (
          let pointIndex = 1;
          pointIndex < transfer.points.length;
          pointIndex += 1
        ) {
          pushLeg(
            legs,
            clock,
            transfer.points[pointIndex - 1],
            transfer.points[pointIndex],
            speed,
            null,
            0,
          );
        }
        prev = transfer.points[transfer.points.length - 1];
      }
    }

    if (route) {
      const rWaypoints = getMissionRouteWaypoints(norm, route.id);
      for (const waypoint of rWaypoints) {
        const dwell = waypoint.actions.reduce(
          (n, action) =>
            n +
            (action.kind === "photo" &&
            options.includePhotoCaptureDwell === false
              ? 0
              : (DWELL_S[action.kind] ?? 0)),
          0,
        );
        pushLeg(legs, clock, prev, waypoint, speed, waypoint.seq, dwell);
        const arriveT = clock.t - dwell;
        events.push({
          t: arriveT,
          kind: "waypoint",
          label: `Waypoint ${waypoint.seq} reached`,
          seq: waypoint.seq,
          waypointId: waypoint.id,
        });
        for (const action of waypoint.actions) {
          events.push({
            t: arriveT,
            kind: "action",
            label: `${action.label} — waypoint ${waypoint.seq}`,
            seq: waypoint.seq,
            waypointId: waypoint.id,
            actionKind: action.kind,
          });
        }
        prev = { x: waypoint.x, y: waypoint.y, z: waypoint.z };
      }
      continue;
    }

    if (area) {
      const scanPoints = generateAreaTraversal(
        area,
        area.scanLines ?? generateAreaScan(area),
      );
      if (scanPoints.length === 0) continue;
      const generatedWaypoints = norm.waypoints
        .filter((waypoint) => waypoint.generatedByArea === area.id)
        .sort((a, b) => a.seq - b.seq);
      const areaAlt = getAreaFlightAltitudeM(
        area,
        norm.takeoffAltM,
        norm.worldType ?? "3D",
      );
      const areaTargets =
        generatedWaypoints.length > 0
          ? generatedWaypoints.map((waypoint) => ({
              waypoint,
              target: waypoint,
            }))
          : scanPoints.map((point) => ({
              waypoint: null,
              target: { x: point.x, y: point.y, z: areaAlt },
            }));
      for (const { waypoint, target } of areaTargets) {
        const actions = waypoint?.actions ?? [];
        const dwell = actions.reduce(
          (n, action) =>
            n +
            (action.kind === "photo" &&
            options.includePhotoCaptureDwell === false
              ? 0
              : (DWELL_S[action.kind] ?? 0)),
          0,
        );
        pushLeg(
          legs,
          clock,
          prev,
          target,
          defaultSpeed,
          waypoint?.seq ?? null,
          dwell,
        );
        if (waypoint) {
          const arriveT = clock.t - dwell;
          events.push({
            t: arriveT,
            kind: "waypoint",
            label: `Waypoint ${waypoint.seq} reached`,
            seq: waypoint.seq,
            waypointId: waypoint.id,
          });
          for (const action of actions) {
            events.push({
              t: arriveT,
              kind: "action",
              label: `${action.label} — waypoint ${waypoint.seq}`,
              seq: waypoint.seq,
              waypointId: waypoint.id,
              actionKind: action.kind,
            });
          }
        }
        prev = target;
      }
    }
  }

  if (norm.returnHomeOnEnd) {
    const homeAtCruise: EnuVec = {
      x: homeGround.x,
      y: homeGround.y,
      z: prev.z,
    };
    events.push({ t: clock.t, kind: "rtl", label: "END — Return home" });
    pushLeg(legs, clock, prev, homeAtCruise, defaultSpeed, null, 0);
    prev = homeAtCruise;
  }
  const landPosition: EnuVec = norm.returnHomeOnEnd
    ? homeGround
    : { x: prev.x, y: prev.y, z: 0 };
  pushLeg(legs, clock, prev, landPosition, Math.max(defaultSpeed, 1), null, 0);
  events.push({
    t: clock.t,
    kind: "land",
    label: norm.returnHomeOnEnd ? "Landed at Home" : "Landed at final position",
  });
  events.push({ t: clock.t, kind: "complete", label: "Mission run completed" });

  const failedAtSeq = 0;
  const totalDist = legs.reduce((n, l) => n + l.len, 0);
  events.sort((a, b) => a.t - b.t);
  return { legs, events, duration: clock.t, totalDist, failedAtSeq };
}

/** Apply the injected mock failure to a base plan (pure; keeps design intact). */
export function applyMockFailure(plan: SimPlan, seq: number): SimPlan {
  if (!(seq >= 1)) return plan;
  const arrival = plan.events.find(
    (e) => e.kind === "waypoint" && e.seq === seq,
  );
  if (!arrival) return plan;
  const failT = arrival.t + 0.5;
  const events = plan.events.filter(
    (e) => e.t <= failT && e.kind !== "complete",
  );
  events.push({
    t: failT,
    kind: "failure",
    label: `Test failure at waypoint ${seq} — run failed`,
    seq,
  });
  events.sort((a, b) => a.t - b.t);
  return { ...plan, events, duration: failT, failedAtSeq: seq };
}
