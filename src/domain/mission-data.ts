/* mission-data.ts — locally seeded Building Facade Inspection fixture.
   Mock data only: serpentine facade scan, 16 waypoints, 2 camera actions. */

import { actionLabel, DEFAULT_MISSION_ORIGIN, uid, type EnuVec, type StudioMission, type Waypoint } from './mission-model'

/** Fixed local-tangent origin for the route-local scene (mock site, Redlands).
    Legacy default anchor: missions without their own `origin` resolve here
    via `missionOrigin`. Kept by name for existing importers. */
export const SITE_ORIGIN = { ...DEFAULT_MISSION_ORIGIN } as const

/** Mock facade context block drawn by the scene (x/y meters, z meters up). */
export const SEED_BUILDING = {
  minX: 4,
  maxX: 40,
  minY: -1.5,
  maxY: 0.5,
  minZ: 0,
  maxZ: 50,
  label: 'Facade — mock context'
} as const

const COL_A_X = 8
const COL_B_X = 32
const STANDOFF_Y = 9
const LEVELS = [12, 17, 22, 27, 32, 37, 42, 47]

function seedWaypoints(): Waypoint[] {
  const pts: EnuVec[] = []
  // Serpentine rows: alternate travel direction per level (drone-like scan).
  for (let li = 0; li < LEVELS.length; li += 1) {
    const z = LEVELS[li]
    if (li % 2 === 0) {
      pts.push({ x: COL_A_X, y: STANDOFF_Y, z })
      pts.push({ x: COL_B_X, y: STANDOFF_Y, z })
    } else {
      pts.push({ x: COL_B_X, y: STANDOFF_Y, z })
      pts.push({ x: COL_A_X, y: STANDOFF_Y, z })
    }
  }
  return pts.map((p, i) => {
    const seq = i + 1
    if (seq === 1) {
      return { ...p, id: uid('wp'), seq, routeId: 'route-1', actions: [{ id: uid('act'), kind: 'video-start', label: actionLabel('video-start') }] }
    }
    if (seq === pts.length) {
      return { ...p, id: uid('wp'), seq, routeId: 'route-1', actions: [{ id: uid('act'), kind: 'video-stop', label: actionLabel('video-stop') }] }
    }
    return { ...p, id: uid('wp'), seq, routeId: 'route-1', actions: [] }
  })
}

export function seedMission(): StudioMission {
  return {
    id: uid('mission'),
    name: 'Building Facade Inspection',
    world: 'Blank space',
    worldType: '3D',
    // Video-capable rig: the seed's video-start/video-stop actions must not
    // raise compat warnings (validateMission warns when the vehicle lacks
    // video support). Generic Quad X4 supports all mock actions; the Livox
    // rig stays selectable in the vehicle picker for warning-path QA.
    vehicle: 'Generic Quad X4',
    spawn: { x: 0, y: -18 },
    takeoffAltM: 12,
    targetSpeedMS: 2,
    returnHomeOnEnd: true,
    cameraSafetyCheck: true,
    routes: [{ id: 'route-1', label: 'Route', targetSpeedMS: 2 }],
    waypoints: seedWaypoints(),
    areas: [
      {
        id: uid('zone'),
        label: 'Survey area',
        points: [
          { x: -10, y: -30 },
          { x: 50, y: -30 },
          { x: 50, y: 20 },
          { x: -10, y: 20 }
        ]
      }
    ],
    avoids: [
      {
        id: uid('zone'),
        label: 'Avoid 1 — crane',
        points: [
          { x: 44, y: -6 },
          { x: 52, y: -6 },
          { x: 52, y: 6 },
          { x: 44, y: 6 }
        ]
      }
    ]
  }
}
