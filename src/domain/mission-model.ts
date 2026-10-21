/* mission-model.ts — typed local Mission Studio mission, invariants, geometry,
   code-view (de)serialization. Pure module: no React, no Cesium. */

export interface EnuPoint {
  x: number
  y: number
}

export interface EnuVec extends EnuPoint {
  z: number
}

/** Per-mission geographic origin (latitude/longitude, degrees) anchoring the
    local ENU frame to the globe. Optional for backward compatibility: missions
    without one use `DEFAULT_MISSION_ORIGIN` (the legacy fixed mock site).
    Changing origin never mutates local x/y coordinates; only the
    ENU-to-geodetic conversion moves, so whole-mission geometry relocates as
    one unit. Never shared or mutated globally across missions. */
export interface GeoOrigin {
  lat: number
  lng: number
  /** Provider credit captured when this site was selected by address search. */
  attribution?: GeoAttribution
}

export interface GeoAttribution {
  label: string
  href: string
}

/** Legacy fixed demo site (Redlands, California). Default origin for missions without one. */
export const DEFAULT_MISSION_ORIGIN: GeoOrigin = { lat: 34.0511, lng: -117.1645 }

export type CameraActionKind = 'photo' | 'video-start' | 'video-stop' | 'lidar-scan'

export interface ReconFlightSettings {
  enabled: boolean
  altitudeM: number
  frontOverlapPct: number
  sideOverlapPct: number
  gimbalPitchDeg: number
  flightSpeedMS: number
  flightPattern: 'single' | 'double'
  terrainAwareness: boolean
}

export const DEFAULT_RECON_FLIGHT_SETTINGS: ReconFlightSettings = {
  enabled: false,
  altitudeM: 30,
  frontOverlapPct: 50,
  sideOverlapPct: 50,
  gimbalPitchDeg: -90,
  flightSpeedMS: 8,
  flightPattern: 'single',
  terrainAwareness: false
}

/** New 2D Area scans start with Recon enabled; Route Recon remains opt-in. */
export const DEFAULT_AREA_RECON_FLIGHT_SETTINGS: ReconFlightSettings = {
  ...DEFAULT_RECON_FLIGHT_SETTINGS,
  enabled: true
}

/** Existing Recon summary inputs. Missing sensor height becomes a square-FOV assumption. */
export const MOCK_RECON_CAMERA_PROFILE = {
  sensorWidthMm: 17.3,
  focalLengthMm: 12.3,
  resolutionWidthPx: 5280
} as const

export interface WaypointAction {
  id: string
  kind: CameraActionKind
  label: string
  /** Camera pitch override for this action, degrees; absence inherits flight settings. */
  gimbalPitchDeg?: number
}

export interface Waypoint extends EnuVec {
  id: string
  seq: number
  actions: WaypointAction[]
  /** ID of the Route block this waypoint belongs to. */
  routeId?: string
  /** Area/avoid waypoints remain distinguishable from points authored by pilot. */
  generatedByArea?: string
  generatedByAvoid?: string
  /** Explicit per-point height edit that survives Area/Avoid regeneration. */
  altitudeOverrideM?: number
}

export interface PolyZone {
  id: string
  label: string
  points: EnuPoint[]
  /** Authoring shape. `points` remains its sampled footprint boundary ring. */
  shape?: 'polygon' | 'cylinder'
  center?: EnuPoint
  radiusM?: number
}

export interface MissionArea extends PolyZone {
  lineSpacingM?: number
  orientationDeg?: number
  paddingM?: number
  scanLines?: EnuPoint[][]
  /** Saved drawing-base altitude (m, >= 0). Footprint renders at this height.
      Absent/legacy means ground (0). Draft ruler never mutates this. */
  baseAltM?: number
  reconnaissance?: ReconFlightSettings
}

/** Flight height for an Area scan. Photogrammetry missions use the saved
    reconnaissance flight altitude; legacy 3D missions keep take-off behavior. */
export function getAreaFlightAltitudeM(
  area: Pick<MissionArea, 'baseAltM' | 'reconnaissance'>,
  takeoffAltitudeM: number,
  worldType: '2D' | '3D' = '3D'
): number {
  const baseAltitudeM = Math.max(0, area.baseAltM ?? 0)
  if (worldType === '2D') {
    return area.reconnaissance?.altitudeM ?? DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM
  }
  return Math.max(baseAltitudeM, takeoffAltitudeM)
}

export interface AvoidZone extends PolyZone {
  heightM?: number
  clearanceM?: number
  /** Saved base altitude (m, >= 0). heightM extrudes upward from this base.
      Absent/legacy means ground (0). */
  baseAltM?: number
  /** Avoid category: Obstacle or People / Privacy */
  type?: 'obstacle' | 'privacy'
}

export interface MissionRouteMeta {
  id: string
  label: string
  targetSpeedMS?: number
  reconnaissance?: ReconFlightSettings
}

export interface MissionSequenceItem {
  type: 'route' | 'area'
  id: string
}

export interface StudioMission {
  id: string
  name: string
  world: string
  /** Mission authoring mode selected in Create Mission. Legacy missions default to 3D. */
  worldType?: '2D' | '3D'
  /** Stable link to a workspace 3D World; legacy missions keep only the label. */
  worldId?: string
  vehicle: string
  /** Stable link to a workspace Drone profile; absent on legacy snapshots. */
  droneId?: string
  spawn: EnuPoint
  takeoffAltM: number
  targetSpeedMS: number
  returnHomeOnEnd: boolean
  cameraSafetyCheck: boolean
  /** Global avoidance behavior (Figma 607:18957 “Safety options”). Optional:
      absent means obstacle avoidance; flows through snapshots/undo as part of
      the mission object. */
  safetyMode?: SafetyMode
  routes?: MissionRouteMeta[]
  /** User-created Route/Area block order. Missing means legacy Route-first order. */
  sequenceOrder?: MissionSequenceItem[]
  waypoints: Waypoint[]
  areas: MissionArea[]
  avoids: AvoidZone[]
  /** Geographic anchor of the local ENU frame. Absent means
      `DEFAULT_MISSION_ORIGIN` (legacy missions). Local x/y stay unchanged
      when this moves; only geodetic placement moves. */
  origin?: GeoOrigin
}

export type SafetyMode = 'obstacle' | 'privacy' | 'off'

export const SAFETY_OPTIONS: { value: SafetyMode; label: string }[] = [
  { value: 'obstacle', label: 'Obstacle avoidance' },
  { value: 'privacy', label: 'People / Privacy' },
  { value: 'off', label: 'Off' }
]

export function safetyModeOf(mission: StudioMission): SafetyMode {
  return mission.safetyMode ?? 'obstacle'
}

export interface VehicleSpec {
  id: string
  label: string
  supportsVideo: boolean
  supportsLidar: boolean
  note: string
}

export const WORLDS = ['Blank space', 'Courtyard block', 'Rooftop pad', 'Rolling hills', 'Mountain ridge'] as const

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'x500-livox',
    label: 'Drone x500 Livox Mid 360',
    supportsVideo: false,
    supportsLidar: true,
    note: 'LiDAR mapping rig — photo + LiDAR scan only, no video recording.'
  },
  {
    id: 'mavic-3e',
    label: 'DJI Mavic 3E',
    supportsVideo: true,
    supportsLidar: false,
    note: 'Mechanical-shutter camera — photo + video, no LiDAR.'
  },
  {
    id: 'generic-quad',
    label: 'Generic Quad X4',
    supportsVideo: true,
    supportsLidar: true,
    note: 'Reference airframe — all mock actions supported.'
  }
]

export function vehicleSpecOf(label: string): VehicleSpec | undefined {
  return VEHICLES.find((v) => v.label === label)
}

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

export type SceneTool = 'select' | 'home' | 'area' | 'route' | 'avoid'

export interface SceneSelection {
  kind: 'waypoint' | 'area' | 'avoid' | 'spawn'
  id: string
}

export interface ValidationIssue {
  id: string
  level: 'error' | 'warning'
  message: string
  target?: SceneSelection
}

