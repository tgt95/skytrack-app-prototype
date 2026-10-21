/* simulation.ts — deterministic local mock simulation.
   One clock authority: position, telemetry, events and console all derive
   from the same sim time `t` (seconds). No backend, no real flight. */

import { useCallback, useEffect, useRef, useState } from 'react'
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
  type StudioMission
} from '../../domain/mission-model'
import { computeDerivedTransfers } from '../../domain/transfer-planner'

export type SimStatus = 'idle' | 'running' | 'paused' | 'completed' | 'aborted' | 'failed'

export interface SimSettings {
  runTimes: number
  speedFactor: number
  reducedMotion: boolean
  windMS: number
  mockFailureAtSeq: number
}

export const DEFAULT_SIM_SETTINGS: SimSettings = {
  runTimes: 1,
  speedFactor: 1,
  reducedMotion: false,
  windMS: 2.5,
  mockFailureAtSeq: 0
}

export const SIM_RUN_TIMES_MIN = 1
export const SIM_RUN_TIMES_MAX = 20

/** Clamp run times to the source range 1–20 (integers). */
export function clampRunTimes(v: number): number {
  if (!Number.isFinite(v)) return SIM_RUN_TIMES_MIN
  return Math.min(SIM_RUN_TIMES_MAX, Math.max(SIM_RUN_TIMES_MIN, Math.floor(v)))
}

export type SimEventKind = 'takeoff' | 'waypoint' | 'action' | 'rtl' | 'land' | 'complete' | 'failure' | 'info'

export interface SimEventItem {
  t: number
  kind: SimEventKind
  label: string
  seq?: number
  waypointId?: string
  actionKind?: string
}

export interface SimLogLine {
  t: number
  kind: SimEventKind | 'system'
  text: string
}

export interface Telemetry {
  t: number
  pos: EnuVec
  yawDeg: number
  rollDeg: number
  pitchDeg: number
  altM: number
  speedMS: number
  batteryPct: number
  homeDistM: number
  mode: string
  signal: string
  moving: boolean
  targetSeq: number | null
}

interface SimLeg {
  ax: number
  ay: number
  az: number
  bx: number
  by: number
  bz: number
  len: number
  t0: number
  t1: number
  dwell: number
  seq: number | null
}

export interface SimPlan {
  legs: SimLeg[]
  events: SimEventItem[]
  duration: number
  totalDist: number
  failedAtSeq: number
}

const DWELL_S: Record<string, number> = {
  photo: 1.5,
  'lidar-scan': 2,
  'video-start': 0,
  'video-stop': 0
}

function pushLeg(
  legs: SimLeg[],
  clock: { t: number },
  from: EnuVec,
  to: EnuVec,
  speed: number,
  seq: number | null,
  dwell: number
): void {
  const len = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z)
  const move = speed > 0 ? len / speed : 0
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
    seq
  }
  legs.push(leg)
  clock.t = clock.t + move + dwell
}

