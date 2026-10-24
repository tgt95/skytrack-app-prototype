import {
  DEFAULT_AREA_RECON_FLIGHT_SETTINGS,
  DEFAULT_RECON_FLIGHT_SETTINGS,
  WORLDS,
  actionLabel,
  getMissionRoutes,
  getMissionSequence,
  normalizeMissionRoutes,
  renumber,
  reconSettingsFrom,
  round2,
  uid,
  type AvoidZone,
  type CameraActionKind,
  type EnuPoint,
  type GeoOrigin,
  type MissionArea,
  type MissionRouteMeta,
  type MissionSequenceItem,
  type ReconFlightSettings,
  type StudioMission,
  type Waypoint,
  type WaypointAction
} from './mission-types'
import { isValidGeoOrigin } from './geo-math'
import { generateAreaCapturePath, generateAreaScan } from './area-scan'
import { withAvoidDetours } from './avoid-detour'

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