let uidCounter = 0
export function uid(prefix: string): string {
  uidCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}`
}

export function renumber(waypoints: Waypoint[]): Waypoint[] {
  return waypoints.map((w, i) => ({ ...w, seq: i + 1 }))
}

/** Move waypoint `id` to final 0-based position `toIndex`, preserving ids,
    coordinates, actions and Area/Avoid provenance. Returns a renumbered list;
    the caller recomputes order-dependent detours once and commits through the
    existing undo/redo history. No-op (same array contents) when id is missing
    or already at `toIndex`. */
export function reorderWaypoints(waypoints: Waypoint[], id: string, toIndex: number): Waypoint[] {
  const from = waypoints.findIndex((w) => w.id === id)
  if (from < 0) return waypoints
  const at = Math.max(0, Math.min(toIndex, waypoints.length - 1))
  if (from === at) return waypoints
  const list = [...waypoints]
  const [moved] = list.splice(from, 1)
  list.splice(at, 0, moved)
  return renumber(list)
}

/** Rebuild nested Recon settings from supported fields so old snapshots cannot
    keep exporting removed or unknown options such as `gridAngleDeg`. */
function canonicalizeReconSettings<T extends { reconnaissance?: ReconFlightSettings }>(item: T): T {
  const canonical = { ...item }
  const reconnaissance = reconSettingsFrom(item.reconnaissance)
  if (reconnaissance) canonical.reconnaissance = reconnaissance
  else delete canonical.reconnaissance
  return canonical
}

/** Normalize mission routes: ensures each authored waypoint is attributed
    to a valid Route block, defaulting legacy single-route waypoints to Route 1. */
export function normalizeMissionRoutes(mission: StudioMission): StudioMission {
  const authored = mission.waypoints.filter((w) => !w.generatedByArea && !w.generatedByAvoid)
  let routes = mission.routes ? mission.routes.map(canonicalizeReconSettings) : []
  if (routes.length === 0) {
    if (authored.length > 0) {
      routes = [{ id: 'route-1', label: 'Route', targetSpeedMS: mission.targetSpeedMS }]
    }
  }
  const validRouteIds = new Set(routes.map((r) => r.id))
  const defaultRouteId = routes[0]?.id ?? 'route-1'
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
  routes = routes.filter((route, routeIndex) => waypoints.some((waypoint) =>
    !waypoint.generatedByArea && !waypoint.generatedByAvoid &&
    (waypoint.routeId === route.id || (!waypoint.routeId && routeIndex === 0))
  ))
  const activeRouteIds = new Set(routes.map((route) => route.id))
  const activeAreaIds = new Set((mission.areas ?? []).map((area) => area.id))
  const sequenceOrder = Array.isArray(mission.sequenceOrder)
    ? mission.sequenceOrder.filter((item) =>
      item?.type === 'route' ? activeRouteIds.has(item.id) : item?.type === 'area' && activeAreaIds.has(item.id)
    )
    : mission.sequenceOrder
  const areas = (mission.areas ?? []).map(canonicalizeReconSettings)
  return { ...mission, routes, areas, waypoints, sequenceOrder }
}

export function getMissionRoutes(mission: StudioMission): MissionRouteMeta[] {
  if (mission.routes && mission.routes.length > 0) return mission.routes
  const authored = mission.waypoints.filter((w) => !w.generatedByArea && !w.generatedByAvoid)
  if (authored.length > 0) {
    return [{ id: 'route-1', label: 'Route', targetSpeedMS: mission.targetSpeedMS }]
  }
  return []
}

/** Return authored waypoints for one Route in the same order shown by `seq`.
    Code snapshots can preserve array order while waypoint sequence changes. */
export function getMissionRouteWaypoints(mission: StudioMission, routeId: string): Waypoint[] {
  const routes = getMissionRoutes(mission)
  const routeIndex = routes.findIndex((route) => route.id === routeId)
  if (routeIndex < 0) return []
  return mission.waypoints
    .filter((waypoint) =>
      !waypoint.generatedByArea && !waypoint.generatedByAvoid &&
      (waypoint.routeId === routeId || (!waypoint.routeId && routeIndex === 0))
    )
    .sort((a, b) => a.seq - b.seq)
}

/** Return the mission's Route/Area block order. Legacy missions without the
    field retain their historical Route-first ordering. Missing references in
    newer snapshots are appended using that same stable fallback order. */
export function getMissionSequence(mission: StudioMission): MissionSequenceItem[] {
  const fallback: MissionSequenceItem[] = [
    ...getMissionRoutes(mission).map((route) => ({ type: 'route' as const, id: route.id })),
    ...(mission.areas ?? []).map((area) => ({ type: 'area' as const, id: area.id }))
  ]
  if (!Array.isArray(mission.sequenceOrder) || mission.sequenceOrder.length === 0) return fallback

  const valid = new Set<string>()
  for (const route of getMissionRoutes(mission)) valid.add(`route:${route.id}`)
  for (const area of mission.areas ?? []) valid.add(`area:${area.id}`)

  const ordered: MissionSequenceItem[] = []
  const seen = new Set<string>()
  for (const item of mission.sequenceOrder) {
    if ((item?.type !== 'route' && item?.type !== 'area') || typeof item.id !== 'string') continue
    const key = `${item.type}:${item.id}`
    if (!valid.has(key) || seen.has(key)) continue
    seen.add(key)
    ordered.push({ type: item.type, id: item.id })
  }
  for (const item of fallback) {
    const key = `${item.type}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    ordered.push(item)
  }
  return ordered
}

/** Append a newly created Route/Area to the saved block order exactly once. */
export function appendMissionSequenceItem(
  mission: StudioMission,
  item: MissionSequenceItem
): MissionSequenceItem[] {
  const order = getMissionSequence(mission)
  return order.some((entry) => entry.type === item.type && entry.id === item.id)
    ? order
    : [...order, item]
}

