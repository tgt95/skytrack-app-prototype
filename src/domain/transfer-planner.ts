/* transfer-planner.ts — pure module for derived planner transfer paths
   between adjacent Route/Area mission blocks, with Avoid detour handling.
   No React, no Cesium. Prototype mock geometry only; not flight planning. */

import {
  avoidBaseM,
  avoidTopM,
  detourAroundAvoid,
  dist3,
  generateAreaScan,
  generateAreaTraversal,
  getMissionRouteWaypoints,
  getMissionSequence,
  getAreaFlightAltitudeM,
  isValidRing,
  type AvoidZone,
  type EnuPoint,
  type EnuVec,
  type MissionRouteMeta,
  type StudioMission,
  type ValidationIssue,
  type Waypoint,
} from "./mission-model";

export interface DerivedTransfer {
  id: string;
  fromType: "route" | "area";
  fromId: string;
  fromLabel: string;
  toType: "route" | "area";
  toId: string;
  toLabel: string;
  fromPoint: EnuVec;
  toPoint: EnuVec;
  points: EnuVec[];
  distanceM: number;
  hasDetour: boolean;
  blockedByAvoidId?: string;
  blockedAvoidLabel?: string;
  errorMessage?: string;
}

function pointInPolygon(p: EnuPoint, ring: EnuPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function segIntersectsSeg(
  a: EnuPoint,
  b: EnuPoint,
  c: EnuPoint,
  d: EnuPoint,
): boolean {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) < 1e-9) return false;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function polylineIntersectsRing(line: EnuPoint[], ring: EnuPoint[]): boolean {
  if (ring.length < 3) return false;
  for (const p of line) if (pointInPolygon(p, ring)) return true;
  for (let i = 1; i < line.length; i += 1) {
    for (let j = 0; j < ring.length; j += 1) {
      if (
        segIntersectsSeg(
          line[i - 1],
          line[i],
          ring[j],
          ring[(j + 1) % ring.length],
        )
      )
        return true;
    }
  }
  return false;
}

interface PlanLegResult {
  points: EnuVec[];
  hasDetour: boolean;
  blockedByAvoidId?: string;
  blockedAvoidLabel?: string;
}

/** Plan a transfer leg between two 3D positions, detouring around Avoid volumes
    using detourAroundAvoid where possible. If blocked by an Avoid volume and no
    clear detour is found, returns blocked info and empty points (never draws a straight
    line through the Avoid volume). */
export function planTransferLeg(
  a: EnuVec,
  b: EnuVec,
  avoids: AvoidZone[],
): PlanLegResult {
  const activeAvoids = avoids.filter(
    (o) => isValidRing(o.points) && avoidTopM(o) > 0,
  );

  // 1. Check if either endpoint is inside an Avoid volume
  for (const avoid of activeAvoids) {
    const top = avoidTopM(avoid);
    const base = avoidBaseM(avoid);
    if (
      a.z <= top &&
      a.z >= base &&
      pointInPolygon({ x: a.x, y: a.y }, avoid.points)
    ) {
      return {
        points: [],
        hasDetour: false,
        blockedByAvoidId: avoid.id,
        blockedAvoidLabel: avoid.label,
      };
    }
    if (
      b.z <= top &&
      b.z >= base &&
      pointInPolygon({ x: b.x, y: b.y }, avoid.points)
    ) {
      return {
        points: [],
        hasDetour: false,
        blockedByAvoidId: avoid.id,
        blockedAvoidLabel: avoid.label,
      };
    }
  }

  let pts: EnuVec[] = [a, b];
  let hasDetour = false;

  for (let pass = 0; pass < 4; pass += 1) {
    let insertedAny = false;
    for (const avoid of activeAvoids) {
      const top = avoidTopM(avoid);
      const base = avoidBaseM(avoid);
      const others = activeAvoids.filter((o) => o.id !== avoid.id);

      for (let k = 0; k < pts.length - 1; k += 1) {
        const segA = pts[k];
        const segB = pts[k + 1];
        if (Math.min(segA.z, segB.z) > top) continue;
        if (Math.max(segA.z, segB.z) < base) continue;
        if (
          !polylineIntersectsRing(
            [
              { x: segA.x, y: segA.y },
              { x: segB.x, y: segB.y },
            ],
            avoid.points,
          )
        )
          continue;

        const corners = detourAroundAvoid(segA, segB, avoid, others);
        if (!corners) {
          // Cannot find valid detour around this avoid
          return {
            points: [],
            hasDetour: false,
            blockedByAvoidId: avoid.id,
            blockedAvoidLabel: avoid.label,
          };
        }

        const z = Math.round(Math.max(segA.z, segB.z) * 100) / 100;
        const made: EnuVec[] = corners.map((c) => ({
          x: Math.round(c.x * 100) / 100,
          y: Math.round(c.y * 100) / 100,
          z,
        }));

        pts = [...pts.slice(0, k + 1), ...made, ...pts.slice(k + 1)];
        hasDetour = true;
        insertedAny = true;
        break; // Re-check legs in next iteration
      }
    }
    if (!insertedAny) break;
  }

  // Final check: ensure no remaining segment penetrates any active Avoid volume
  for (const avoid of activeAvoids) {
    const top = avoidTopM(avoid);
    const base = avoidBaseM(avoid);
    for (let k = 0; k < pts.length - 1; k += 1) {
      const segA = pts[k];
      const segB = pts[k + 1];
      if (Math.min(segA.z, segB.z) <= top && Math.max(segA.z, segB.z) >= base) {
        if (
          polylineIntersectsRing(
            [
              { x: segA.x, y: segA.y },
              { x: segB.x, y: segB.y },
            ],
            avoid.points,
          )
        ) {
          return {
            points: [],
            hasDetour: false,
            blockedByAvoidId: avoid.id,
            blockedAvoidLabel: avoid.label,
          };
        }
      }
    }
  }

  return { points: pts, hasDetour };
}