export function buildSimPlan(
  mission: StudioMission,
  options: { includePhotoCaptureDwell?: boolean } = {}
): SimPlan | null {
  const norm = normalizeMissionRoutes(mission)
  const routeMetas = getMissionRoutes(norm)
  const routes = routeMetas.filter((route) => norm.waypoints.some(
    (w) => !w.generatedByArea && !w.generatedByAvoid && (w.routeId === route.id || (!w.routeId && route.id === routeMetas[0]?.id))
  ))
  const transfers = computeDerivedTransfers(norm)

  // If any transfer between routes or areas is blocked, cannot build plan (no flight through Avoid)
  if (transfers.some((t) => t.blockedByAvoidId || t.errorMessage)) {
    return null
  }

  const authored = norm.waypoints.filter((w) => !w.generatedByArea && !w.generatedByAvoid)
  const areas = (norm.areas ?? [])
    .filter((a) => isValidRing(a.points))
    .filter((area) => (area.scanLines ?? generateAreaScan(area)).flat().length > 0)
  const routeById = new Map(routes.map((route) => [route.id, route]))
  const areaById = new Map(areas.map((area) => [area.id, area]))
  const activeSequence = getMissionSequence(norm).filter((item) =>
    item.type === 'route' ? routeById.has(item.id) : areaById.has(item.id)
  )
  if (authored.length < 2 && areas.length === 0) return null

  const defaultSpeed = norm.targetSpeedMS > 0 ? norm.targetSpeedMS : 2
  const legs: SimLeg[] = []
  const events: SimEventItem[] = []
  const clock = { t: 0 }
  // Home is the ground launch and landing point. Mission geometry starts at
  // waypoint 1 or the first Area scan point after take-off and transit.
  const start = getMissionStart(norm)
  const homeGround = getMissionHome(norm)
  const homeAir: EnuVec = { ...homeGround, z: Math.max(0, norm.takeoffAltM) }

  events.push({ t: 0, kind: 'takeoff', label: `Takeoff — climbing to ${homeAir.z} m at Home (mock)` })
  pushLeg(legs, clock, homeGround, homeAir, Math.max(defaultSpeed, 1), null, 0)
  pushLeg(legs, clock, homeAir, start, defaultSpeed, null, 0)

  let prev: EnuVec = start

  for (let blockIndex = 0; blockIndex < activeSequence.length; blockIndex += 1) {
    const block = activeSequence[blockIndex]
    const route = block.type === 'route' ? routeById.get(block.id) : undefined
    const area = block.type === 'area' ? areaById.get(block.id) : undefined
    if (!route && !area) continue

    const label = route?.label ?? area?.label ?? 'mission block'
    const speed = route?.targetSpeedMS && route.targetSpeedMS > 0 ? route.targetSpeedMS : defaultSpeed
    if (blockIndex > 0) {
      const previous = activeSequence[blockIndex - 1]
      const transfer = transfers.find((item) =>
        item.fromType === previous.type && item.fromId === previous.id && item.toType === block.type && item.toId === block.id
      )
      if (transfer && transfer.points.length >= 2) {
        events.push({ t: clock.t, kind: 'info', label: `Transfer to ${label} (mock)` })
        for (let pointIndex = 1; pointIndex < transfer.points.length; pointIndex += 1) {
          pushLeg(legs, clock, transfer.points[pointIndex - 1], transfer.points[pointIndex], speed, null, 0)
        }
        prev = transfer.points[transfer.points.length - 1]
      }
    }

    if (route) {
      const rWaypoints = getMissionRouteWaypoints(norm, route.id)
      for (const waypoint of rWaypoints) {
        const dwell = waypoint.actions.reduce((n, action) => n + (
          action.kind === 'photo' && options.includePhotoCaptureDwell === false ? 0 : (DWELL_S[action.kind] ?? 0)
        ), 0)
        pushLeg(legs, clock, prev, waypoint, speed, waypoint.seq, dwell)
        const arriveT = clock.t - dwell
        events.push({ t: arriveT, kind: 'waypoint', label: `Waypoint ${waypoint.seq} reached`, seq: waypoint.seq, waypointId: waypoint.id })
        for (const action of waypoint.actions) {
          events.push({
            t: arriveT,
            kind: 'action',
            label: `${action.label} — waypoint ${waypoint.seq} (mock)`,
            seq: waypoint.seq,
            waypointId: waypoint.id,
            actionKind: action.kind
          })
        }
        prev = { x: waypoint.x, y: waypoint.y, z: waypoint.z }
      }
      continue
    }

    if (area) {
      const scanPoints = generateAreaTraversal(area, area.scanLines ?? generateAreaScan(area))
      if (scanPoints.length === 0) continue
      const generatedWaypoints = norm.waypoints
        .filter((waypoint) => waypoint.generatedByArea === area.id)
        .sort((a, b) => a.seq - b.seq)
      const areaAlt = getAreaFlightAltitudeM(area, norm.takeoffAltM, norm.worldType ?? '3D')
      const areaTargets = generatedWaypoints.length > 0
        ? generatedWaypoints.map((waypoint) => ({ waypoint, target: waypoint }))
        : scanPoints.map((point) => ({ waypoint: null, target: { x: point.x, y: point.y, z: areaAlt } }))
      for (const { waypoint, target } of areaTargets) {
        const actions = waypoint?.actions ?? []
        const dwell = actions.reduce((n, action) => n + (
          action.kind === 'photo' && options.includePhotoCaptureDwell === false ? 0 : (DWELL_S[action.kind] ?? 0)
        ), 0)
        pushLeg(legs, clock, prev, target, defaultSpeed, waypoint?.seq ?? null, dwell)
        if (waypoint) {
          const arriveT = clock.t - dwell
          events.push({ t: arriveT, kind: 'waypoint', label: `Waypoint ${waypoint.seq} reached`, seq: waypoint.seq, waypointId: waypoint.id })
          for (const action of actions) {
            events.push({
              t: arriveT,
              kind: 'action',
              label: `${action.label} — waypoint ${waypoint.seq} (mock)`,
              seq: waypoint.seq,
              waypointId: waypoint.id,
              actionKind: action.kind
            })
          }
        }
        prev = target
      }
    }
  }

  if (norm.returnHomeOnEnd) {
    const homeAtCruise: EnuVec = { x: homeGround.x, y: homeGround.y, z: prev.z }
    events.push({ t: clock.t, kind: 'rtl', label: 'END — Return home (mock)' })
    pushLeg(legs, clock, prev, homeAtCruise, defaultSpeed, null, 0)
    prev = homeAtCruise
  }
  const landPosition: EnuVec = norm.returnHomeOnEnd
    ? homeGround
    : { x: prev.x, y: prev.y, z: 0 }
  pushLeg(legs, clock, prev, landPosition, Math.max(defaultSpeed, 1), null, 0)
  events.push({ t: clock.t, kind: 'land', label: norm.returnHomeOnEnd ? 'Landed at Home (mock)' : 'Landed at final position (mock)' })
  events.push({ t: clock.t, kind: 'complete', label: 'Mission run completed (mock)' })

  const failedAtSeq = 0
  const totalDist = legs.reduce((n, l) => n + l.len, 0)
  events.sort((a, b) => a.t - b.t)
  return { legs, events, duration: clock.t, totalDist, failedAtSeq }
}

