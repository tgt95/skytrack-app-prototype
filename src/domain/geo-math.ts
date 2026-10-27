import {
  DEFAULT_MISSION_ORIGIN,
  getAreaFlightAltitudeM,
  type EnuVec,
  type GeoAttribution,
  type GeoOrigin,
  type StudioMission
} from './mission-types'
import {
  getMissionRoutes,
  getMissionRouteWaypoints,
  getMissionSequence
} from './mission-sequence'
import { generateAreaScan, generateAreaTraversal, isValidRing } from './area-scan'

/** True for a finite latitude/longitude pair usable as a mission origin. */
export function isValidGeoOrigin(value: unknown): value is GeoOrigin {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<GeoOrigin>
  return (
    typeof candidate.lat === 'number' &&
    Number.isFinite(candidate.lat) &&
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lng) &&
    candidate.lng >= -180 &&
    candidate.lng <= 180 &&
    (candidate.attribution === undefined || (
      typeof candidate.attribution === 'object' && candidate.attribution !== null &&
      typeof candidate.attribution.label === 'string' && candidate.attribution.label.trim().length > 0 &&
      typeof candidate.attribution.href === 'string' && isHttpsUrl(candidate.attribution.href)
    ))
  )
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** Effective geographic origin: the mission's own anchor, or the legacy
    default when absent/invalid. Never mutates the mission. */
export function missionOrigin(mission: Pick<StudioMission, 'origin'>): GeoOrigin {
  return isValidGeoOrigin(mission.origin)
    ? { lat: mission.origin.lat, lng: mission.origin.lng }
    : { ...DEFAULT_MISSION_ORIGIN }
}

const DEG_PER_M_LAT = 1 / 111320

function lonScaleForLat(lat: number): number {
  return 1 / (111320 * Math.cos((lat * Math.PI) / 180))
}

/* Small-area ENU/geographic conversion shared by the Cesium scene and the
   dormant Leaflet map. Always origin-aware; the default origin keeps legacy
   callers working. Inputs and output object shape stay unchanged. */
export function enuToLngLat(x: number, y: number, origin: GeoOrigin = missionOrigin({})): { lng: number; lat: number } {
  return { lng: origin.lng + x * lonScaleForLat(origin.lat), lat: origin.lat + y * DEG_PER_M_LAT }
}

export function lngLatToEnu(lng: number, lat: number, origin: GeoOrigin = missionOrigin({})): { x: number; y: number } {
  const scale = lonScaleForLat(origin.lat)
  return { x: (lng - origin.lng) / scale, y: (lat - origin.lat) / DEG_PER_M_LAT }
}

/** Shoelace polygon area in local ENU square meters. Returns 0 for rings with
    fewer than three points; absolute value keeps reversed rings positive. */
export function polygonAreaM2(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0
  let twiceArea = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    twiceArea += current.x * next.y - next.x * current.y
  }
  return Math.abs(twiceArea) / 2
}

/** Return a copy of `mission` anchored at `origin`, preserving every local
    x/y/z coordinate unchanged. Only geodetic placement moves. */
export function withMissionOrigin(mission: StudioMission, origin: GeoOrigin, attribution?: GeoAttribution): StudioMission {
  return {
    ...mission,
    origin: {
      lat: origin.lat,
      lng: origin.lng,
      ...(attribution ? { attribution: { ...attribution } } : {})
    }
  }
}

export function dist3(a: EnuVec, b: EnuVec): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

/* Derived mission-geometry start: Home is a separate ground location; the
   first active Route/Area in sequence order supplies the mission start.
   Code JSON may reorder blocks without reordering its waypoint array, so never
   use array index 0 as a proxy for the first sequence item. An Area start uses
   scan altitude so the home connector meets the first rendered scan point. */
