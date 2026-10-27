/* mission-generation.ts — pure mission generation orchestration.
   Area scan waypoint generation and Avoid detour refresh, lifted out of the
   Mission Studio React shell (src/pages/mission-studio-page.tsx) so mission calculation stays in
   the domain layer. No React, no Cesium, no I/O.

   Behavior contract — this module must stay byte-for-byte equivalent to the
   pre-extraction `regenerateAreaWaypoints` / `refreshDetours` /
   `recomputeGenerated` callbacks in src/pages/mission-studio-page.tsx:
   - Area scan lanes are recomputed from the Area geometry and settings, and
     the recomputed lanes are written back onto the returned mission's areas.
   - Prior generated waypoints are reused by position (0.1 m cell neighbourhood
     match, ±0.05 m tolerance) first and by array index second, so IDs,
     per-point altitude overrides and camera actions survive regeneration.
   - Authored waypoints are never moved or rewritten; they are only re-ordered
     into the Route/Area block sequence and renumbered.
   - Avoid detours are recomputed after the Area pass and reuse prior detour
     IDs per Avoid zone.
   - A photo action is minted for capture points that do not already carry a
     photo action on the matched prior waypoint; non-capture points keep only
     their non-photo actions.

   ID generation is unchanged by default: identifiers come from the shared
   `uid` in mission-model.ts. `MissionGenerationOptions.idFactory` only exists
   so deterministic fixtures can pin the identifiers minted *by this module*
   (Area waypoints and photo actions). It does not reach the Avoid detour
   pass, which is owned by `withAvoidDetours` in mission-model.ts and always
   uses the shared `uid`. */

import {
  actionLabel,
  getAreaFlightAltitudeM,
  uid,
  type StudioMission,
  type Waypoint
} from './mission-types'
import {
  getMissionRoutes,
  getMissionSequence,
  normalizeMissionRoutes,
  renumber
} from './mission-sequence'
import { generateAreaCapturePath, generateAreaScan } from './area-scan'
import { withAvoidDetours } from './avoid-detour'

/** Mints identifiers for generated waypoints and camera actions. */
export type MissionIdFactory = (prefix: string) => string

export interface MissionGenerationOptions {
  /** Identifier factory for IDs minted by this module. Defaults to `uid`. */
  idFactory?: MissionIdFactory
}

/** Cells are 0.1 m wide; a prior waypoint matches a capture point when both
    x and y differ by at most 0.05 m (one cell of slack either way). */
const PRIOR_CELL_SIZE_M = 10
const PRIOR_MATCH_TOLERANCE_M = 0.05

function resolveIdFactory(options?: MissionGenerationOptions): MissionIdFactory {
  return options?.idFactory ?? uid
}

/** Group prior generated waypoints into 0.1 m cells so a capture point can
    find the closest prior waypoint without scanning the whole list. */
function indexPriorByCell(prior: Waypoint[]): Map<string, Waypoint[]> {
  const priorByCell = new Map<string, Waypoint[]>()
  for (const waypoint of prior) {
    const key = `${Math.floor(waypoint.x * PRIOR_CELL_SIZE_M)}:${Math.floor(waypoint.y * PRIOR_CELL_SIZE_M)}`
    const cell = priorByCell.get(key) ?? []
    cell.push(waypoint)
    priorByCell.set(key, cell)
  }
  return priorByCell
}

/** Find an unused prior waypoint at (x, y), searching the 3x3 cell
    neighbourhood. Returns undefined when no prior waypoint is close enough. */
function findPriorAt(
  priorByCell: Map<string, Waypoint[]>,
  reusedPriorIds: Set<string>,
  x: number,
  y: number
): Waypoint | undefined {
  const cellX = Math.floor(x * PRIOR_CELL_SIZE_M)
  const cellY = Math.floor(y * PRIOR_CELL_SIZE_M)
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const candidates = priorByCell.get(`${cellX + dx}:${cellY + dy}`) ?? []
      const match = candidates.find(
        (waypoint) =>
          !reusedPriorIds.has(waypoint.id) &&
          Math.abs(waypoint.x - x) <= PRIOR_MATCH_TOLERANCE_M &&
          Math.abs(waypoint.y - y) <= PRIOR_MATCH_TOLERANCE_M
      )
      if (match) return match
    }
  }
  return undefined
}

