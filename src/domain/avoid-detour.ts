import {
  round2,
  uid,
  type AvoidZone,
  type EnuPoint,
  type EnuVec,
  type StudioMission,
  type Waypoint
} from './mission-types'
import { renumber } from './mission-sequence'
import { isValidRing, pointInRing, polylineIntersectsRing } from './area-scan'

/* ------------------------- avoid detours (mock geometry) -------------------------
   Prototype-only horizontal rerouting: when a route leg crosses an Avoid
   footprint below top + clearance, insert generated detour waypoints around an
   expanded bounding box. Authored waypoints are never moved. Not flight planning. */

export function avoidBaseM(avoid: AvoidZone): number {
  return Math.max(0, Number.isFinite(avoid.baseAltM) ? (avoid.baseAltM as number) : 0)
}

export function avoidTopM(avoid: AvoidZone): number {
  return avoidBaseM(avoid) + Math.max(0, avoid.heightM ?? 15) + Math.max(0, avoid.clearanceM ?? 2)
}

/** Zero height + zero clearance defines no obstacle volume, so route
    conflict/detour checks skip the zone. Zero height + positive clearance
    still protects the clearance layer below top. */
export function avoidHasVolume(avoid: AvoidZone): boolean {
  return avoidTopM(avoid) > 0
}

export function isAuthoredWaypoint(wp: Waypoint): boolean {
  return !wp.generatedByArea && !wp.generatedByAvoid
}

export function countDetours(mission: StudioMission): number {
  return mission.waypoints.filter((wp) => wp.generatedByAvoid).length
}


/** Two deterministic corner points routing leg a→b around avoid's expanded
    bounding box, or null when the leg is clear, flies over, has an endpoint
    inside, or no side is viable. Corners are kept outside every Avoid
    footprint; legs are verified against the processed Avoid here, while legs
    crossing other Avoids are left for later sweep passes to reroute. */
export function detourAroundAvoid(a: EnuVec, b: EnuVec, avoid: AvoidZone, others: AvoidZone[] = []): EnuPoint[] | null {
  const ring = avoid.points
  if (!isValidRing(ring)) return null
  const top = avoidTopM(avoid)
  if (top <= 0) return null
  if (Math.min(a.z, b.z) > top) return null
  // Leg fully below the prism base passes under it: no detour.
  if (Math.max(a.z, b.z) < avoidBaseM(avoid)) return null
  const a2d = { x: a.x, y: a.y }
  const b2d = { x: b.x, y: b.y }
  if (pointInRing(a2d, ring) || pointInRing(b2d, ring)) return null
  if (!polylineIntersectsRing([a2d, b2d], ring)) return null
  const MARGIN = 2
  const xs = ring.map((p) => p.x)
  const ys = ring.map((p) => p.y)
  const minX = Math.min(...xs) - MARGIN
  const maxX = Math.max(...xs) + MARGIN
  const minY = Math.min(...ys) - MARGIN
  const maxY = Math.max(...ys) + MARGIN
  const nw = { x: minX, y: maxY }
  const ne = { x: maxX, y: maxY }
  const se = { x: maxX, y: minY }
  const sw = { x: minX, y: minY }
  const z = Math.max(a.z, b.z)
  const sides: [EnuPoint, EnuPoint][] = [[nw, ne], [sw, se], [sw, nw], [se, ne]]
  const candidates = others.filter((o) => o.id !== avoid.id && isValidRing(o.points) && avoidTopM(o) > 0)
  const pointClear = (p: EnuPoint): boolean => {
    if (pointInRing(p, ring)) return false
    return !candidates.some((o) => z <= avoidTopM(o) && pointInRing(p, o.points))
  }
  const legClearOfSelf = (p: EnuVec, q: EnuVec): boolean =>
    !polylineIntersectsRing([{ x: p.x, y: p.y }, { x: q.x, y: q.y }], ring)
  let best: { pts: [EnuPoint, EnuPoint]; len: number } | null = null
  for (const [c1, c2] of sides) {
    const d1 = Math.hypot(a.x - c1.x, a.y - c1.y)
    const d2 = Math.hypot(a.x - c2.x, a.y - c2.y)
    const first = d1 <= d2 ? c1 : c2
    const second = first === c1 ? c2 : c1
    if (!pointClear(first) || !pointClear(second)) continue
    const v1: EnuVec = { ...first, z }
    const v2: EnuVec = { ...second, z }
    if (!legClearOfSelf(a, v1) || !legClearOfSelf(v1, v2) || !legClearOfSelf(v2, b)) continue
    const len =
      Math.hypot(v1.x - a.x, v1.y - a.y, v1.z - a.z) +
      Math.hypot(v2.x - v1.x, v2.y - v1.y) +
      Math.hypot(b.x - v2.x, b.y - v2.y, b.z - v2.z)
    if (!best || len < best.len) best = { pts: [first, second], len }
  }
  return best ? [best.pts[0], best.pts[1]] : null
}