/** Apply the injected mock failure to a base plan (pure; keeps design intact). */
export function applyMockFailure(plan: SimPlan, seq: number): SimPlan {
  if (!(seq >= 1)) return plan
  const arrival = plan.events.find((e) => e.kind === 'waypoint' && e.seq === seq)
  if (!arrival) return plan
  const failT = arrival.t + 0.5
  const events = plan.events.filter((e) => e.t <= failT && e.kind !== 'complete')
  events.push({ t: failT, kind: 'failure', label: `Mock fault injected at waypoint ${seq} — run failed (mock)`, seq })
  events.sort((a, b) => a.t - b.t)
  return { ...plan, events, duration: failT, failedAtSeq: seq }
}

export function samplePlan(
  plan: SimPlan,
  t: number
): { pos: EnuVec; yawDeg: number; moving: boolean; targetSeq: number | null; speedMS: number } {
  const clamped = Math.max(0, Math.min(t, plan.duration))
  for (const leg of plan.legs) {
    if (clamped <= leg.t1) {
      const span = leg.t1 - leg.t0
      const k = span > 1e-9 ? (clamped - leg.t0) / span : 1
      const pos = {
        x: leg.ax + (leg.bx - leg.ax) * k,
        y: leg.ay + (leg.by - leg.ay) * k,
        z: leg.az + (leg.bz - leg.az) * k
      }
      const yawDeg = (Math.atan2(leg.bx - leg.ax, leg.by - leg.ay) * 180) / Math.PI
      const speedMS = span > 1e-9 ? leg.len / span : 0
      return { pos, yawDeg, moving: true, targetSeq: leg.seq, speedMS }
    }
    if (clamped <= leg.t1 + leg.dwell) {
      return {
        pos: { x: leg.bx, y: leg.by, z: leg.bz },
        yawDeg: (Math.atan2(leg.bx - leg.ax, leg.by - leg.ay) * 180) / Math.PI,
        moving: false,
        targetSeq: leg.seq,
        speedMS: 0
      }
    }
  }
  const last = plan.legs[plan.legs.length - 1]
  return {
    pos: last ? { x: last.bx, y: last.by, z: last.bz } : { x: 0, y: 0, z: 0 },
    yawDeg: 0,
    moving: false,
    targetSeq: null,
    speedMS: 0
  }
}

