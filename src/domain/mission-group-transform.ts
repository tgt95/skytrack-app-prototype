import { getMissionRoutes } from './mission-sequence'
import type { StudioMission } from './mission-types'
import { recomputeGeneratedMission } from './mission-generation'

export type MissionGroupRef = { kind: 'route' | 'area' | 'avoid'; id: string }

/** Translate one authored mission group in XY, preserving altitude and identity. */
export function translateMissionGroup(
  mission: StudioMission,
  group: MissionGroupRef,
  delta: { x: number; y: number },
): StudioMission {
  const dx = Number.isFinite(delta.x) ? delta.x : 0
  const dy = Number.isFinite(delta.y) ? delta.y : 0
  if (dx === 0 && dy === 0) return mission
  const move = <T extends { x: number; y: number }>(point: T): T => ({
    ...point,
    x: Math.round((point.x + dx) * 100) / 100,
    y: Math.round((point.y + dy) * 100) / 100,
  })
  let next: StudioMission
  if (group.kind === 'route') {
    const routeIndex = getMissionRoutes(mission).findIndex((route) => route.id === group.id)
    if (routeIndex < 0) return mission
    next = {
      ...mission,
      waypoints: mission.waypoints.map((waypoint) => {
        const belongs = waypoint.routeId === group.id || (!waypoint.routeId && routeIndex === 0)
        return belongs && !waypoint.generatedByArea && !waypoint.generatedByAvoid ? move(waypoint) : waypoint
      }),
    }
  } else if (group.kind === 'area') {
    if (!mission.areas.some((area) => area.id === group.id)) return mission
    next = {
      ...mission,
      areas: mission.areas.map((area) => area.id !== group.id ? area : {
        ...area,
        points: area.points.map(move),
        ...(area.center ? { center: move(area.center) } : {}),
        ...(area.scanLines ? { scanLines: area.scanLines.map((line) => line.map(move)) } : {}),
      }),
      waypoints: mission.waypoints.map((waypoint) => waypoint.generatedByArea === group.id ? move(waypoint) : waypoint),
    }
  } else {
    if (!mission.avoids.some((avoid) => avoid.id === group.id)) return mission
    next = {
      ...mission,
      avoids: mission.avoids.map((avoid) => avoid.id !== group.id ? avoid : {
        ...avoid,
        points: avoid.points.map(move),
        ...(avoid.center ? { center: move(avoid.center) } : {}),
      }),
    }
  }
  return recomputeGeneratedMission(next, mission)
}
