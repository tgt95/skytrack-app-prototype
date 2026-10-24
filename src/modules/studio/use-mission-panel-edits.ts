import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { SceneSelection, StudioMission } from '../../domain/mission-model'
import { regenerateAreaWaypoints, refreshAvoidDetours } from '../../domain/mission-generation'
import { snapshotOf } from '../../domain/mission-model'
import type { StudioMissionDocumentAction } from './mission-document'

interface UseMissionPanelEditsArgs {
  mission: StudioMission
  selection: SceneSelection | null
  setSelection: Dispatch<SetStateAction<SceneSelection | null>>
  commit: (next: StudioMission, label?: string) => void
  dispatchDocument: Dispatch<StudioMissionDocumentAction>
  panelPreviewBaseRef: MutableRefObject<StudioMission | null>
  say: (message: string) => void
}

export function useMissionPanelEdits({
  mission,
  selection,
  setSelection,
  commit,
  dispatchDocument,
  panelPreviewBaseRef,
  say
}: UseMissionPanelEditsArgs) {
  const updateMissionFromPanel = useCallback((next: StudioMission, label?: string) => {
    const areasChanged = JSON.stringify(mission.areas) !== JSON.stringify(next.areas)
    const routingChanged = areasChanged
      || JSON.stringify(mission.avoids) !== JSON.stringify(next.avoids)
      || JSON.stringify(mission.waypoints) !== JSON.stringify(next.waypoints)
      || mission.takeoffAltM !== next.takeoffAltM
    const takeoffDelta = next.takeoffAltM - mission.takeoffAltM
    const shiftGeneratedAlt = next.worldType !== '2D' && Number.isFinite(takeoffDelta) && takeoffDelta !== 0
    const priorGeneratedIds = shiftGeneratedAlt
      ? new Set(mission.waypoints.filter((waypoint) => waypoint.generatedByArea).map((waypoint) => waypoint.id))
      : null
    const keepSelection = selection
    let out = next
    if (areasChanged) out = regenerateAreaWaypoints(out)
    if (shiftGeneratedAlt && priorGeneratedIds) {
      out = {
        ...out,
        waypoints: out.waypoints.map((waypoint) =>
          waypoint.generatedByArea && priorGeneratedIds.has(waypoint.id) && !Number.isFinite(waypoint.altitudeOverrideM) && Number.isFinite(waypoint.z)
            ? { ...waypoint, z: Math.round((waypoint.z + takeoffDelta) * 100) / 100 }
            : waypoint
        )
      }
    }
    if (routingChanged) out = refreshAvoidDetours(out, mission)
    commit(out, label)
    if (keepSelection) setSelection(keepSelection)
  }, [commit, mission, selection, setSelection])

  const preparePanelPreview = useCallback((next: StudioMission, base: StudioMission): StudioMission => {
    const areasChanged = JSON.stringify(base.areas) !== JSON.stringify(next.areas)
    const routingChanged = areasChanged
      || JSON.stringify(base.avoids) !== JSON.stringify(next.avoids)
      || JSON.stringify(base.waypoints) !== JSON.stringify(next.waypoints)
      || base.takeoffAltM !== next.takeoffAltM
    let out = areasChanged ? regenerateAreaWaypoints(next) : next
    if (routingChanged) out = refreshAvoidDetours(out, base)
    return out
  }, [])

  const previewMissionFromPanel = useCallback((next: StudioMission) => {
    const base = panelPreviewBaseRef.current ?? mission
    panelPreviewBaseRef.current ??= mission
    dispatchDocument({ type: 'set', next: preparePanelPreview(next, base) })
  }, [dispatchDocument, mission, panelPreviewBaseRef, preparePanelPreview])

  const commitPanelPreview = useCallback((next: StudioMission, label?: string) => {
    const base = panelPreviewBaseRef.current ?? mission
    const out = preparePanelPreview(next, base)
    panelPreviewBaseRef.current = null
    if (snapshotOf(base) === snapshotOf(out)) {
      dispatchDocument({ type: 'set', next: out })
      return
    }
    const keepSelection = selection
    dispatchDocument({ type: 'commit', next: out, from: snapshotOf(base) })
    if (keepSelection) setSelection(keepSelection)
    if (label) say(label)
  }, [dispatchDocument, mission, panelPreviewBaseRef, preparePanelPreview, say, selection, setSelection])

  const cancelPanelPreview = useCallback(() => {
    const base = panelPreviewBaseRef.current
    panelPreviewBaseRef.current = null
    if (base) dispatchDocument({ type: 'set', next: base })
  }, [dispatchDocument, panelPreviewBaseRef])

  return { updateMissionFromPanel, previewMissionFromPanel, commitPanelPreview, cancelPanelPreview }
}
