/* mission-preview-model.ts — deterministic preview timing and geometry. */

import { getMissionHome, getMissionStart, type StudioMission, type Waypoint } from '../../domain/mission-model'
import { computeDerivedTransfers } from '../../domain/transfer-planner'
import { buildSimPlan, samplePlan } from './simulation-model'

type PreviewEvent = {
  time: number
  waypoint: Waypoint
  label: string
}

type PreviewRow = {
  waypoint: Waypoint
  time: number
  label: string
}

export type PreviewBuild = { rows: PreviewRow[]; events: PreviewEvent[]; duration: number; transferBlocked: boolean }

const ACTION_DWELL_SECONDS: Record<string, number> = {
  photo: 1.5,
  'lidar-scan': 2,
  'video-start': 0,
  'video-stop': 0
}

function waypointSpeed(mission: StudioMission, waypoint: Waypoint): number {
  const route = mission.routes?.find((item) => item.id === waypoint.routeId)
  const speed = route?.targetSpeedMS ?? mission.targetSpeedMS
  return Number.isFinite(speed) && speed > 0 ? speed : 2
}

function actionDwell(actionKind: string, showPhotoScanDemo: boolean): number {
  if (actionKind === 'photo' && !showPhotoScanDemo) return 0
  return ACTION_DWELL_SECONDS[actionKind] ?? 0
}

export function buildPreview(mission: StudioMission, showPhotoScanDemo: boolean): PreviewBuild {
  const simPlan = buildSimPlan(mission, { includePhotoCaptureDwell: showPhotoScanDemo })
  if (simPlan) {
    const waypointById = new Map(mission.waypoints.map((waypoint) => [waypoint.id, waypoint]))
    const arrivalById = new Map(
      simPlan.events
        .filter((event) => event.kind === 'waypoint' && event.waypointId)
        .map((event) => [event.waypointId!, event.t])
    )
    const rows = [...mission.waypoints]
      .filter((waypoint) => arrivalById.has(waypoint.id))
      .sort((a, b) => (arrivalById.get(a.id) ?? 0) - (arrivalById.get(b.id) ?? 0))
      .map((waypoint) => ({
        waypoint,
        time: arrivalById.get(waypoint.id) ?? 0,
        label: `Waypoint ${waypoint.seq}`
      }))
    const events = simPlan.events.flatMap((event) => {
      if ((event.kind !== 'waypoint' && event.kind !== 'action') || !event.waypointId) return []
      const waypoint = waypointById.get(event.waypointId)
      return waypoint ? [{ time: event.t, waypoint, label: event.label }] : []
    })
    return { rows, events, duration: simPlan.duration, transferBlocked: false }
  }

  const transferBlocked = computeDerivedTransfers(mission).some((transfer) => (
    transfer.blockedByAvoidId || transfer.errorMessage
  ))
  if (transferBlocked) {
    const rows = [...mission.waypoints]
      .sort((a, b) => a.seq - b.seq)
      .map((waypoint) => ({ waypoint, time: 0, label: `Waypoint ${waypoint.seq}` }))
    return { rows, events: [], duration: 0, transferBlocked: true }
  }

  const waypoints = mission.waypoints
  if (waypoints.length === 0) return { rows: [], events: [], duration: 0, transferBlocked: false }

  let time = 0
  const rows: PreviewRow[] = []
  const events: PreviewEvent[] = []
  const first = waypoints[0]
  const speed = Math.max(1, mission.targetSpeedMS)
  const home = getMissionHome(mission)
  const launch = { ...home, z: Math.max(0, mission.takeoffAltM) }
  const missionStart = getMissionStart(mission)
  time += launch.z / speed
  time += Math.hypot(missionStart.x - launch.x, missionStart.y - launch.y, missionStart.z - launch.z) / speed
  time += Math.hypot(first.x - missionStart.x, first.y - missionStart.y, first.z - missionStart.z) / speed

  waypoints.forEach((waypoint, index) => {
    if (index > 0) {
      const previous = waypoints[index - 1]
      const distance = Math.hypot(
        waypoint.x - previous.x,
        waypoint.y - previous.y,
        waypoint.z - previous.z
      )
      time += distance / waypointSpeed(mission, waypoint)
    }

    rows.push({ waypoint, time, label: `Waypoint ${waypoint.seq}` })
    events.push({ time, waypoint, label: `Waypoint ${waypoint.seq} reached` })
    for (const action of waypoint.actions) {
      events.push({ time, waypoint, label: `${action.label} · Waypoint ${waypoint.seq}` })
      time += actionDwell(action.kind, showPhotoScanDemo)
    }
  })

  const last = waypoints[waypoints.length - 1]
  if (mission.returnHomeOnEnd) {
    time += Math.hypot(last.x - home.x, last.y - home.y) / Math.max(1, mission.targetSpeedMS)
  }
  time += Math.max(0, last.z) / Math.max(1, mission.targetSpeedMS)

  return { rows, events, duration: time, transferBlocked: false }
}

