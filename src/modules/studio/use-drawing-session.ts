import { useCallback, useRef, useState } from 'react'
import type { EnuPoint, SceneTool } from '../../domain/mission-model'
import { isValidRing } from '../../domain/mission-model'

export type PendingMissionPoint = EnuPoint & { z?: number }
export type PendingMissionShape = 'polygon' | 'cylinder'
export type FinishPending = (
  points?: PendingMissionPoint[],
  shape?: PendingMissionShape,
  center?: EnuPoint,
  radiusM?: number
) => void

export interface DraftAreaSettings {
  lineSpacingM: number
  orientationDeg: number
  paddingM: number
}

export interface DraftAvoidSettings {
  type: 'obstacle' | 'privacy'
  heightM: number
  clearanceM: number
}

interface UseDrawingSessionArgs {
  say: (message: string) => void
}

export function useDrawingSession({ say }: UseDrawingSessionArgs) {
  const [tool, setTool] = useState<SceneTool>('select')
  const [pending, setPending] = useState<PendingMissionPoint[]>([])
  const [pendingShape, setPendingShape] = useState<PendingMissionShape>('polygon')
  const [draftCursor, setDraftCursor] = useState<EnuPoint | null>(null)
  const [closeDraftAtStart, setCloseDraftAtStart] = useState(false)
  const finishPendingRef = useRef<FinishPending>(() => undefined)
  const [drawingAltM, setDrawingAltM] = useState(2.0)
  const [draftAreaSettings, setDraftAreaSettings] = useState<DraftAreaSettings>({
    lineSpacingM: 6,
    orientationDeg: 0,
    paddingM: 0
  })
  const [draftAvoidSettings, setDraftAvoidSettings] = useState<DraftAvoidSettings>({
    type: 'obstacle',
    heightM: 15,
    clearanceM: 2
  })

  const onDraftHover = useCallback((point: EnuPoint | null, nearStart: boolean) => {
    setDraftCursor((current) => {
      if (!point) return null
      const next = { x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 }
      return current && Math.abs(current.x - next.x) < 0.2 && Math.abs(current.y - next.y) < 0.2 ? current : next
    })
    setCloseDraftAtStart(nearStart && isValidRing(pending))
  }, [pending])

  const onPendingPositionChange = useCallback((index: number, x: number, y: number) => {
    setPending((prev) => {
      if (index < 0 || index >= prev.length) return prev
      const next = [...prev]
      const cur = next[index]
      next[index] = {
        ...cur,
        x: Math.round(Math.max(-2000, Math.min(2000, x)) * 10) / 10,
        y: Math.round(Math.max(-2000, Math.min(2000, y)) * 10) / 10
      }
      return next
    })
  }, [])

  const onPendingAltitudeChange = useCallback((index: number, z: number) => {
    setPending((prev) => {
      if (index < 0 || index >= prev.length) return prev
      const next = [...prev]
      const cur = next[index]
      next[index] = { ...cur, z: Math.round(Math.max(0, z) * 100) / 100 }
      return next
    })
  }, [])

  const onRemovePendingPoint = useCallback((index: number) => {
    setPending((prev) => {
      if (index < 0 || index >= prev.length) return prev
      return prev.filter((_, pointIndex) => pointIndex !== index)
    })
    say(`Draft waypoint ${index + 1} removed.`)
  }, [say])

  const onInsertPendingPoint = useCallback((index: number, point: EnuPoint & { z: number }) => {
    setPending((prev) => {
      const clampedPoint = {
        x: Math.round(Math.max(-2000, Math.min(2000, point.x)) * 10) / 10,
        y: Math.round(Math.max(-2000, Math.min(2000, point.y)) * 10) / 10,
        z: Math.round(Math.max(0, point.z) * 100) / 100
      }
      return [...prev.slice(0, index), clampedPoint, ...prev.slice(index)]
    })
  }, [])

  const cancelPending = useCallback(() => {
    setPending([])
    setDraftCursor(null)
    setCloseDraftAtStart(false)
    setTool('select')
    say('Drawing cancelled.')
  }, [say])

  return {
    tool,
    setTool,
    pending,
    setPending,
    pendingShape,
    setPendingShape,
    draftCursor,
    setDraftCursor,
    closeDraftAtStart,
    setCloseDraftAtStart,
    finishPendingRef,
    drawingAltM,
    setDrawingAltM,
    draftAreaSettings,
    setDraftAreaSettings,
    draftAvoidSettings,
    setDraftAvoidSettings,
    onDraftHover,
    onPendingPositionChange,
    onPendingAltitudeChange,
    onRemovePendingPoint,
    onInsertPendingPoint,
    cancelPending
  }
}