/** Remove a deleted Route/Area from the explicit sequence. */
export function removeMissionSequenceItem(
  mission: StudioMission,
  item: MissionSequenceItem
): MissionSequenceItem[] {
  return getMissionSequence(mission).filter((entry) => !(entry.type === item.type && entry.id === item.id))
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

/* Segment (a,b) intersects polygon ring (2D) — used for avoid-zone checks. */
function segIntersectsSeg(a: EnuPoint, b: EnuPoint, c: EnuPoint, d: EnuPoint): boolean {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const s = { x: d.x - c.x, y: d.y - c.y }
  const denom = r.x * s.y - r.y * s.x
  if (Math.abs(denom) < 1e-9) return false
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

function pointInRing(p: EnuPoint, ring: EnuPoint[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]
    const b = ring[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

export function isValidRing(ring: EnuPoint[]): boolean {
  if (ring.length < 3) return false
  const distinct = new Set(ring.map((p) => `${p.x.toFixed(5)},${p.y.toFixed(5)}`))
  if (distinct.size < 3) return false
  let area2 = 0
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    area2 += a.x * b.y - b.x * a.y
    for (let j = i + 1; j < ring.length; j += 1) {
      if (j === i || j === i + 1 || (i === 0 && j === ring.length - 1)) continue
      if (segIntersectsSeg(a, b, ring[j], ring[(j + 1) % ring.length])) return false
    }
  }
  return Math.abs(area2) > 1e-4
}

/** Deterministic closed ring for a circular footprint. */
export function circleFootprint(center: EnuPoint, radiusM: number, vertices = 48): EnuPoint[] {
  const radius = Number.isFinite(radiusM) ? Math.max(0, radiusM) : 0
  const count = Math.max(12, Math.floor(vertices))
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count
    return {
      x: Math.round((center.x + Math.cos(angle) * radius) * 1000) / 1000,
      y: Math.round((center.y + Math.sin(angle) * radius) * 1000) / 1000
    }
  })
}

/** Nominal square nadir footprint derived from the mock payload already shown
    by the Recon summary. Only one sensor dimension is specified in the mock,
    so both image axes use it; this is a prototype estimate, not a calibrated
    camera footprint. */
export function getMockReconNadirFootprintM(altitudeM: number): number {
  const safeAltitudeM = Number.isFinite(altitudeM)
    ? Math.max(1, altitudeM)
    : DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM
  return safeAltitudeM * MOCK_RECON_CAMERA_PROFILE.sensorWidthMm / MOCK_RECON_CAMERA_PROFILE.focalLengthMm
}

/** Mock ground-sample-distance estimate for the same sensor profile used by
    the nominal footprint. This remains a flat-ground prototype estimate. */
export function getMockReconGsdCmPerPx(altitudeM: number): number {
  const safeAltitudeM = Number.isFinite(altitudeM)
    ? Math.max(1, altitudeM)
    : DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM
  return safeAltitudeM * 100 * MOCK_RECON_CAMERA_PROFILE.sensorWidthMm
    / (MOCK_RECON_CAMERA_PROFILE.focalLengthMm * MOCK_RECON_CAMERA_PROFILE.resolutionWidthPx)
}

/** Project a mock square camera image onto the flat z=0 reference plane.
    `pitchDeg` follows Mission Studio convention: -90° is nadir and 0° is
    horizontal. Return null when any image corner points above or too close to
    the horizon. The single sensor dimension is used for both FOV axes. */
export function projectMockReconFootprintToGround(
  waypoint: Pick<Waypoint, 'x' | 'y' | 'z'>,
  forwardDirection: EnuPoint,
  pitchDeg: number,
  groundElevationM = 0
): EnuPoint[] | null {
  if (![waypoint.x, waypoint.y, waypoint.z, forwardDirection.x, forwardDirection.y, pitchDeg, groundElevationM].every(Number.isFinite)) return null
  const heightM = waypoint.z - groundElevationM
  if (heightM <= 0.1) return null

  const directionLength = Math.hypot(forwardDirection.x, forwardDirection.y)
  const forwardX = directionLength > 0.001 ? forwardDirection.x / directionLength : 0
  const forwardY = directionLength > 0.001 ? forwardDirection.y / directionLength : 1

  const downAngle = Math.min(90, Math.max(0, Math.abs(pitchDeg))) * Math.PI / 180
  const sinDown = Math.sin(downAngle)
  const cosDown = Math.cos(downAngle)
  const rightX = forwardY
  const rightY = -forwardX
  const tanHalfFov = MOCK_RECON_CAMERA_PROFILE.sensorWidthMm / (2 * MOCK_RECON_CAMERA_PROFILE.focalLengthMm)
  const corners = [
    { right: -1, imageUp: 1 },
    { right: 1, imageUp: 1 },
    { right: 1, imageUp: -1 },
    { right: -1, imageUp: -1 }
  ] as const

  const projected: EnuPoint[] = []
  for (const corner of corners) {
    const rayX = forwardX * cosDown + rightX * corner.right * tanHalfFov + forwardX * sinDown * corner.imageUp * tanHalfFov
    const rayY = forwardY * cosDown + rightY * corner.right * tanHalfFov + forwardY * sinDown * corner.imageUp * tanHalfFov
    const rayZ = -sinDown + cosDown * corner.imageUp * tanHalfFov
    const downwardComponent = -rayZ
    if (downwardComponent < 0.05) return null
    const distance = heightM / downwardComponent
    projected.push({
      x: waypoint.x + rayX * distance,
      y: waypoint.y + rayY * distance
    })
  }
  return projected
}

/** Capture interval from a nadir-equivalent mock image footprint and overlap. */
export function getReconOverlapSpacingM(
  altitudeM: number,
  overlapPct: number,
  fallbackOverlapPct = DEFAULT_RECON_FLIGHT_SETTINGS.frontOverlapPct
): number {
  const safeOverlapPct = Number.isFinite(overlapPct)
    ? Math.min(95, Math.max(50, overlapPct))
    : fallbackOverlapPct
  return Math.max(0.25, getMockReconNadirFootprintM(altitudeM) * (1 - safeOverlapPct / 100))
}

/** Effective cross-track lane spacing. Recon uses its Side overlap target;
    legacy/manual Area scans keep their explicit line spacing. */
export function getAreaScanSpacingM(area: Pick<MissionArea, 'lineSpacingM' | 'reconnaissance'>): number {
  if (area.reconnaissance?.enabled) {
    return getReconOverlapSpacingM(
      area.reconnaissance.altitudeM,
      area.reconnaissance.sideOverlapPct,
      DEFAULT_RECON_FLIGHT_SETTINGS.sideOverlapPct
    )
  }
  const spacingRaw = area.lineSpacingM ?? 6
  return Math.max(0.25, Number.isFinite(spacingRaw) ? spacingRaw : 6)
}

/** Effective along-track photo spacing for an enabled Area Recon scan. */
export function getAreaPhotoSpacingM(area: Pick<MissionArea, 'reconnaissance'>): number {
  const reconnaissance = area.reconnaissance ?? DEFAULT_RECON_FLIGHT_SETTINGS
  return getReconOverlapSpacingM(
    reconnaissance.altitudeM,
    reconnaissance.frontOverlapPct,
    DEFAULT_RECON_FLIGHT_SETTINGS.frontOverlapPct
  )
}

/** Build straight scan lanes clipped to a simple polygon in local ENU meters. */
export function generateAreaScan(area: Pick<MissionArea, 'points' | 'lineSpacingM' | 'orientationDeg' | 'paddingM' | 'reconnaissance'>): EnuPoint[][] {
  if (!isValidRing(area.points)) return []
  const paddingRaw = area.paddingM ?? 0
  const spacing = getAreaScanSpacingM(area)
  const padding = Math.max(0, Number.isFinite(paddingRaw) ? paddingRaw : 0)
  const origin = area.points.reduce((acc, p) => ({ x: acc.x + p.x / area.points.length, y: acc.y + p.y / area.points.length }), { x: 0, y: 0 })
  const generatePass = (orientationDeg: number): EnuPoint[][] => {
    const angle = ((Number.isFinite(orientationDeg) ? orientationDeg : 0) * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const toLocal = (p: EnuPoint) => {
      const dx = p.x - origin.x
      const dy = p.y - origin.y
      return { u: dx * cos + dy * sin, v: -dx * sin + dy * cos }
    }
    const toWorld = (u: number, v: number): EnuPoint => ({
      x: origin.x + u * cos - v * sin,
      y: origin.y + u * sin + v * cos
    })
    const ring = area.points.map(toLocal)
    const vMin = Math.min(...ring.map((p) => p.v))
    const vMax = Math.max(...ring.map((p) => p.v))
    const lines: EnuPoint[][] = []
    let reverse = false
    let lane = 0
    for (let v = vMin + Math.min(spacing / 2, (vMax - vMin) / 2); v <= vMax + 1e-7 && lane < 1000; v += spacing, lane += 1) {
      const crossings: number[] = []
      for (let i = 0; i < ring.length; i += 1) {
        const a = ring[i]
        const b = ring[(i + 1) % ring.length]
        if ((a.v <= v && b.v > v) || (b.v <= v && a.v > v)) {
          crossings.push(a.u + ((v - a.v) * (b.u - a.u)) / (b.v - a.v))
        }
      }
      crossings.sort((a, b) => a - b)
      const spans: [number, number][] = []
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const start = crossings[i] + padding
        const end = crossings[i + 1] - padding
        if (end - start >= 0.25) spans.push([start, end])
      }
      if (reverse) spans.reverse()
      for (const [start, end] of spans) {
        lines.push(reverse ? [toWorld(end, v), toWorld(start, v)] : [toWorld(start, v), toWorld(end, v)])
        reverse = !reverse
      }
    }
    return lines
  }

  const rawOrientationDeg = area.orientationDeg ?? 0
  const orientationDeg = Number.isFinite(rawOrientationDeg) ? rawOrientationDeg : 0
  const firstPass = generatePass(orientationDeg)
  if (area.reconnaissance?.flightPattern !== 'double') return firstPass
  return [...firstPass, ...generatePass(orientationDeg + 90)]
}

function pointOnSegment(point: EnuPoint, a: EnuPoint, b: EnuPoint): boolean {
  const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x)
  if (Math.abs(cross) > 1e-6) return false
  const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)
  const length2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
  return dot >= -1e-6 && dot <= length2 + 1e-6
}

function insideOrOnRing(point: EnuPoint, ring: EnuPoint[]): boolean {
  return pointInRing(point, ring) || ring.some((vertex, index) => pointOnSegment(point, vertex, ring[(index + 1) % ring.length]))
}

/** Return true only when every interior span of a connector stays within the polygon. */
function segmentInsideRing(a: EnuPoint, b: EnuPoint, ring: EnuPoint[]): boolean {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  if (length2 < 1e-10) return true
  const cuts = [0, 1]
  for (let index = 0; index < ring.length; index += 1) {
    const c = ring[index]
    const d = ring[(index + 1) % ring.length]
    const ex = d.x - c.x
    const ey = d.y - c.y
    const denom = dx * ey - dy * ex
    const cx = c.x - a.x
    const cy = c.y - a.y
    if (Math.abs(denom) > 1e-9) {
      const t = (cx * ey - cy * ex) / denom
      const u = (cx * dy - cy * dx) / denom
      if (t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8) cuts.push(Math.max(0, Math.min(1, t)))
      continue
    }
    if (Math.abs(cx * dy - cy * dx) > 1e-7) continue
    for (const point of [c, d]) {
      const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2
      if (t >= 0 && t <= 1) cuts.push(t)
    }
  }
  cuts.sort((left, right) => left - right)
  for (let index = 1; index < cuts.length; index += 1) {
    if (cuts[index] - cuts[index - 1] < 1e-8) continue
    const t = (cuts[index] + cuts[index - 1]) / 2
    if (!insideOrOnRing({ x: a.x + dx * t, y: a.y + dy * t }, ring)) return false
  }
  return true
}