export function previewPositionAt(mission: StudioMission, seconds: number, showPhotoScanDemo = true): { x: number; y: number; z: number } | null {
  const simPlan = buildSimPlan(mission, { includePhotoCaptureDwell: showPhotoScanDemo })
  if (simPlan) return samplePlan(simPlan, seconds).pos

  const waypoints = mission.waypoints
  if (waypoints.length === 0) return null

  const first = waypoints[0]
  const speed = Math.max(1, mission.targetSpeedMS)
  const home = getMissionHome(mission)
  const launch = { ...home, z: Math.max(0, mission.takeoffAltM) }
  const missionStart = getMissionStart(mission)
  const takeoffDuration = launch.z / speed
  let elapsed = 0
  if (seconds < takeoffDuration) {
    return { x: home.x, y: home.y, z: launch.z * (seconds / Math.max(takeoffDuration, 1e-9)) }
  }
  elapsed += takeoffDuration

  const launchDuration = Math.hypot(missionStart.x - launch.x, missionStart.y - launch.y, missionStart.z - launch.z) / speed
  if (seconds < elapsed + launchDuration) {
    const progress = Math.max(0, (seconds - elapsed) / Math.max(launchDuration, 1e-9))
    return {
      x: launch.x + (missionStart.x - launch.x) * progress,
      y: launch.y + (missionStart.y - launch.y) * progress,
      z: launch.z + (missionStart.z - launch.z) * progress
    }
  }
  elapsed += launchDuration

  const firstLegDuration = Math.hypot(first.x - missionStart.x, first.y - missionStart.y, first.z - missionStart.z) / speed
  if (seconds < elapsed + firstLegDuration) {
    const progress = Math.max(0, (seconds - elapsed) / Math.max(firstLegDuration, 1e-9))
    return {
      x: missionStart.x + (first.x - missionStart.x) * progress,
      y: missionStart.y + (first.y - missionStart.y) * progress,
      z: missionStart.z + (first.z - missionStart.z) * progress
    }
  }
  elapsed += firstLegDuration

  for (let index = 0; index < waypoints.length; index += 1) {
    const waypoint = waypoints[index]
    if (index > 0) {
      const previous = waypoints[index - 1]
      const travelDuration = Math.hypot(waypoint.x - previous.x, waypoint.y - previous.y, waypoint.z - previous.z)
        / waypointSpeed(mission, waypoint)
      if (seconds < elapsed + travelDuration) {
        const progress = Math.max(0, (seconds - elapsed) / Math.max(travelDuration, 1e-9))
        return {
          x: previous.x + (waypoint.x - previous.x) * progress,
          y: previous.y + (waypoint.y - previous.y) * progress,
          z: previous.z + (waypoint.z - previous.z) * progress
        }
      }
      elapsed += travelDuration
    }

    for (const action of waypoint.actions) {
      const dwell = actionDwell(action.kind, showPhotoScanDemo)
      if (seconds < elapsed + dwell) return { x: waypoint.x, y: waypoint.y, z: waypoint.z }
      elapsed += dwell
    }
  }

  if (mission.returnHomeOnEnd) {
    const last = waypoints[waypoints.length - 1]
    const returnDuration = Math.hypot(last.x - home.x, last.y - home.y)
      / Math.max(1, mission.targetSpeedMS)
    if (seconds < elapsed + returnDuration) {
      const progress = Math.max(0, (seconds - elapsed) / Math.max(returnDuration, 1e-9))
      return {
        x: last.x + (home.x - last.x) * progress,
        y: last.y + (home.y - last.y) * progress,
        z: last.z
      }
    }
    elapsed += returnDuration
  }

  const final = waypoints[waypoints.length - 1]
  const destination = mission.returnHomeOnEnd ? { x: home.x, y: home.y, z: final.z } : final
  const landingDuration = Math.max(0, destination.z) / Math.max(1, mission.targetSpeedMS)
  if (seconds < elapsed + landingDuration) {
    const progress = Math.max(0, (seconds - elapsed) / Math.max(landingDuration, 1e-9))
    return { x: destination.x, y: destination.y, z: destination.z * (1 - progress) }
  }
  return { x: destination.x, y: destination.y, z: 0 }
}

export function previewPhotoCaptureAt(mission: StudioMission, seconds: number, enabled: boolean): string | null {
  if (!enabled) return null
  const simPlan = buildSimPlan(mission, { includePhotoCaptureDwell: enabled })
  if (simPlan) {
    const activeCapture = simPlan.events.find((event) => (
      event.kind === 'action' && event.actionKind === 'photo' && event.waypointId &&
      seconds >= event.t && seconds < event.t + ACTION_DWELL_SECONDS.photo
    ))
    return activeCapture?.waypointId ?? null
  }

  const waypoints = mission.waypoints
  if (waypoints.length === 0) return null
  const first = waypoints[0]
  const home = getMissionHome(mission)
  const launch = { ...home, z: Math.max(0, mission.takeoffAltM) }
  const speed = Math.max(1, mission.targetSpeedMS)
  const missionStart = getMissionStart(mission)
  let elapsed = launch.z / speed
  elapsed += Math.hypot(missionStart.x - launch.x, missionStart.y - launch.y, missionStart.z - launch.z) / speed
  elapsed += Math.hypot(first.x - missionStart.x, first.y - missionStart.y, first.z - missionStart.z) / speed
  for (let index = 0; index < waypoints.length; index += 1) {
    const waypoint = waypoints[index]
    if (index > 0) {
      const previous = waypoints[index - 1]
      elapsed += Math.hypot(waypoint.x - previous.x, waypoint.y - previous.y, waypoint.z - previous.z)
        / waypointSpeed(mission, waypoint)
    }
    for (const action of waypoint.actions) {
      const dwell = actionDwell(action.kind, enabled)
      if (action.kind === 'photo' && dwell > 0 && seconds >= elapsed && seconds < elapsed + dwell) return waypoint.id
      elapsed += dwell
    }
  }
  return null
}