export function telemetryAt(plan: SimPlan, home: { x: number; y: number }, t: number, status: SimStatus): Telemetry {
  const s = samplePlan(plan, t)
  const frac = plan.duration > 0 ? Math.min(t / plan.duration, 1) : 0
  return {
    t,
    pos: s.pos,
    yawDeg: Math.round(s.yawDeg * 10) / 10,
    rollDeg: Math.round(Math.sin(t * 0.7) * 3 * 10) / 10,
    pitchDeg: Math.round((Math.sin(t * 0.5 + 1) * 2 + (s.moving ? -4 : 0)) * 10) / 10,
    altM: Math.round(s.pos.z * 10) / 10,
    speedMS: Math.round(s.speedMS * 100) / 100,
    batteryPct: Math.max(0, Math.round((100 - 38 * frac) * 10) / 10),
    homeDistM: Math.round(Math.hypot(s.pos.x - home.x, s.pos.y - home.y) * 10) / 10,
    mode: status === 'running' ? 'AUTO · MISSION' : status === 'paused' ? 'HOLD' : status === 'completed' ? 'LANDED' : 'STANDBY',
    signal: 'RTK Fixed',
    moving: s.moving,
    targetSeq: s.targetSeq
  }
}

export interface SimApi {
  status: SimStatus
  simT: number
  runIndex: number
  log: SimLogLine[]
  fired: SimEventItem[]
  clockRef: { current: number }
  start: () => void
  pause: () => void
  resume: () => void
  abort: () => void
  reset: () => void
  restart: () => void
}