function connectorInsideRing(from: EnuPoint, to: EnuPoint, ring: EnuPoint[]): EnuPoint[] {
  if (segmentInsideRing(from, to, ring)) return [from, to]
  const nodes = [from, to, ...ring]
  const distance = nodes.map(() => Number.POSITIVE_INFINITY)
  const previous = nodes.map(() => -1)
  const visited = nodes.map(() => false)
  distance[0] = 0
  for (let step = 0; step < nodes.length; step += 1) {
    let current = -1
    for (let index = 0; index < nodes.length; index += 1) {
      if (!visited[index] && (current < 0 || distance[index] < distance[current])) current = index
    }
    if (current < 0 || !Number.isFinite(distance[current])) break
    if (current === 1) break
    visited[current] = true
    for (let candidate = 0; candidate < nodes.length; candidate += 1) {
      if (candidate === current || visited[candidate] || !segmentInsideRing(nodes[current], nodes[candidate], ring)) continue
      const nextDistance = distance[current] + Math.hypot(nodes[candidate].x - nodes[current].x, nodes[candidate].y - nodes[current].y)
      if (nextDistance < distance[candidate]) {
        distance[candidate] = nextDistance
        previous[candidate] = current
      }
    }
  }
  if (!Number.isFinite(distance[1])) return [from, to]
  const route: EnuPoint[] = []
  for (let at = 1; at >= 0; at = previous[at]) {
    route.push(nodes[at])
    if (at === 0) break
  }
  return route.reverse()
}

/** Connect alternating scan spans into a continuous path without leaving the footprint. */
export function generateAreaTraversal(
  area: Pick<MissionArea, 'points' | 'lineSpacingM' | 'orientationDeg' | 'paddingM' | 'reconnaissance'>,
  scanLines = generateAreaScan(area)
): EnuPoint[] {
  if (!isValidRing(area.points) || scanLines.length === 0) return []
  const path: EnuPoint[] = []
  for (const line of scanLines) {
    if (line.length < 2) continue
    if (path.length === 0) {
      path.push(...line)
      continue
    }
    const connector = connectorInsideRing(path[path.length - 1], line[0], area.points)
    path.push(...connector.slice(1), ...line.slice(1))
  }
  return path
}

export interface AreaCapturePathPoint extends EnuPoint {
  /** Whether this generated navigation point represents a photo capture. */
  capturePhoto: boolean
}

/** Build the Area waypoint path with camera captures sampled along scan lanes.
    Turn/connectors stay in the route but do not create photo markers. */
export function generateAreaCapturePath(
  area: Pick<MissionArea, 'points' | 'lineSpacingM' | 'orientationDeg' | 'paddingM' | 'reconnaissance'>,
  scanLines = generateAreaScan(area)
): AreaCapturePathPoint[] {
  if (!area.reconnaissance?.enabled) {
    return generateAreaTraversal(area, scanLines).map((point) => ({ ...point, capturePhoto: true }))
  }
  if (!isValidRing(area.points) || scanLines.length === 0) return []

  const path: AreaCapturePathPoint[] = []
  const append = (point: EnuPoint, capturePhoto: boolean) => {
    const rounded = { x: round2(point.x), y: round2(point.y) }
    const previous = path[path.length - 1]
    if (previous && Math.hypot(previous.x - rounded.x, previous.y - rounded.y) <= 0.001) {
      previous.capturePhoto ||= capturePhoto
      return
    }
    path.push({ ...rounded, capturePhoto })
  }

  const photoSpacingM = getAreaPhotoSpacingM(area)
  for (const line of scanLines) {
    if (line.length < 2) continue
    const start = line[0]
    const end = line[line.length - 1]
    const previous = path[path.length - 1]
    if (previous) {
      const connector = connectorInsideRing(previous, start, area.points)
      connector.slice(1).forEach((point) => append(point, false))
    }

    const lengthM = Math.hypot(end.x - start.x, end.y - start.y)
    const intervals = Math.max(1, Math.ceil(lengthM / photoSpacingM))
    for (let index = 0; index <= intervals; index += 1) {
      const t = index / intervals
      append({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }, true)
    }
  }
  return path
}

function polylineIntersectsRing(line: EnuPoint[], ring: EnuPoint[]): boolean {
  if (ring.length < 3) return false
  for (const p of line) if (pointInRing(p, ring)) return true
  for (let i = 1; i < line.length; i += 1) {
    for (let j = 0; j < ring.length; j += 1) {
      if (segIntersectsSeg(line[i - 1], line[i], ring[j], ring[(j + 1) % ring.length])) return true
    }
  }
  return false
}

/* ------------------------- avoid detours (mock geometry) -------------------------
   Prototype-only horizontal rerouting: when a route leg crosses an Avoid
   footprint below top + clearance, insert generated detour waypoints around an
   expanded bounding box. Authored waypoints are never moved. Not flight planning. */

export function avoidBaseM(avoid: AvoidZone): number {
  return Math.max(0, Number.isFinite(avoid.baseAltM) ? (avoid.baseAltM as number) : 0)
}

export function avoidTopM(avoid: AvoidZone): number {
  return avoidBaseM(avoid) + Math.max(0, avoid.heightM ?? 15) + Math.max(0, avoid.clearanceM ?? 2)
}

/** Zero height + zero clearance defines no obstacle volume, so route
    conflict/detour checks skip the zone. Zero height + positive clearance
    still protects the clearance layer below top. */
export function avoidHasVolume(avoid: AvoidZone): boolean {
  return avoidTopM(avoid) > 0
}

export function isAuthoredWaypoint(wp: Waypoint): boolean {
  return !wp.generatedByArea && !wp.generatedByAvoid
}