/**
 * Regenerate the Area scan waypoints of a mission.
 *
 * Recomputes each Area's scan lanes, rebuilds the generated waypoints for
 * every Area (reusing prior generated IDs, altitude overrides and camera
 * actions where the geometry still matches), re-orders authored and generated
 * waypoints into the Route/Area block sequence, and renumbers the result.
 * Authored waypoints and Avoid detours are left untouched.
 */
export function regenerateAreaWaypoints(
  next: StudioMission,
  options?: MissionGenerationOptions
): StudioMission {
  const idFactory = resolveIdFactory(options)
  const areas = next.areas.map((area) => ({ ...area, scanLines: generateAreaScan(area) }))
  const routeBase = normalizeMissionRoutes({ ...next, areas })
  const authored = routeBase.waypoints.filter((wp) => !wp.generatedByArea && !wp.generatedByAvoid)
  const generatedByArea = new Map<string, Waypoint[]>(
    areas.map((area) => {
      const lines = area.scanLines ?? []
      const prior = next.waypoints.filter((wp) => wp.generatedByArea === area.id)
      const points = generateAreaCapturePath(area, lines)
      const reusedPriorIds = new Set<string>()
      const priorByCell = indexPriorByCell(prior)
      const areaFlightAltM = getAreaFlightAltitudeM(area, routeBase.takeoffAltM, routeBase.worldType ?? '3D')
      const waypoints = points.map((p, index) => {
        const x = Math.round(p.x * 100) / 100
        const y = Math.round(p.y * 100) / 100
        const matchedPrior = findPriorAt(priorByCell, reusedPriorIds, x, y)
        const indexedPrior =
          prior[index] && !reusedPriorIds.has(prior[index].id) ? prior[index] : undefined
        const reusedId = matchedPrior?.id ?? indexedPrior?.id
        if (reusedId) reusedPriorIds.add(reusedId)
        const altitudeOverrideM = matchedPrior?.altitudeOverrideM
        const hasAltitudeOverride = Number.isFinite(altitudeOverrideM)
        const matchedActions = matchedPrior?.actions ?? []
        const photoActions = matchedActions.filter((action) => action.kind === 'photo')
        const actions = p.capturePhoto
          ? photoActions.length > 0
            ? matchedActions
            : [...matchedActions, { id: idFactory('act'), kind: 'photo' as const, label: actionLabel('photo') }]
          : matchedActions.filter((action) => action.kind !== 'photo')
        const waypoint: Waypoint = {
          id: reusedId ?? idFactory('wp'),
          seq: 0,
          x,
          y,
          z: hasAltitudeOverride ? (altitudeOverrideM as number) : areaFlightAltM,
          ...(hasAltitudeOverride ? { altitudeOverrideM: altitudeOverrideM as number } : {}),
          actions,
          generatedByArea: area.id
        }
        return waypoint
      })
      return [area.id, waypoints] as const
    })
  )
  const authoredByRoute = new Map<string, Waypoint[]>(
    getMissionRoutes(routeBase).map((route, index) => [
      route.id,
      authored.filter((waypoint) => waypoint.routeId === route.id || (!waypoint.routeId && index === 0))
    ])
  )
  const ordered = getMissionSequence({ ...routeBase, areas }).flatMap((item) =>
    item.type === 'route'
      ? authoredByRoute.get(item.id) ?? []
      : generatedByArea.get(item.id) ?? []
  )
  return { ...routeBase, areas, waypoints: renumber(ordered) }
}

/**
 * Strip obsolete Avoid detours and deterministically regenerate them from the
 * current authored + Area route, reusing prior detour IDs per Avoid.
 */
export function refreshAvoidDetours(next: StudioMission, priors: StudioMission): StudioMission {
  return withAvoidDetours(next, priors.waypoints.filter((wp) => wp.generatedByAvoid))
}

/**
 * Full generated-route recompute: Area scan waypoints first, then Avoid
 * detours around the resulting effective route. Authored waypoints untouched.
 */
export function recomputeGeneratedMission(
  next: StudioMission,
  priors: StudioMission,
  options?: MissionGenerationOptions
): StudioMission {
  return refreshAvoidDetours(regenerateAreaWaypoints(next, options), priors)
}
