/* simulation.ts — deterministic local mock simulation.
   One clock authority: position, telemetry, events and console all derive
   from the same sim time `t` (seconds). No backend, no real flight. */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  clampRunTimes,
  type SimEventItem,
  type SimLogLine,
  type SimPlan,
  type SimSettings,
  type SimStatus
} from './simulation-model'
export * from './simulation-model'

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
