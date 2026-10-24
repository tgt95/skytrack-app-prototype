import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { SceneTool } from '../../domain/mission-model'
import type { SceneReadiness } from '../scene/mission-scene'
import type { Stage } from './studio-map-overlays'
import type { AppTab } from './studio-left-rail'
import type { PendingMissionPoint } from './use-drawing-session'
import { sceneGateReason } from './use-studio-simulation-model'

interface UseStudioStageActionsArgs {
  gate: { ok: boolean; reason: string | null }
  sceneReadinessRef: MutableRefObject<SceneReadiness>
  say: (message: string) => void
  setStage: Dispatch<SetStateAction<Stage>>
  setAppTab: Dispatch<SetStateAction<AppTab>>
  setTool: Dispatch<SetStateAction<SceneTool>>
  setPending: Dispatch<SetStateAction<PendingMissionPoint[]>>
  setSimSettingsOpen: Dispatch<SetStateAction<boolean>>
}

export function useStudioStageActions({
  gate,
  sceneReadinessRef,
  say,
  setStage,
  setAppTab,
  setTool,
  setPending,
  setSimSettingsOpen
}: UseStudioStageActionsArgs) {
  const gotoAppTab = useCallback((next: AppTab) => {
    setAppTab(next)
    if (next === 'plan') say('Plan tab. Mission planner.')
    else if (next === 'fly') say('Fly tab, placeholder. Flight execution is not implemented in this prototype.')
    else say('Report tab, placeholder. Mission reports are not implemented in this prototype.')
  }, [say, setAppTab])

  const gotoStage = useCallback((next: Stage) => {
    setAppTab('plan')
    if (next === 'simulation' && (!gate.ok || sceneReadinessRef.current !== 'ready')) {
      say(`Simulation locked. ${gate.reason ?? sceneGateReason(sceneReadinessRef.current) ?? '3D scene is not ready.'}`)
      return
    }
    setStage(next)
    setTool('select')
    setPending([])
    setSimSettingsOpen(false)
    say(next === 'simulation' ? 'Simulation stage (mock). Design preserved.' : 'Design stage.')
  }, [gate, say, sceneReadinessRef, setAppTab, setPending, setSimSettingsOpen, setStage, setTool])

  return { gotoAppTab, gotoStage }
}