export function countDetours(mission: StudioMission): number {
  return mission.waypoints.filter((wp) => wp.generatedByAvoid).length
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Two deterministic corner points routing leg a→b around avoid's expanded
    bounding box, or null when the leg is clear, flies over, has an endpoint
    inside, or no side is viable. Corners are kept outside every Avoid
    footprint; legs are verified against the processed Avoid here, while legs
    crossing other Avoids are left for later sweep passes to reroute. */
export function detourAroundAvoid(a: EnuVec, b: EnuVec, avoid: AvoidZone, others: AvoidZone[] = []): EnuPoint[] | null {
  const ring = avoid.points
  if (!isValidRing(ring)) return null
  const top = avoidTopM(avoid)
  if (top <= 0) return null
  if (Math.min(a.z, b.z) > top) return null
  // Leg fully below the prism base passes under it: no detour.
  if (Math.max(a.z, b.z) < avoidBaseM(avoid)) return null
  const a2d = { x: a.x, y: a.y }
  const b2d = { x: b.x, y: b.y }
  if (pointInRing(a2d, ring) || pointInRing(b2d, ring)) return null
  if (!polylineIntersectsRing([a2d, b2d], ring)) return null
  const MARGIN = 2
  const xs = ring.map((p) => p.x)
  const ys = ring.map((p) => p.y)
  const minX = Math.min(...xs) - MARGIN
  const maxX = Math.max(...xs) + MARGIN
  const minY = Math.min(...ys) - MARGIN
  const maxY = Math.max(...ys) + MARGIN
  const nw = { x: minX, y: maxY }
  const ne = { x: maxX, y: maxY }
  const se = { x: maxX, y: minY }
  const sw = { x: minX, y: minY }
  const z = Math.max(a.z, b.z)
  const sides: [EnuPoint, EnuPoint][] = [[nw, ne], [sw, se], [sw, nw], [se, ne]]
  const candidates = others.filter((o) => o.id !== avoid.id && isValidRing(o.points) && avoidTopM(o) > 0)
  const pointClear = (p: EnuPoint): boolean => {
    if (pointInRing(p, ring)) return false
    return !candidates.some((o) => z <= avoidTopM(o) && pointInRing(p, o.points))
  }
  const legClearOfSelf = (p: EnuVec, q: EnuVec): boolean =>
    !polylineIntersectsRing([{ x: p.x, y: p.y }, { x: q.x, y: q.y }], ring)
  let best: { pts: [EnuPoint, EnuPoint]; len: number } | null = null
  for (const [c1, c2] of sides) {
    const d1 = Math.hypot(a.x - c1.x, a.y - c1.y)
    const d2 = Math.hypot(a.x - c2.x, a.y - c2.y)
    const first = d1 <= d2 ? c1 : c2
    const second = first === c1 ? c2 : c1
    if (!pointClear(first) || !pointClear(second)) continue
    const v1: EnuVec = { ...first, z }
    const v2: EnuVec = { ...second, z }
    if (!legClearOfSelf(a, v1) || !legClearOfSelf(v1, v2) || !legClearOfSelf(v2, b)) continue
    const len =
      Math.hypot(v1.x - a.x, v1.y - a.y, v1.z - a.z) +
      Math.hypot(v2.x - v1.x, v2.y - v1.y) +
      Math.hypot(b.x - v2.x, b.y - v2.y, b.z - v2.z)
    if (!best || len < best.len) best = { pts: [first, second], len }
  }
  return best ? [best.pts[0], best.pts[1]] : null
}

/** Recompute generated Avoid detour waypoints from the current authored and
    Area-generated route. Strips obsolete detours, preserves authored IDs,
    coordinates, order and actions, reuses prior detour IDs per Avoid where the
    regenerated sequence aligns, and renumbers. Avoids are swept in order and
    the sweep repeats (bounded) so a detour around one Avoid that clips another
    is rerouted in a later pass; residual crossings stay blocking validation
    issues. Deterministic for fixed inputs. */
export function withAvoidDetours(mission: StudioMission, priorDetours: Waypoint[] = []): StudioMission {
  const priorByAvoid = new Map<string, Waypoint[]>()
  for (const d of priorDetours) {
    if (!d.generatedByAvoid) continue
    const list = priorByAvoid.get(d.generatedByAvoid) ?? []
    list.push(d)
    priorByAvoid.set(d.generatedByAvoid, list)
  }
  const usedByAvoid = new Map<string, number>()
  let wps = mission.waypoints.filter((wp) => !wp.generatedByAvoid)
  for (let pass = 0; pass < 4; pass += 1) {
    let insertedAny = false
    for (const avoid of mission.avoids) {
      if (!isValidRing(avoid.points)) continue
      const top = avoidTopM(avoid)
      if (top <= 0) continue
      const base = avoidBaseM(avoid)
      const pts: EnuVec[] = [...wps]
      if (pts.some((p) => p.z <= top && p.z >= base && pointInRing({ x: p.x, y: p.y }, avoid.points))) continue
      const others = mission.avoids.filter((o) => o.id !== avoid.id)
      let offset = 0
      for (let k = 0; k < pts.length - 1; k += 1) {
        const a = pts[k]
        const c = pts[k + 1]
        if (Math.min(a.z, c.z) > top) continue
        if (Math.max(a.z, c.z) < base) continue
        if (!polylineIntersectsRing([{ x: a.x, y: a.y }, { x: c.x, y: c.y }], avoid.points)) continue
        const corners = detourAroundAvoid(a, c, avoid, others)
        if (!corners) continue
        const z = round2(Math.max(a.z, c.z))
        const at = k + 1 + offset
        const made: Waypoint[] = corners.map((p) => {
          const prior = (priorByAvoid.get(avoid.id) ?? [])[usedByAvoid.get(avoid.id) ?? 0]
          const matchedPrior = (priorByAvoid.get(avoid.id) ?? []).find((waypoint) => Math.abs(waypoint.x - round2(p.x)) <= 0.05 && Math.abs(waypoint.y - round2(p.y)) <= 0.05)
          usedByAvoid.set(avoid.id, (usedByAvoid.get(avoid.id) ?? 0) + 1)
          const altitudeOverrideM = matchedPrior?.altitudeOverrideM
          return {
            id: prior?.id ?? uid('wp'),
            seq: 0,
            x: round2(p.x),
            y: round2(p.y),
            z: Number.isFinite(altitudeOverrideM) ? altitudeOverrideM as number : z,
            ...(Number.isFinite(altitudeOverrideM) ? { altitudeOverrideM } : {}),
            actions: [],
            generatedByAvoid: avoid.id
          }
        })
        wps = [...wps.slice(0, at), ...made, ...wps.slice(at)]
        offset += made.length
        insertedAny = true
        if (wps.filter((wp) => wp.generatedByAvoid).length >= 64) break
      }
    }
    if (!insertedAny) break
  }
  return { ...mission, waypoints: renumber(wps) }
}

export function validateMission(mission: StudioMission): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const spec = vehicleSpecOf(mission.vehicle)
  if (mission.waypoints.length === 0) {
    issues.push({
      id: 'empty',
      level: 'error',
      message: 'Mission empty. Add Mission logic (at least 2 waypoints) to start Simulation.'
    })
    return issues
  }
  if (mission.waypoints.length === 1) {
    issues.push({
      id: 'min-route',
      level: 'error',
      message: 'Route needs at least 2 waypoints. Add one more waypoint to enable Simulation.'
    })
  }
  for (const area of mission.areas) {
    if (!isValidRing(area.points)) {
      issues.push({
        id: `area-${area.id}`,
        level: 'error',
        message: `Area “${area.label}” needs a closed polygon with 3 or more non-crossing vertices.`,
        target: { kind: 'area', id: area.id }
      })
    } else if (generateAreaScan(area).length === 0) {
      issues.push({ id: `area-scan-${area.id}`, level: 'error', message: `Area “${area.label}” has no scan lanes. Reduce padding or change line spacing.`, target: { kind: 'area', id: area.id } })
    }
  }
  const routeLine: EnuVec[] = [...mission.waypoints]
  for (const avoid of mission.avoids) {
    if (!isValidRing(avoid.points)) {
      issues.push({
        id: `avoid-${avoid.id}`,
        level: 'error',
        message: `Avoid zone “${avoid.label}” needs a closed polygon with 3 or more non-crossing vertices.`,
        target: { kind: 'avoid', id: avoid.id }
      })
      continue
    }
    const top = avoidTopM(avoid)
    if (top <= 0) continue
    const base = avoidBaseM(avoid)
    let insideBlocked = false
    for (const wp of mission.waypoints) {
      if (!isAuthoredWaypoint(wp)) continue
      if (wp.z <= top && wp.z >= base && pointInRing({ x: wp.x, y: wp.y }, avoid.points)) {
        issues.push({
          id: `avoid-inside-${avoid.id}-${wp.id}`,
          level: 'error',
          message: `Waypoint ${wp.seq} is inside Avoid volume “${avoid.label}” below ${top.toFixed(1)} m. Move it outside the footprint or above that altitude. Authored route preserved.`,
          target: { kind: 'waypoint', id: wp.id }
        })
        insideBlocked = true
      }
    }
    const crossesVolume = routeLine.some((point) => point.z <= top && point.z >= base && pointInRing(point, avoid.points)) ||
      routeLine.slice(1).some((point, index) => {
        const previous = routeLine[index]
        return Math.min(previous.z, point.z) <= top && Math.max(previous.z, point.z) >= base && polylineIntersectsRing([{ x: previous.x, y: previous.y }, { x: point.x, y: point.y }], avoid.points)
      })
    if (crossesVolume && !insideBlocked) {
      issues.push({
        id: `avoid-x-${avoid.id}`,
        level: 'error',
        message: `Route enters Avoid volume “${avoid.label}” or its ${(avoid.clearanceM ?? 2).toFixed(1)} m clearance. Move route or resize zone.`,
        target: { kind: 'avoid', id: avoid.id }
      })
    }
  }
  if (actionCount(mission) === 0 && mission.waypoints.length >= 2) {
    issues.push({
      id: 'no-action',
      level: 'warning',
      message: 'Route has no camera / LiDAR action. Add a Photo or scan action to a waypoint.'
    })
  }
  for (const wp of mission.waypoints) {
    for (const action of wp.actions) {
      if (spec && (action.kind === 'video-start' || action.kind === 'video-stop') && !spec.supportsVideo) {
        issues.push({
          id: `compat-${action.id}`,
          level: 'warning',
          message: `“${action.label}” (waypoint ${wp.seq}) may not run on ${spec.label}: no video support.`,
          target: { kind: 'waypoint', id: wp.id }
        })
      }
      if (spec && action.kind === 'lidar-scan' && !spec.supportsLidar) {
        issues.push({
          id: `compat-${action.id}`,
          level: 'warning',
          message: `“${action.label}” (waypoint ${wp.seq}) may not run on ${spec.label}: no LiDAR.`,
          target: { kind: 'waypoint', id: wp.id }
        })
      }
    }
  }
  if (!spec && mission.droneId && actionCount(mission) > 0) {
    issues.push({
      id: 'managed-drone-compat-unverified',
      level: 'warning',
      message: `Hardware compatibility for ${mission.vehicle} has not been verified; the stored component list is descriptive only.`
    })
  }
  return issues
}

export function simGate(mission: StudioMission): { ok: boolean; reason: string | null } {
  const issues = validateMission(mission)
  const errors = issues.filter((i) => i.level === 'error')
  if (errors.length > 0) return { ok: false, reason: errors[0].message }
  return { ok: true, reason: null }
}

export function emptyMission(): StudioMission {
  return {
    id: uid('mission'),
    name: 'Untitled mission',
    world: WORLDS[0],
    worldType: '3D',
    vehicle: VEHICLES[0].label,
    spawn: { x: 0, y: -18 },
    takeoffAltM: 12,
    targetSpeedMS: 2,
    returnHomeOnEnd: true,
    cameraSafetyCheck: true,
    routes: [],
    waypoints: [],
    areas: [],
    avoids: []
  }
}

