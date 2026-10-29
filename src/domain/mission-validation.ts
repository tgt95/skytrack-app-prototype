import {
  canonicalizeReconSettings,
  vehicleSpecOf,
  type AvoidZone,
  type CameraActionKind,
  type EnuVec,
  type MissionArea,
  type MissionSequenceItem,
  type StudioMission,
  type ValidationIssue,
  type Waypoint,
  type WaypointAction
} from './mission-types'
import { normalizeMissionRoutes } from './mission-sequence'
import { actionCount, isValidGeoOrigin } from './geo-math'
import { generateAreaScan, isValidRing, pointInRing, polylineIntersectsRing } from './area-scan'
import { avoidBaseM, avoidTopM, isAuthoredWaypoint } from './avoid-detour'

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

const cameraActionKinds = new Set<CameraActionKind>(['photo', 'video-start', 'video-stop', 'lidar-scan'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)
}

function isAction(value: unknown): value is WaypointAction {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    cameraActionKinds.has(value.kind as CameraActionKind) &&
    (value.gimbalPitchDeg === undefined || isFiniteNumber(value.gimbalPitchDeg))
}

const aiWorkflowActionKinds = new Set(["camera-trigger", "spray"]);
const aiWorkflowActionModes = new Set([
  "snapshot",
  "recording-on",
  "recording-off",
  "start",
  "stop",
]);

function isAIWorkflowAction(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.id === "string" &&
    aiWorkflowActionKinds.has(String(value.kind)) &&
    aiWorkflowActionModes.has(String(value.mode)) &&
    (value.kind === "camera-trigger"
      ? ["snapshot", "recording-on", "recording-off"].includes(String(value.mode))
      : ["start", "stop"].includes(String(value.mode)));
}

function isAIWorkflow(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    (value.sequenceType === "route" || value.sequenceType === "area") &&
    typeof value.sequenceId === "string" &&
    typeof value.startWaypointId === "string" &&
    (value.stopWaypointId === null || typeof value.stopWaypointId === "string") &&
    (value.startAfterActionId === null || typeof value.startAfterActionId === "string") &&
    (value.modelId === null || typeof value.modelId === "string") &&
    typeof value.objectClass === "string" &&
    isFiniteNumber(value.confidenceScore) && value.confidenceScore >= 0 && value.confidenceScore <= 1 &&
    Array.isArray(value.ifActions) && value.ifActions.every(isAIWorkflowAction) &&
    Array.isArray(value.elseActions) && value.elseActions.every(isAIWorkflowAction);
}

function isWaypoint(value: unknown): value is Waypoint {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    isFiniteNumber(value.seq) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.z) &&
    Array.isArray(value.actions) && value.actions.every(isAction) &&
    (value.routeId === undefined || typeof value.routeId === 'string') &&
    (value.generatedByArea === undefined || typeof value.generatedByArea === 'string') &&
    (value.generatedByAvoid === undefined || typeof value.generatedByAvoid === 'string') &&
    (value.altitudeOverrideM === undefined || isFiniteNumber(value.altitudeOverrideM))
}

function isZone(value: unknown): value is MissionArea | AvoidZone {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.label !== 'string' ||
      !Array.isArray(value.points) || !value.points.every(isPoint)) return false
  if (value.shape !== undefined && value.shape !== 'polygon' && value.shape !== 'cylinder') return false
  if (value.center !== undefined && !isPoint(value.center)) return false
  if (value.radiusM !== undefined && !isFiniteNumber(value.radiusM)) return false
  if (value.scanLines !== undefined && (!Array.isArray(value.scanLines) ||
      !value.scanLines.every((line) => Array.isArray(line) && line.every(isPoint)))) return false
  return ['lineSpacingM', 'orientationDeg', 'paddingM', 'baseAltM', 'heightM', 'clearanceM']
    .every((key) => value[key] === undefined || isFiniteNumber(value[key]))
}

function isRoute(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.label === 'string' &&
    (value.targetSpeedMS === undefined || isFiniteNumber(value.targetSpeedMS))
}

function isSequenceOrderItem(value: unknown): value is MissionSequenceItem {
  return isRecord(value) &&
    (value.type === 'route' || value.type === 'area') &&
    typeof value.id === 'string'
}

function isSnapshotMission(value: unknown): value is StudioMission {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || typeof value.name !== 'string' ||
      typeof value.world !== 'string' || typeof value.vehicle !== 'string' ||
      !isPoint(value.spawn) || !isFiniteNumber(value.takeoffAltM) ||
      !isFiniteNumber(value.targetSpeedMS) || typeof value.returnHomeOnEnd !== 'boolean' ||
      typeof value.cameraSafetyCheck !== 'boolean' ||
      !Array.isArray(value.waypoints) || !value.waypoints.every(isWaypoint)) return false
  if (value.worldType !== undefined && value.worldType !== '2D' && value.worldType !== '3D') return false
  if (value.safetyMode !== undefined && !['obstacle', 'privacy', 'off'].includes(value.safetyMode as string)) return false
  if (value.droneId !== undefined && (typeof value.droneId !== 'string' || value.droneId.length > 128)) return false
  if (value.worldId !== undefined && (typeof value.worldId !== 'string' || value.worldId.length > 128)) return false
  if (value.routes !== undefined && (!Array.isArray(value.routes) || !value.routes.every(isRoute))) return false
  if (value.sequenceOrder !== undefined &&
      (!Array.isArray(value.sequenceOrder) || !value.sequenceOrder.every(isSequenceOrderItem))) return false
  if (value.aiWorkflows !== undefined &&
      (!Array.isArray(value.aiWorkflows) || !value.aiWorkflows.every(isAIWorkflow))) return false
  if (value.areas !== undefined && (!Array.isArray(value.areas) || !value.areas.every(isZone))) return false
  if (value.avoids !== undefined && (!Array.isArray(value.avoids) || !value.avoids.every(isZone))) return false
  return true
}

export function missionFromSnapshot(raw: string): StudioMission {
  const parsed: unknown = JSON.parse(raw) as unknown
  if (!isSnapshotMission(parsed)) {
    throw new TypeError('Saved mission data has an invalid shape.')
  }
  const mission = parsed
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