export function getMissionStart(mission: StudioMission): EnuVec {
  const routes = getMissionRoutes(mission)
  for (const item of getMissionSequence(mission)) {
    if (item.type === 'route') {
      const routeIndex = routes.findIndex((route) => route.id === item.id)
      if (routeIndex < 0) continue
      const routeId = routes[routeIndex].id
      const first = getMissionRouteWaypoints(mission, routeId)[0]
      if (first) return { x: first.x, y: first.y, z: first.z }
      continue
    }

    const area = (mission.areas ?? []).find((candidate) => candidate.id === item.id)
    if (!area || !isValidRing(area.points)) continue
    const traversal = generateAreaTraversal(area, area.scanLines ?? generateAreaScan(area))
    const firstPoint = traversal[0]
    if (!firstPoint) continue
    const areaWaypoints = mission.waypoints
      .filter((waypoint) => waypoint.generatedByArea === area.id)
      .sort((a, b) => a.seq - b.seq)
    return {
      x: firstPoint.x,
      y: firstPoint.y,
      z: areaWaypoints[0]?.z ?? getAreaFlightAltitudeM(area, mission.takeoffAltM, mission.worldType ?? '3D')
    }
  }
  return { x: mission.spawn.x, y: mission.spawn.y, z: mission.takeoffAltM }
}

/** Return the last traversed point in the final active Route/Area block. */
export function getMissionEnd(mission: StudioMission): EnuVec | null {
  const routes = getMissionRoutes(mission)
  const sequence = getMissionSequence(mission)

  for (let index = sequence.length - 1; index >= 0; index -= 1) {
    const item = sequence[index]
    if (item.type === 'route') {
      const routeIndex = routes.findIndex((route) => route.id === item.id)
      if (routeIndex < 0) continue
      const routeId = routes[routeIndex].id
      const routeWaypoints = getMissionRouteWaypoints(mission, routeId)
      const last = routeWaypoints[routeWaypoints.length - 1]
      if (last) return { x: last.x, y: last.y, z: last.z }
      continue
    }

    const area = mission.areas.find((candidate) => candidate.id === item.id)
    if (!area || !isValidRing(area.points)) continue
    const scanPoints = generateAreaTraversal(area, area.scanLines ?? generateAreaScan(area))
    const point = scanPoints[scanPoints.length - 1]
    if (!point) continue
    const areaWaypoints = mission.waypoints
      .filter((waypoint) => waypoint.generatedByArea === area.id)
      .sort((a, b) => a.seq - b.seq)
    const waypoint = areaWaypoints[areaWaypoints.length - 1]
    return {
      x: point.x,
      y: point.y,
      z: waypoint?.z ?? getAreaFlightAltitudeM(area, mission.takeoffAltM, mission.worldType ?? '3D')
    }
  }

  return null
}

/** Home is a ground point; take-off altitude is applied by the flight path. */
export function getMissionHome(mission: StudioMission): EnuVec {
  return { x: mission.spawn.x, y: mission.spawn.y, z: 0 }
}

export function routeLengthM(mission: StudioMission): number {
  if (mission.waypoints.length === 0) return 0
  let total = 0
  const pts: EnuVec[] = [...mission.waypoints]
  const home = getMissionHome(mission)
  const launch = { ...home, z: mission.takeoffAltM }
  total += dist3(home, launch) + dist3(launch, pts[0])
  for (let i = 1; i < pts.length; i += 1) total += dist3(pts[i - 1], pts[i])
  if (mission.returnHomeOnEnd && mission.waypoints.length > 0) {
    const last = mission.waypoints[mission.waypoints.length - 1]
    const homeAtCruise = { ...home, z: last.z }
    total += dist3(last, homeAtCruise) + dist3(homeAtCruise, home)
  } else {
    const last = mission.waypoints[mission.waypoints.length - 1]
    total += Math.max(0, last.z)
  }
  return total
}

export function actionCount(mission: StudioMission): number {
  return mission.waypoints.reduce((n, w) => n + w.actions.length, 0)
}