export function snapshotOf(mission: StudioMission): string {
  // Scan lines are deterministic output from the Area geometry/settings. They
  // are hydrated by missionFromSnapshot, so omitting them here keeps history
  // snapshots canonical and makes undo-to-seed compare equal to saved state.
  const areas = mission.areas.map((area) => {
    const snapshotArea = canonicalizeReconSettings(area)
    delete snapshotArea.scanLines
    if (snapshotArea.lineSpacingM === 6) delete snapshotArea.lineSpacingM
    if (snapshotArea.orientationDeg === 0) delete snapshotArea.orientationDeg
    if (snapshotArea.paddingM === 0) delete snapshotArea.paddingM
    if (snapshotArea.baseAltM === 0) delete snapshotArea.baseAltM
    return snapshotArea
  })
  const avoids = mission.avoids.map((avoid) => {
    const snapshotAvoid = { ...avoid }
    if (snapshotAvoid.heightM === 15) delete snapshotAvoid.heightM
    if (snapshotAvoid.clearanceM === 2) delete snapshotAvoid.clearanceM
    if (snapshotAvoid.baseAltM === 0) delete snapshotAvoid.baseAltM
    return snapshotAvoid
  })
  const routes = mission.routes?.map(canonicalizeReconSettings)
  return JSON.stringify({ ...mission, routes, areas, avoids })
}

export function missionFromSnapshot(raw: string): StudioMission {
  const mission = JSON.parse(raw) as StudioMission
  if (typeof mission.droneId !== 'string' || mission.droneId.length > 128) delete mission.droneId
  if (typeof mission.worldId !== 'string' || mission.worldId.length > 128) delete mission.worldId
  // Per-mission origin survives save/load/undo as part of the snapshot.
  // Legacy snapshots without one stay undefined (default applies at use).
  // Invalid stored values fall back to undefined rather than poison geometry.
  if (mission.origin !== undefined && !isValidGeoOrigin(mission.origin)) {
    delete mission.origin
  }
  mission.areas = (mission.areas ?? []).map((area) => {
    const next: MissionArea = {
      ...area,
      lineSpacingM: area.lineSpacingM ?? 6,
      orientationDeg: area.orientationDeg ?? 0,
      paddingM: area.paddingM ?? 0,
      baseAltM: area.baseAltM ?? 0
    }
    next.scanLines = next.scanLines ?? generateAreaScan(next)
    return next
  })
  mission.avoids = (mission.avoids ?? []).map((avoid) => ({
    ...avoid,
    heightM: avoid.heightM ?? 15,
    clearanceM: avoid.clearanceM ?? 2,
    baseAltM: avoid.baseAltM ?? 0
  }))
  return normalizeMissionRoutes(mission)
}

/* ------------------------- code view (mock logic) ------------------------- */

interface CodeRoute {
  id?: string
  label?: string
  targetSpeedMS?: number
  reconnaissance?: ReconFlightSettings
}

interface CodeSequenceItem {
  type?: 'route' | 'area'
  id?: string
}

interface CodeWaypoint {
  x: number
  y: number
  z: number
  actions?: string[]
  actionCameraPitchDeg?: (number | null)[]
  routeId?: string
  /** Export key of the Area that generated this waypoint (opaque, remapped on import). */
  generatedByArea?: string
  /** Export key of the Avoid that generated this waypoint (opaque, remapped on import). */
  generatedByAvoid?: string
  altitudeOverrideM?: number
}

interface CodeArea {
  id?: string
  label?: string
  points?: EnuPoint[]
  shape?: 'polygon' | 'cylinder'
  center?: EnuPoint
  radiusM?: number
  lineSpacingM?: number
  orientationDeg?: number
  paddingM?: number
  baseAltM?: number
  reconnaissance?: ReconFlightSettings
}

interface CodeAvoid {
  id?: string
  label?: string
  points?: EnuPoint[]
  shape?: 'polygon' | 'cylinder'
  center?: EnuPoint
  radiusM?: number
  heightM?: number
  clearanceM?: number
  baseAltM?: number
  type?: 'obstacle' | 'privacy'
}

interface CodeMission {
  name?: string
  world?: string
  worldType?: '2D' | '3D'
  vehicle?: string
  droneId?: string
  speed?: number
  takeoffAlt?: number
  safety?: string
  returnHome?: boolean
  /** Ground-level Home location in the mission-local ENU frame. */
  home?: EnuPoint
  /** Geographic anchor of the local frame. Absent = legacy default. */
  origin?: GeoOrigin
  routes?: CodeRoute[]
  sequenceOrder?: CodeSequenceItem[]
  waypoints?: CodeWaypoint[]
  areas?: CodeArea[]
  avoids?: CodeAvoid[]
}

const ACTION_ALIASES: Record<string, CameraActionKind> = {
  photo: 'photo',
  'video-start': 'video-start',
  'video-stop': 'video-stop',
  'lidar-scan': 'lidar-scan',
  video_start: 'video-start',
  video_stop: 'video-stop',
  lidar: 'lidar-scan'
}

export function actionLabel(kind: CameraActionKind): string {
  switch (kind) {
    case 'photo':
      return 'Photo capture'
    case 'video-start':
      return 'Camera Start recording'
    case 'video-stop':
      return 'Camera Stop recording'
    case 'lidar-scan':
      return 'LiDAR scan'
  }
}

/* Code JSON zone identity: export keys are opaque strings (currently the
   internal zone id). Import never reuses them as internal ids; it mints fresh
   internal ids and remaps provenance through first-wins maps below. */
function codeZoneKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 128) return null
  return trimmed
}

/* Code JSON numeric guard: JSON import must never let a string/NaN/Infinity
   poison geometry. Non-finite values fall back to the documented default. */
function safeNonNegative(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback
}

function reconSettingsFrom(
  value: unknown,
  enabledFallback = DEFAULT_RECON_FLIGHT_SETTINGS.enabled
): ReconFlightSettings | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Partial<ReconFlightSettings>
  const bounded = (candidate: unknown, fallback: number, min: number, max: number) =>
    typeof candidate === 'number' && Number.isFinite(candidate) ? Math.min(max, Math.max(min, candidate)) : fallback
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : enabledFallback,
    altitudeM: bounded(raw.altitudeM, DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM, 2, 500),
    frontOverlapPct: bounded(raw.frontOverlapPct, DEFAULT_RECON_FLIGHT_SETTINGS.frontOverlapPct, 0, 95),
    sideOverlapPct: bounded(raw.sideOverlapPct, DEFAULT_RECON_FLIGHT_SETTINGS.sideOverlapPct, 0, 95),
    gimbalPitchDeg: bounded(raw.gimbalPitchDeg, DEFAULT_RECON_FLIGHT_SETTINGS.gimbalPitchDeg, -90, 0),
    flightSpeedMS: bounded(raw.flightSpeedMS, DEFAULT_RECON_FLIGHT_SETTINGS.flightSpeedMS, 0.5, 20),
    flightPattern: raw.flightPattern === 'double' ? 'double' : 'single',
    terrainAwareness: typeof raw.terrainAwareness === 'boolean' ? raw.terrainAwareness : DEFAULT_RECON_FLIGHT_SETTINGS.terrainAwareness
  }
}

function finitePoint(value: unknown): value is EnuPoint {
  if (typeof value !== 'object' || value === null) return false
  const point = value as Partial<EnuPoint>
  return typeof point.x === 'number' && Number.isFinite(point.x) && typeof point.y === 'number' && Number.isFinite(point.y)
}

