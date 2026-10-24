import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { missionOrigin, type StudioMission } from '../../domain/mission-model'
import type { MissionSceneHandle, SceneReadiness } from '../scene/mission-scene'
import type { SimApi } from '../simulation/simulation'
import type { Stage } from './studio-map-overlays'

interface UseStudioSceneSessionArgs {
  mission: StudioMission
  stage: Stage
  sceneReadiness: SceneReadiness
  setSceneReadiness: Dispatch<SetStateAction<SceneReadiness>>
  setStage: Dispatch<SetStateAction<Stage>>
  sim: Pick<SimApi, 'status' | 'abort'>
  say: (message: string) => void
}

export function useStudioSceneSession({
  mission,
  stage,
  sceneReadiness,
  setSceneReadiness,
  setStage,
  sim,
  say
}: UseStudioSceneSessionArgs) {
  const sceneRef = useRef<MissionSceneHandle>(null)
  const synchronizedOriginRef = useRef(missionOrigin(mission))
  const previewPositionRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const previewCaptureRef = useRef<string | null>(null)
  const sceneReadinessRef = useRef<SceneReadiness>('loading')
  const onSceneReadinessChange = useCallback((readiness: SceneReadiness) => {
    sceneReadinessRef.current = readiness
    setSceneReadiness(readiness)
  }, [setSceneReadiness])

  useEffect(() => {
    if (mission.worldType !== '2D' || sceneReadiness !== 'ready') return
    const nextOrigin = missionOrigin(mission)
    const previousOrigin = synchronizedOriginRef.current
    if (nextOrigin.lat === previousOrigin.lat && nextOrigin.lng === previousOrigin.lng) return
    synchronizedOriginRef.current = nextOrigin
    sceneRef.current?.flyToLocation({ latitude: nextOrigin.lat, longitude: nextOrigin.lng })
  }, [mission, sceneReadiness])

  useEffect(() => {
    if (sceneReadiness === 'ready' || stage !== 'simulation') return
    if (sim.status === 'running' || sim.status === 'paused') sim.abort()
    setStage('design')
    say('Simulation stopped. 3D scene unavailable; retry 3D from Design.')
  }, [sceneReadiness, stage, sim, say, setStage])

  return { sceneRef, previewPositionRef, previewCaptureRef, sceneReadinessRef, onSceneReadinessChange }
}
