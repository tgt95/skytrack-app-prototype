import { useEffect } from 'react'
import type { SceneSelection, StudioMission } from '../../domain/mission-model'
import type { SimApi } from '../simulation/simulation'
import type { AppTab } from './studio-left-rail'
import type { Stage } from './studio-map-overlays'

interface UseMissionStudioTestBridgeArgs {
  stage: Stage
  appTab: AppTab
  tool: string
  sim: SimApi
  mission: StudioMission
  selection: SceneSelection | null
  announce: string
  issueCount: number
  gateOk: boolean
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
  newMission: () => void
  resetToSeed: () => void
}

export function useMissionStudioTestBridge({
  stage,
  appTab,
  tool,
  sim,
  mission,
  selection,
  announce,
  issueCount,
  gateOk,
  dirty,
  canUndo,
  canRedo,
  newMission,
  resetToSeed
}: UseMissionStudioTestBridgeArgs) {
  useEffect(() => {
    window.__missionStudio = {
      ...window.__missionStudio,
      stage: () => stage,
      appTab: () => appTab,
      tool: () => tool,
      simStatus: () => sim.status,
      simTime: () => sim.simT,
      waypointCount: () => mission.waypoints.length,
      waypointIds: () => mission.waypoints.map((waypoint) => waypoint.id),
      waypointSeqs: () => mission.waypoints.map((waypoint) => `${waypoint.id}:${waypoint.seq}:${waypoint.x},${waypoint.y},${waypoint.z}`),
      waypointFlags: () => mission.waypoints.map((waypoint) => `${waypoint.id}:${waypoint.generatedByArea ? 'A' : waypoint.generatedByAvoid ? 'V' : '-'}`),
      selection: () => selection,
      vehicle: () => mission.vehicle,
      world: () => mission.world,
      announce: () => announce,
      issueCount: () => issueCount,
      gateOk: () => gateOk,
      dirty: () => dirty,
      canUndo: () => canUndo,
      canRedo: () => canRedo,
      newMission: () => newMission(),
      resetToSeed: () => resetToSeed()
    }
  })
}