export function missionToCode(mission: StudioMission): string {
  const norm = normalizeMissionRoutes(mission)
  const code: CodeMission = {
    name: norm.name,
    world: norm.world,
    worldType: norm.worldType ?? '3D',
    vehicle: norm.vehicle,
    ...(norm.droneId ? { droneId: norm.droneId } : {}),
    speed: norm.targetSpeedMS,
    takeoffAlt: norm.takeoffAltM,
    safety: norm.safetyMode ?? 'obstacle',
    returnHome: norm.returnHomeOnEnd,
    home: { ...norm.spawn },
    ...(isValidGeoOrigin(norm.origin) ? { origin: { ...norm.origin } } : {}),
    routes: (norm.routes ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      ...(typeof r.targetSpeedMS === 'number' ? { targetSpeedMS: r.targetSpeedMS } : {}),
      ...(r.reconnaissance ? { reconnaissance: r.reconnaissance } : {})
    })),
    sequenceOrder: getMissionSequence(norm).map((item) => ({ type: item.type, id: item.id })),
    waypoints: norm.waypoints.map((w) => ({
      x: Math.round(w.x * 100) / 100,
      y: Math.round(w.y * 100) / 100,
      z: Math.round(w.z * 100) / 100,
      actions: w.actions.map((a) => a.kind),
      ...(w.actions.some((a) => typeof a.gimbalPitchDeg === 'number')
        ? { actionCameraPitchDeg: w.actions.map((a) => typeof a.gimbalPitchDeg === 'number' ? a.gimbalPitchDeg : null) }
        : {}),
      ...(w.routeId ? { routeId: w.routeId } : {}),
      ...(w.generatedByArea ? { generatedByArea: w.generatedByArea } : {}),
      ...(w.generatedByAvoid ? { generatedByAvoid: w.generatedByAvoid } : {}),
      ...(Number.isFinite(w.altitudeOverrideM) ? { altitudeOverrideM: w.altitudeOverrideM } : {})
    })),
    areas: norm.areas.map((a) => ({ id: a.id, label: a.label, points: a.points, ...(a.shape ? { shape: a.shape } : {}), ...(a.center ? { center: a.center } : {}), ...(typeof a.radiusM === 'number' ? { radiusM: a.radiusM } : {}), lineSpacingM: a.lineSpacingM ?? 6, orientationDeg: a.orientationDeg ?? 0, paddingM: a.paddingM ?? 0, baseAltM: a.baseAltM ?? 0, ...(a.reconnaissance ? { reconnaissance: a.reconnaissance } : {}) })),
    avoids: norm.avoids.map((a) => ({ id: a.id, label: a.label, points: a.points, ...(a.shape ? { shape: a.shape } : {}), ...(a.center ? { center: a.center } : {}), ...(typeof a.radiusM === 'number' ? { radiusM: a.radiusM } : {}), heightM: a.heightM ?? 15, clearanceM: a.clearanceM ?? 2, baseAltM: a.baseAltM ?? 0, ...(a.type ? { type: a.type } : {}) }))
  }
  return JSON.stringify(code, null, 2)
}

