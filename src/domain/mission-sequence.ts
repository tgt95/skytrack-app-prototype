/* Route/Area sequence ordering for the Mission Studio domain.
   Types, defaults, and Recon canonicalization stay in `mission-types.ts`. */

import {
  canonicalizeReconSettings,
  type MissionRouteMeta,
  type MissionSequenceItem,
  type StudioMission,
  type Waypoint,
} from './mission-types'

export function renumber(waypoints: Waypoint[]): Waypoint[] {
  return waypoints.map((w, i) => ({ ...w, seq: i + 1 }))
}

/** Move waypoint `id` to final 0-based position `toIndex`, preserving ids,
    coordinates, actions and Area/Avoid provenance. Returns a renumbered list;
    the caller recomputes order-dependent detours once and commits through the
    existing undo/redo history. No-op (same array contents) when id is missing
    or already at `toIndex`. */
export function reorderWaypoints(
  waypoints: Waypoint[],
  id: string,
  toIndex: number,
): Waypoint[] {
  const from = waypoints.findIndex((w) => w.id === id)
  if (from < 0) return waypoints
  const at = Math.max(0, Math.min(toIndex, waypoints.length - 1))
  if (from === at) return waypoints
  const list = [...waypoints]
  const [moved] = list.splice(from, 1)
  list.splice(at, 0, moved)
  return renumber(list)
}

/** Normalize mission routes: ensures each authored waypoint is attributed
    to a valid Route block, defaulting legacy single-route waypoints to Route 1. */
export function normalizeMissionRoutes(mission: StudioMission): StudioMission {
  const authored = mission.waypoints.filter(
    (w) => !w.generatedByArea && !w.generatedByAvoid,
  )
  let routes = mission.routes
    ? mission.routes.map(canonicalizeReconSettings)
    : []
  if (routes.length === 0) {
    if (authored.length > 0) {
      routes = [
        { id: "route-1", label: "Route", targetSpeedMS: mission.targetSpeedMS },
      ]
    }
  }
  const validRouteIds = new Set(routes.map((r) => r.id))
  const defaultRouteId = routes[0]?.id ?? "route-1"
  const waypoints = mission.waypoints.map((w) => {
    if (w.generatedByArea || w.generatedByAvoid) return w
    if (!w.routeId || !validRouteIds.has(w.routeId)) {
      return { ...w, routeId: defaultRouteId }
    }
    return w
  })
  // Route metadata is a sequence block only while it owns authored geometry.
  // Old snapshots and hand-edited Code JSON can otherwise keep an empty Route
  // in the Design pane even though transfer planning and Preview omit it.
  routes = routes.filter((route, routeIndex) =>
    waypoints.some(
      (waypoint) =>
        !waypoint.generatedByArea &&
        !waypoint.generatedByAvoid &&
        (waypoint.routeId === route.id ||
          (!waypoint.routeId && routeIndex === 0)),
    ),
  )
  const activeRouteIds = new Set(routes.map((route) => route.id))
  const activeAreaIds = new Set((mission.areas ?? []).map((area) => area.id))
  const sequenceOrder = Array.isArray(mission.sequenceOrder)
    ? mission.sequenceOrder.filter((item) =>
        item?.type === "route"
          ? activeRouteIds.has(item.id)
          : item?.type === "area" && activeAreaIds.has(item.id),
      )
    : mission.sequenceOrder
  const areas = (mission.areas ?? []).map(canonicalizeReconSettings)
  return { ...mission, routes, areas, waypoints, sequenceOrder }
}

export function getMissionRoutes(mission: StudioMission): MissionRouteMeta[] {
  if (mission.routes && mission.routes.length > 0) return mission.routes
  const authored = mission.waypoints.filter(
    (w) => !w.generatedByArea && !w.generatedByAvoid,
  )
  if (authored.length > 0) {
    return [
      { id: "route-1", label: "Route", targetSpeedMS: mission.targetSpeedMS },
    ]
  }
  return []
}

/** Return authored waypoints for one Route in the same order shown by `seq`.
    Code snapshots can preserve array order while waypoint sequence changes. */
export function getMissionRouteWaypoints(
  mission: StudioMission,
  routeId: string,
): Waypoint[] {
  const routes = getMissionRoutes(mission)
  const routeIndex = routes.findIndex((route) => route.id === routeId)
  if (routeIndex < 0) return []
  return mission.waypoints
    .filter(
      (waypoint) =>
        !waypoint.generatedByArea &&
        !waypoint.generatedByAvoid &&
        (waypoint.routeId === routeId ||
          (!waypoint.routeId && routeIndex === 0)),
    )
    .sort((a, b) => a.seq - b.seq)
}

/** Return the mission's Route/Area block order. Legacy missions without the
    field retain their historical Route-first ordering. Missing references in
    newer snapshots are appended using that same stable fallback order. */
export function getMissionSequence(
  mission: StudioMission,
): MissionSequenceItem[] {
  const fallback: MissionSequenceItem[] = [
    ...getMissionRoutes(mission).map((route) => ({
      type: "route" as const,
      id: route.id,
    })),
    ...(mission.areas ?? []).map((area) => ({
      type: "area" as const,
      id: area.id,
    })),
  ];
  if (
    !Array.isArray(mission.sequenceOrder) ||
    mission.sequenceOrder.length === 0
  )
    return fallback;

  const valid = new Set<string>();
  for (const route of getMissionRoutes(mission)) valid.add(`route:${route.id}`);
  for (const area of mission.areas ?? []) valid.add(`area:${area.id}`);

  const ordered: MissionSequenceItem[] = [];
  const seen = new Set<string>();
  for (const item of mission.sequenceOrder) {
    if (
      (item?.type !== "route" && item?.type !== "area") ||
      typeof item.id !== "string"
    )
      continue;
    const key = `${item.type}:${item.id}`;
    if (!valid.has(key) || seen.has(key)) continue;
    seen.add(key);
    ordered.push({ type: item.type, id: item.id });
  }
  for (const item of fallback) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(item);
  }
  return ordered;
}

/** Append a newly created Route/Area to the saved block order exactly once. */
export function appendMissionSequenceItem(
  mission: StudioMission,
  item: MissionSequenceItem,
): MissionSequenceItem[] {
  const order = getMissionSequence(mission);
  return order.some((entry) => entry.type === item.type && entry.id === item.id)
    ? order
    : [...order, item];
}

/** Remove a deleted Route/Area from the explicit sequence. */
export function removeMissionSequenceItem(
  mission: StudioMission,
  item: MissionSequenceItem,
): MissionSequenceItem[] {
  return getMissionSequence(mission).filter(
    (entry) => !(entry.type === item.type && entry.id === item.id),
  );
}