export function useSimulation(plan: SimPlan | null, settings: SimSettings): SimApi {
  const [status, setStatus] = useState<SimStatus>('idle')
  const [uiT, setUiT] = useState(0)
  const [log, setLog] = useState<SimLogLine[]>([])
  const [fired, setFired] = useState<SimEventItem[]>([])
  const [runIndex, setRunIndex] = useState(0)
  const clockRef = useRef(0)
  const firedIdxRef = useRef(0)
  const rafRef = useRef(0)
  const lastWallRef = useRef(0)
  // Synchronous run flag: state updates commit asynchronously, so the loop
  // must not depend on `status` (a first frame can run before the
  // 'running' render commits, which would kill the loop immediately).
  const aliveRef = useRef(false)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const planRef = useRef(plan)
  planRef.current = plan
  const statusRef = useRef(status)
  statusRef.current = status

  const appendLog = useCallback((line: SimLogLine) => {
    setLog((prev) => [...prev.slice(-199), line])
  }, [])

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }, [])

  useEffect(() => () => {
    aliveRef.current = false
    stopLoop()
  }, [stopLoop])

  const totalFor = useCallback(() => {
    const p = planRef.current
    if (!p) return 0
    return p.duration * clampRunTimes(settingsRef.current.runTimes)
  }, [])

  const step = useCallback(
    (wallNow: number) => {
      const p = planRef.current
      if (!p || !aliveRef.current) return
      const dt = Math.min((wallNow - lastWallRef.current) / 1000, 0.5)
      lastWallRef.current = wallNow
      const speed = Math.max(0.1, settingsRef.current.speedFactor)
      const prevT = clockRef.current
      const nextT = Math.min(prevT + dt * speed, totalFor())
      const runLen = p.duration || 1
      const prevRun = Math.floor(prevT / runLen)
      const nextRun = Math.floor(Math.min(nextT, totalFor() - 1e-9) / runLen)
      clockRef.current = nextT
      if (nextRun > prevRun) {
        firedIdxRef.current = 0
        setFired([])
        setRunIndex(nextRun)
        const runs = clampRunTimes(settingsRef.current.runTimes)
        appendLog({ t: nextT, kind: 'system', text: `Run ${nextRun + 1}/${runs} started (mock)` })
      }
      const runT = nextT - nextRun * runLen
      const fresh: SimEventItem[] = []
      while (firedIdxRef.current < p.events.length && p.events[firedIdxRef.current].t <= runT) {
        const ev = p.events[firedIdxRef.current]
        firedIdxRef.current += 1
        fresh.push(ev)
        appendLog({ t: nextT, kind: ev.kind, text: ev.label })
      }
      if (fresh.length > 0) setFired((prev) => [...prev, ...fresh])
      if (fresh.some((e) => e.kind === 'failure')) {
        aliveRef.current = false
        setStatus('failed')
        stopLoop()
        setUiT(nextT)
        return
      }
      if (nextT >= totalFor()) {
        clockRef.current = totalFor()
        aliveRef.current = false
        setStatus('completed')
        appendLog({ t: totalFor(), kind: 'complete', text: 'Mission run completed (mock)' })
        stopLoop()
        setUiT(totalFor())
        return
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [appendLog, stopLoop, totalFor]
  )

  const beginLoop = useCallback(() => {
    stopLoop()
    // Seed the delta baseline from the first rAF timestamp itself so the
    // clock never mixes performance.now() with rAF timestamps.
    rafRef.current = requestAnimationFrame((t: number) => {
      lastWallRef.current = t
      rafRef.current = requestAnimationFrame(step)
    })
  }, [step, stopLoop])

  const resetClock = useCallback(
    (label: string | null) => {
      stopLoop()
      clockRef.current = 0
      lastWallRef.current = 0
      firedIdxRef.current = 0
      setFired([])
      setRunIndex(0)
      setUiT(0)
      const runs = clampRunTimes(settingsRef.current.runTimes)
      setLog(label ? [{ t: 0, kind: 'system', text: label.replace('{n}', String(runs)) }] : [])
    },
    [stopLoop]
  )

  const start = useCallback(() => {
    if (!planRef.current) return
    if (statusRef.current === 'paused') {
      aliveRef.current = true
      setStatus('running')
      appendLog({ t: clockRef.current, kind: 'system', text: 'Resumed (mock)' })
      beginLoop()
      return
    }
    resetClock('Run started — 1/{n} (mock, deterministic clock)')
    aliveRef.current = true
    setStatus('running')
    beginLoop()
  }, [appendLog, beginLoop, resetClock])

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return
    aliveRef.current = false
    stopLoop()
    setStatus('paused')
    setUiT(clockRef.current)
    appendLog({ t: clockRef.current, kind: 'system', text: 'Paused by operator (mock)' })
  }, [appendLog, stopLoop])

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return
    aliveRef.current = true
    setStatus('running')
    appendLog({ t: clockRef.current, kind: 'system', text: 'Resumed (mock)' })
    beginLoop()
  }, [appendLog, beginLoop])

  const abort = useCallback(() => {
    if (statusRef.current !== 'running' && statusRef.current !== 'paused') return
    aliveRef.current = false
    stopLoop()
    setStatus('aborted')
    setUiT(clockRef.current)
    appendLog({ t: clockRef.current, kind: 'system', text: 'Aborted by operator — design preserved (mock)' })
  }, [appendLog, stopLoop])

  const reset = useCallback(() => {
    aliveRef.current = false
    stopLoop()
    resetClock(null)
    statusRef.current = 'idle'
    setStatus('idle')
  }, [resetClock, stopLoop])

  const restart = useCallback(() => {
    if (!planRef.current) return
    resetClock('Restarted — run 1/{n} (mock, deterministic clock)')
    aliveRef.current = true
    setStatus('running')
    beginLoop()
  }, [beginLoop, resetClock])

  // Live UI tick for panels/strip while running (scene reads clockRef directly).
  useEffect(() => {
    if (status !== 'running') return
    const id = window.setInterval(() => setUiT(clockRef.current), 250)
    return () => window.clearInterval(id)
  }, [status])

  return { status, simT: uiT, runIndex, log, fired, clockRef, start, pause, resume, abort, reset, restart }
}