/** Recompute generated Avoid detour waypoints from the current authored and
    Area-generated route. Strips obsolete detours, preserves authored IDs,
    coordinates, order and actions, reuses prior detour IDs per Avoid where the
    regenerated sequence aligns, and renumbers. Avoids are swept in order and
    the sweep repeats (bounded) so a detour around one Avoid that clips another
    is rerouted in a later pass; residual crossings stay blocking validation
    issues. Deterministic for fixed inputs. */
export function withAvoidDetours(mission: StudioMission, priorDetours: Waypoint[] = []): StudioMission {
  const priorByAvoid = new Map<string, Waypoint[]>()
  for (const d of priorDetours) {
    if (!d.generatedByAvoid) continue
    const list = priorByAvoid.get(d.generatedByAvoid) ?? []
    list.push(d)
    priorByAvoid.set(d.generatedByAvoid, list)
  }
  const usedByAvoid = new Map<string, number>()
  let wps = mission.waypoints.filter((wp) => !wp.generatedByAvoid)
  for (let pass = 0; pass < 4; pass += 1) {
    let insertedAny = false
    for (const avoid of mission.avoids) {
      if (!isValidRing(avoid.points)) continue
      const top = avoidTopM(avoid)
      if (top <= 0) continue
      const base = avoidBaseM(avoid)
      const pts: EnuVec[] = [...wps]
      if (pts.some((p) => p.z <= top && p.z >= base && pointInRing({ x: p.x, y: p.y }, avoid.points))) continue
      const others = mission.avoids.filter((o) => o.id !== avoid.id)
      let offset = 0
      for (let k = 0; k < pts.length - 1; k += 1) {
        const a = pts[k]
        const c = pts[k + 1]
        if (Math.min(a.z, c.z) > top) continue
        if (Math.max(a.z, c.z) < base) continue
        if (!polylineIntersectsRing([{ x: a.x, y: a.y }, { x: c.x, y: c.y }], avoid.points)) continue
        const corners = detourAroundAvoid(a, c, avoid, others)
        if (!corners) continue
        const z = round2(Math.max(a.z, c.z))
        const at = k + 1 + offset
        const made: Waypoint[] = corners.map((p) => {
          const prior = (priorByAvoid.get(avoid.id) ?? [])[usedByAvoid.get(avoid.id) ?? 0]
          const matchedPrior = (priorByAvoid.get(avoid.id) ?? []).find((waypoint) => Math.abs(waypoint.x - round2(p.x)) <= 0.05 && Math.abs(waypoint.y - round2(p.y)) <= 0.05)
          usedByAvoid.set(avoid.id, (usedByAvoid.get(avoid.id) ?? 0) + 1)
          const altitudeOverrideM = matchedPrior?.altitudeOverrideM
          return {
            id: prior?.id ?? uid('wp'),
            seq: 0,
            x: round2(p.x),
            y: round2(p.y),
            z: Number.isFinite(altitudeOverrideM) ? altitudeOverrideM as number : z,
            ...(Number.isFinite(altitudeOverrideM) ? { altitudeOverrideM } : {}),
            actions: [],
            generatedByAvoid: avoid.id
          }
        })
        wps = [...wps.slice(0, at), ...made, ...wps.slice(at)]
        offset += made.length
        insertedAny = true
        if (wps.filter((wp) => wp.generatedByAvoid).length >= 64) break
      }
    }
    if (!insertedAny) break
  }
  return { ...mission, waypoints: renumber(wps) }
}