/** Compute transfer paths between adjacent Route/Area blocks in mission
    sequence order. Legacy missions without order metadata stay Route-first. */
export function computeDerivedTransfers(
  mission: StudioMission,
): DerivedTransfer[] {
  const avoids = mission.avoids ?? [];

  // Group authored waypoints by route
  const routes: { meta: MissionRouteMeta; waypoints: Waypoint[] }[] = [];
  const routeMetas =
    mission.routes && mission.routes.length > 0
      ? mission.routes
      : [
          {
            id: "route-1",
            label: "Route",
            targetSpeedMS: mission.targetSpeedMS,
          },
        ];

  for (const meta of routeMetas) {
    const wps = getMissionRouteWaypoints(mission, meta.id);
    if (wps.length > 0) routes.push({ meta, waypoints: wps });
  }

  const areas = (mission.areas ?? [])
    .filter((a) => isValidRing(a.points))
    .map((area) => ({
      area,
      scanPoints: generateAreaTraversal(
        area,
        area.scanLines ?? generateAreaScan(area),
      ),
      generatedWaypoints: mission.waypoints
        .filter((waypoint) => waypoint.generatedByArea === area.id)
        .sort((a, b) => a.seq - b.seq),
    }))
    .filter(({ scanPoints }) => scanPoints.length > 0);
  const routeById = new Map(routes.map((route) => [route.meta.id, route]));
  const areaById = new Map(areas.map((entry) => [entry.area.id, entry]));
  const activeSequence = getMissionSequence(mission).filter((item) =>
    item.type === "route" ? routeById.has(item.id) : areaById.has(item.id),
  );

  const endpoint = (
    item: { type: "route" | "area"; id: string },
    side: "start" | "end",
  ) => {
    if (item.type === "route") {
      const route = routeById.get(item.id);
      if (!route) return null;
      return side === "start"
        ? route.waypoints[0]
        : route.waypoints[route.waypoints.length - 1];
    }
    const entry = areaById.get(item.id);
    if (!entry) return null;
    const pointIndex = side === "start" ? 0 : entry.scanPoints.length - 1;
    const point = entry.scanPoints[pointIndex];
    const waypoint =
      side === "start"
        ? entry.generatedWaypoints[0]
        : entry.generatedWaypoints[entry.generatedWaypoints.length - 1];
    return {
      x: waypoint?.x ?? point.x,
      y: waypoint?.y ?? point.y,
      z:
        waypoint?.z ??
        getAreaFlightAltitudeM(
          entry.area,
          mission.takeoffAltM,
          mission.worldType ?? "3D",
        ),
    } satisfies EnuVec;
  };

  const labelFor = (item: { type: "route" | "area"; id: string }) =>
    item.type === "route"
      ? (routeById.get(item.id)?.meta.label ?? "Route")
      : (areaById.get(item.id)?.area.label ?? "Area");

  const transfers: DerivedTransfer[] = [];
  for (let i = 0; i < activeSequence.length - 1; i += 1) {
    const from = activeSequence[i];
    const to = activeSequence[i + 1];
    const fromPt = endpoint(from, "end");
    const toPt = endpoint(to, "start");
    if (!fromPt || !toPt) continue;

    const leg = planTransferLeg(fromPt, toPt, avoids);
    const dist =
      leg.points.length >= 2
        ? leg.points
            .slice(1)
            .reduce(
              (acc, point, index) => acc + dist3(leg.points[index], point),
              0,
            )
        : dist3(fromPt, toPt);
    const fromLabel = labelFor(from);
    const toLabel = labelFor(to);
    const id =
      from.type === "route" && to.type === "route"
        ? `transfer-route-${from.id}-${to.id}`
        : from.type === "route"
          ? `transfer-route-area-${from.id}-${to.id}`
          : to.type === "route"
            ? `transfer-area-route-${from.id}-${to.id}`
            : `transfer-area-${from.id}-${to.id}`;
    const transfer: DerivedTransfer = {
      id,
      fromType: from.type,
      fromId: from.id,
      fromLabel,
      toType: to.type,
      toId: to.id,
      toLabel,
      fromPoint: fromPt,
      toPoint: toPt,
      points: leg.points,
      distanceM: Math.round(dist * 10) / 10,
      hasDetour: leg.hasDetour,
      blockedByAvoidId: leg.blockedByAvoidId,
      blockedAvoidLabel: leg.blockedAvoidLabel,
    };
    if (leg.blockedByAvoidId) {
      transfer.errorMessage = `Transfer between ${fromLabel} and ${toLabel} enters Avoid volume “${leg.blockedAvoidLabel ?? "Avoid"}” and cannot be detoured.`;
    }
    transfers.push(transfer);
  }
  return transfers;
}

export function validateTransfers(mission: StudioMission): ValidationIssue[] {
  const transfers = computeDerivedTransfers(mission);
  const issues: ValidationIssue[] = [];
  for (const t of transfers) {
    if (t.errorMessage) {
      issues.push({
        id: `transfer-issue-${t.id}`,
        level: "error",
        message: t.errorMessage,
        target: t.blockedByAvoidId
          ? { kind: "avoid", id: t.blockedByAvoidId }
          : undefined,
      });
    }
  }
  return issues;
}