export function missionFromCode(
  text: string,
  base: StudioMission
): { mission: StudioMission | null; error: string | null } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return { mission: null, error: 'Code is not valid JSON. Fix parsing before applying.' }
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { mission: null, error: 'Code must be a JSON object with a “waypoints” array.' }
  }
  const code = parsed as CodeMission
  if (!Array.isArray(code.waypoints)) {
    return { mission: null, error: 'Code must include a “waypoints” array.' }
  }
  const importedWorldType = code.worldType === '2D' || code.worldType === '3D'
    ? code.worldType
    : (base.worldType ?? '3D')

  const routeKeyToId = new Map<string, string>()
  const seenRouteKeys = new Set<string>()
  const routes: MissionRouteMeta[] = []
  const rawRoutes = Array.isArray(code.routes) ? code.routes : []
  for (let i = 0; i < rawRoutes.length; i += 1) {
    const r = rawRoutes[i]
    const rawKey = codeZoneKey((r as CodeRoute | null)?.id)
    const internalId = uid('route')
    if (rawKey && !seenRouteKeys.has(rawKey)) {
      seenRouteKeys.add(rawKey)
      routeKeyToId.set(rawKey, internalId)
    } else if (rawKey) {
      seenRouteKeys.add(rawKey)
    }
    routes.push({
      id: internalId,
      label: typeof (r as CodeRoute | null)?.label === 'string' && (r as CodeRoute).label ? (r as CodeRoute).label as string : `Route ${i + 1}`,
      targetSpeedMS: typeof (r as CodeRoute | null)?.targetSpeedMS === 'number' && Number.isFinite((r as CodeRoute).targetSpeedMS) ? (r as CodeRoute).targetSpeedMS : undefined,
      reconnaissance: reconSettingsFrom((r as CodeRoute | null)?.reconnaissance)
    })
  }

  /* Zone identity mapping (safe, first-wins):
     - Exported `id` is an opaque key, never reused as an internal id.
     - Missing/invalid key (legacy JSON): mint a fresh internal id, no mapping.
     - Duplicate key within one zone kind: first zone wins the mapping; later
       zones still get fresh internal ids but do not overwrite the map, so
       provenance referencing that key re-associates with the first zone.
     - Area and Avoid keys live in separate namespaces; a waypoint's
       generatedByArea only resolves in the Area map (and likewise for Avoid),
       so a cross-kind collision safely falls back to authored.
     - Unknown provenance (key absent from map) falls back to authored so no
       point is silently dropped or mis-attributed. */
  const areaKeyToId = new Map<string, string>()
  const seenAreaKeys = new Set<string>()
  const areas: MissionArea[] = []
  const rawAreas = Array.isArray(code.areas) ? code.areas : []
  for (let i = 0; i < rawAreas.length; i += 1) {
    const z = rawAreas[i]
    const rawKey = codeZoneKey((z as CodeArea | null)?.id)
    const internalId = uid('area')
    if (rawKey && !seenAreaKeys.has(rawKey)) {
      seenAreaKeys.add(rawKey)
      areaKeyToId.set(rawKey, internalId)
    } else if (rawKey) {
      seenAreaKeys.add(rawKey)
    }
    const area: MissionArea = {
      id: internalId,
      label: typeof (z as CodeArea | null)?.label === 'string' && (z as CodeArea).label ? (z as CodeArea).label as string : `Area ${i + 1}`,
      points: Array.isArray((z as CodeArea | null)?.points)
        ? ((z as CodeArea).points as unknown[]).filter(finitePoint)
        : [],
      shape: (z as CodeArea | null)?.shape === 'cylinder' ? 'cylinder' : 'polygon',
      center: finitePoint((z as CodeArea | null)?.center) ? (z as CodeArea).center : undefined,
      radiusM: typeof (z as CodeArea | null)?.radiusM === 'number' && Number.isFinite((z as CodeArea).radiusM) ? Math.max(0, (z as CodeArea).radiusM as number) : undefined,
      lineSpacingM: (() => {
        const raw = (z as CodeArea | null)?.lineSpacingM
        return typeof raw === 'number' && Number.isFinite(raw) ? Math.min(100, Math.max(0.25, raw)) : 6
      })(),
      orientationDeg: (() => {
        const raw = (z as CodeArea | null)?.orientationDeg
        return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
      })(),
      paddingM: safeNonNegative((z as CodeArea | null)?.paddingM, 0),
      reconnaissance: reconSettingsFrom(
        (z as CodeArea | null)?.reconnaissance,
        importedWorldType === '2D' ? DEFAULT_AREA_RECON_FLIGHT_SETTINGS.enabled : DEFAULT_RECON_FLIGHT_SETTINGS.enabled
      ) ?? (importedWorldType === '2D' ? { ...DEFAULT_AREA_RECON_FLIGHT_SETTINGS } : undefined)
    }
    area.baseAltM = safeNonNegative((z as CodeArea | null)?.baseAltM, 0)
    area.scanLines = generateAreaScan(area)
    areas.push(area)
  }
  const sequenceOrder: MissionSequenceItem[] = []
  const rawSequence = Array.isArray(code.sequenceOrder) ? code.sequenceOrder : []
  for (const rawItem of rawSequence) {
    const item = rawItem as CodeSequenceItem | null
    const rawKey = codeZoneKey(item?.id)
    if (!rawKey || (item?.type !== 'route' && item?.type !== 'area')) continue
    const id = item.type === 'route' ? routeKeyToId.get(rawKey) : areaKeyToId.get(rawKey)
    if (id && !sequenceOrder.some((entry) => entry.type === item.type && entry.id === id)) {
      sequenceOrder.push({ type: item.type, id })
    }
  }
  // Code can be edited by hand, so generatedByArea alone is not enough to
  // prove that a waypoint still belongs to the current scan path. Only keep
  // its per-waypoint altitude override when XY still matches the generated
  // point and Z matches the serialized 0.01 m precision.
  const areaTraversalById = new Map(areas.map((area) => [
    area.id,
    generateAreaCapturePath(area).map((point) => ({ x: round2(point.x), y: round2(point.y) }))
  ]))
  const avoidKeyToId = new Map<string, string>()
  const seenAvoidKeys = new Set<string>()
  const avoids: AvoidZone[] = []
  const rawAvoids = Array.isArray(code.avoids) ? code.avoids : []
  for (let i = 0; i < rawAvoids.length; i += 1) {
    const z = rawAvoids[i]
    const rawKey = codeZoneKey((z as CodeAvoid | null)?.id)
    const internalId = uid('avoid')
    if (rawKey && !seenAvoidKeys.has(rawKey)) {
      seenAvoidKeys.add(rawKey)
      avoidKeyToId.set(rawKey, internalId)
    } else if (rawKey) {
      seenAvoidKeys.add(rawKey)
    }
    avoids.push({
      id: internalId,
      label: typeof (z as CodeAvoid | null)?.label === 'string' && (z as CodeAvoid).label ? (z as CodeAvoid).label as string : `Avoid ${i + 1}`,
      points: Array.isArray((z as CodeAvoid | null)?.points)
        ? ((z as CodeAvoid).points as unknown[]).filter(finitePoint)
        : [],
      shape: (z as CodeAvoid | null)?.shape === 'cylinder' ? 'cylinder' : 'polygon',
      center: finitePoint((z as CodeAvoid | null)?.center) ? (z as CodeAvoid).center : undefined,
      radiusM: typeof (z as CodeAvoid | null)?.radiusM === 'number' && Number.isFinite((z as CodeAvoid).radiusM) ? Math.max(0, (z as CodeAvoid).radiusM as number) : undefined,
      heightM: safeNonNegative((z as CodeAvoid | null)?.heightM, 15),
      clearanceM: safeNonNegative((z as CodeAvoid | null)?.clearanceM, 2),
      baseAltM: safeNonNegative((z as CodeAvoid | null)?.baseAltM, 0),
      type: (z as CodeAvoid | null)?.type === 'privacy' ? 'privacy' : 'obstacle'
    })
  }
  /* Waypoint provenance rehydration:
     - Valid generatedByArea resolves to the imported Area internal id and is
       preserved in the base route (authored + Area-generated).
     - Valid generatedByAvoid is intentionally NOT preserved as a waypoint;
       the base keeps only authored + Area-generated and Avoid detours are
       recomputed via withAvoidDetours, so no duplicate detours survive.
     - Unknown/missing/invalid provenance (legacy JSON, manual edits,
       duplicates pointing past the first zone) falls back to authored.
     - A waypoint carrying both valid flags keeps the Area flag in the base;
       the Avoid flag is dropped because Avoids are recomputed. */
  const baseWaypoints: Waypoint[] = []
  const importedAvoidOverrides: Array<{ avoidId: string; x: number; y: number; altitudeOverrideM: number }> = []
  for (let i = 0; i < code.waypoints.length; i += 1) {
    const w = code.waypoints[i]
    if (
      typeof w?.x !== 'number' || !Number.isFinite(w.x) ||
      typeof w?.y !== 'number' || !Number.isFinite(w.y) ||
      typeof w?.z !== 'number' || !Number.isFinite(w.z)
    ) {
      return { mission: null, error: `Waypoint ${i + 1} needs numeric x, y and z.` }
    }
    const actions: WaypointAction[] = []
    for (const raw of w.actions ?? []) {
      const kind = ACTION_ALIASES[String(raw)]
      if (!kind) return { mission: null, error: `Waypoint ${i + 1}: unknown action “${String(raw)}”.` }
      const cameraPitch = w.actionCameraPitchDeg?.[actions.length]
      actions.push({
        id: uid('act'),
        kind,
        label: actionLabel(kind),
        ...(typeof cameraPitch === 'number' && Number.isFinite(cameraPitch) ? { gimbalPitchDeg: Math.min(0, Math.max(-90, cameraPitch)) } : {})
      })
    }
    const rawAreaKey = codeZoneKey((w as CodeWaypoint | null)?.generatedByArea)
    const rawAvoidKey = codeZoneKey((w as CodeWaypoint | null)?.generatedByAvoid)
    const rawRouteKey = codeZoneKey((w as CodeWaypoint | null)?.routeId)
    const areaId = rawAreaKey ? (areaKeyToId.get(rawAreaKey) ?? undefined) : undefined
    const areaCapturePath = areaId ? (areaTraversalById.get(areaId) ?? []) : []
    if (areaId && areaCapturePath.length === 0) continue
    const areaCoordinatesMatch = areaId
      ? areaCapturePath.some((point) => Math.abs(point.x - w.x) <= 0.05 && Math.abs(point.y - w.y) <= 0.05)
      : false
    const avoidId = rawAvoidKey ? (avoidKeyToId.get(rawAvoidKey) ?? undefined) : undefined
    const routeId = rawRouteKey ? (routeKeyToId.get(rawRouteKey) ?? undefined) : undefined
    const altitudeOverrideM = typeof (w as CodeWaypoint | null)?.altitudeOverrideM === 'number' && Number.isFinite((w as CodeWaypoint).altitudeOverrideM)
      ? (w as CodeWaypoint).altitudeOverrideM as number
      : undefined
    if (avoidId && !areaId) {
      if (Number.isFinite(altitudeOverrideM) && round2(w.z) === round2(altitudeOverrideM as number)) {
        importedAvoidOverrides.push({ avoidId, x: w.x, y: w.y, altitudeOverrideM: altitudeOverrideM as number })
      }
      continue
    }
    const wp: Waypoint = { id: uid('wp'), seq: 0, x: w.x, y: w.y, z: w.z, actions }
    if (areaId) wp.generatedByArea = areaId
    if (
      areaId && areaCoordinatesMatch && Number.isFinite(altitudeOverrideM) &&
      round2(w.z) === round2(altitudeOverrideM as number)
    ) wp.altitudeOverrideM = altitudeOverrideM
    if (routeId) wp.routeId = routeId
    baseWaypoints.push(wp)
  }
  const next: StudioMission = {
    ...base,
    name: typeof code.name === 'string' && code.name ? code.name : base.name,
    world: typeof code.world === 'string' && (WORLDS as readonly string[]).includes(code.world) ? code.world : base.world,
    worldType: importedWorldType,
    // Code JSON carries the mission anchor when present: a valid origin
    // replaces the base anchor with local x/y preserved; legacy JSON without
    // one keeps the base anchor (or its default). An invalid origin value
    // keeps the base anchor rather than poison geometry.
    origin: isValidGeoOrigin(code.origin)
      ? { ...code.origin }
      : base.origin,
    vehicle:
      typeof code.vehicle === 'string' && code.vehicle.trim().length > 0 && code.vehicle.length <= 120
        ? code.vehicle
        : base.vehicle,
    droneId: typeof code.droneId === 'string' && code.droneId.length > 0 && code.droneId.length <= 128
      ? code.droneId
      : base.droneId,
    targetSpeedMS: typeof code.speed === 'number' && Number.isFinite(code.speed) && code.speed > 0 ? code.speed : base.targetSpeedMS,
    takeoffAltM: typeof code.takeoffAlt === 'number' && Number.isFinite(code.takeoffAlt) && code.takeoffAlt >= 0 ? code.takeoffAlt : base.takeoffAltM,
    safetyMode: code.safety === 'privacy' ? 'privacy' : code.safety === 'off' ? 'off' : (base.safetyMode ?? 'obstacle'),
    returnHomeOnEnd: typeof code.returnHome === 'boolean' ? code.returnHome : base.returnHomeOnEnd,
    spawn: finitePoint(code.home) ? { x: code.home.x, y: code.home.y } : base.spawn,
    routes: routes.length > 0 ? routes : undefined,
    sequenceOrder: sequenceOrder.length > 0 ? sequenceOrder : undefined,
    waypoints: baseWaypoints,
    areas,
    avoids
  }
  const normalizedNext = normalizeMissionRoutes(next)
  const normalizedRoutes = getMissionRoutes(normalizedNext)
  const orderedBaseWaypoints = renumber(getMissionSequence(normalizedNext).flatMap((item) => {
    if (item.type === 'route') {
      const routeIndex = normalizedRoutes.findIndex((route) => route.id === item.id)
      return normalizedNext.waypoints.filter((waypoint) =>
        !waypoint.generatedByArea && !waypoint.generatedByAvoid &&
        (waypoint.routeId === item.id || (!waypoint.routeId && routeIndex === 0))
      )
    }
    return normalizedNext.waypoints.filter((waypoint) => waypoint.generatedByArea === item.id)
  }))
  const generated = withAvoidDetours({ ...normalizedNext, waypoints: orderedBaseWaypoints })
  if (importedAvoidOverrides.length > 0) {
    generated.waypoints = generated.waypoints.map((waypoint) => {
      if (!waypoint.generatedByAvoid) return waypoint
      const override = importedAvoidOverrides.find((item) => item.avoidId === waypoint.generatedByAvoid && Math.abs(item.x - waypoint.x) <= 0.05 && Math.abs(item.y - waypoint.y) <= 0.05)
      return override ? { ...waypoint, z: override.altitudeOverrideM, altitudeOverrideM: override.altitudeOverrideM } : waypoint
    })
  }
  return { mission: normalizeMissionRoutes(generated), error: null }
}
