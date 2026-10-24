import {
  DEFAULT_RECON_FLIGHT_SETTINGS,
  MOCK_RECON_CAMERA_PROFILE,
  round2,
  type EnuPoint,
  type MissionArea,
  type Waypoint
} from './mission-types'

/* Segment (a,b) intersects polygon ring (2D) — used for avoid-zone checks. */
export function segIntersectsSeg(a: EnuPoint, b: EnuPoint, c: EnuPoint, d: EnuPoint): boolean {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const s = { x: d.x - c.x, y: d.y - c.y }
  const denom = r.x * s.y - r.y * s.x
  if (Math.abs(denom) < 1e-9) return false
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / denom
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / denom
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

export function pointInRing(p: EnuPoint, ring: EnuPoint[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]
    const b = ring[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

export function isValidRing(ring: EnuPoint[]): boolean {
  if (ring.length < 3) return false
  const distinct = new Set(ring.map((p) => `${p.x.toFixed(5)},${p.y.toFixed(5)}`))
  if (distinct.size < 3) return false
  let area2 = 0
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    area2 += a.x * b.y - b.x * a.y
    for (let j = i + 1; j < ring.length; j += 1) {
      if (j === i || j === i + 1 || (i === 0 && j === ring.length - 1)) continue
      if (segIntersectsSeg(a, b, ring[j], ring[(j + 1) % ring.length])) return false
    }
  }
  return Math.abs(area2) > 1e-4
}

/** Deterministic closed ring for a circular footprint. */
export function circleFootprint(center: EnuPoint, radiusM: number, vertices = 48): EnuPoint[] {
  const radius = Number.isFinite(radiusM) ? Math.max(0, radiusM) : 0
  const count = Math.max(12, Math.floor(vertices))
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count
    return {
      x: Math.round((center.x + Math.cos(angle) * radius) * 1000) / 1000,
      y: Math.round((center.y + Math.sin(angle) * radius) * 1000) / 1000
    }
  })
}

/** Nominal square nadir footprint derived from the mock payload already shown
    by the Recon summary. Only one sensor dimension is specified in the mock,
    so both image axes use it; this is a prototype estimate, not a calibrated
    camera footprint. */
export function getMockReconNadirFootprintM(altitudeM: number): number {
  const safeAltitudeM = Number.isFinite(altitudeM)
    ? Math.max(1, altitudeM)
    : DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM
  return safeAltitudeM * MOCK_RECON_CAMERA_PROFILE.sensorWidthMm / MOCK_RECON_CAMERA_PROFILE.focalLengthMm
}

/** Mock ground-sample-distance estimate for the same sensor profile used by
    the nominal footprint. This remains a flat-ground prototype estimate. */
export function getMockReconGsdCmPerPx(altitudeM: number): number {
  const safeAltitudeM = Number.isFinite(altitudeM)
    ? Math.max(1, altitudeM)
    : DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM
  return safeAltitudeM * 100 * MOCK_RECON_CAMERA_PROFILE.sensorWidthMm
    / (MOCK_RECON_CAMERA_PROFILE.focalLengthMm * MOCK_RECON_CAMERA_PROFILE.resolutionWidthPx)
}

/** Project a mock square camera image onto the flat z=0 reference plane.
    `pitchDeg` follows Mission Studio convention: -90° is nadir and 0° is
    horizontal. Return null when any image corner points above or too close to
    the horizon. The single sensor dimension is used for both FOV axes. */
export function projectMockReconFootprintToGround(
  waypoint: Pick<Waypoint, 'x' | 'y' | 'z'>,
  forwardDirection: EnuPoint,
  pitchDeg: number,
  groundElevationM = 0
): EnuPoint[] | null {
  if (![waypoint.x, waypoint.y, waypoint.z, forwardDirection.x, forwardDirection.y, pitchDeg, groundElevationM].every(Number.isFinite)) return null
  const heightM = waypoint.z - groundElevationM
  if (heightM <= 0.1) return null

  const directionLength = Math.hypot(forwardDirection.x, forwardDirection.y)
  const forwardX = directionLength > 0.001 ? forwardDirection.x / directionLength : 0
  const forwardY = directionLength > 0.001 ? forwardDirection.y / directionLength : 1

  const downAngle = Math.min(90, Math.max(0, Math.abs(pitchDeg))) * Math.PI / 180
  const sinDown = Math.sin(downAngle)
  const cosDown = Math.cos(downAngle)
  const rightX = forwardY
  const rightY = -forwardX
  const tanHalfFov = MOCK_RECON_CAMERA_PROFILE.sensorWidthMm / (2 * MOCK_RECON_CAMERA_PROFILE.focalLengthMm)
  const corners = [
    { right: -1, imageUp: 1 },
    { right: 1, imageUp: 1 },
    { right: 1, imageUp: -1 },
    { right: -1, imageUp: -1 }
  ] as const

  const projected: EnuPoint[] = []
  for (const corner of corners) {
    const rayX = forwardX * cosDown + rightX * corner.right * tanHalfFov + forwardX * sinDown * corner.imageUp * tanHalfFov
    const rayY = forwardY * cosDown + rightY * corner.right * tanHalfFov + forwardY * sinDown * corner.imageUp * tanHalfFov
    const rayZ = -sinDown + cosDown * corner.imageUp * tanHalfFov
    const downwardComponent = -rayZ
    if (downwardComponent < 0.05) return null
    const distance = heightM / downwardComponent
    projected.push({
      x: waypoint.x + rayX * distance,
      y: waypoint.y + rayY * distance
    })
  }
  return projected
}

/** Capture interval from a nadir-equivalent mock image footprint and overlap. */
export function getReconOverlapSpacingM(
  altitudeM: number,
  overlapPct: number,
  fallbackOverlapPct = DEFAULT_RECON_FLIGHT_SETTINGS.frontOverlapPct
): number {
  const safeOverlapPct = Number.isFinite(overlapPct)
    ? Math.min(95, Math.max(50, overlapPct))
    : fallbackOverlapPct
  return Math.max(0.25, getMockReconNadirFootprintM(altitudeM) * (1 - safeOverlapPct / 100))
}

/** Effective cross-track lane spacing. Recon uses its Side overlap target;
    legacy/manual Area scans keep their explicit line spacing. */
export function getAreaScanSpacingM(area: Pick<MissionArea, 'lineSpacingM' | 'reconnaissance'>): number {
  if (area.reconnaissance?.enabled) {
    return getReconOverlapSpacingM(
      area.reconnaissance.altitudeM,
      area.reconnaissance.sideOverlapPct,
      DEFAULT_RECON_FLIGHT_SETTINGS.sideOverlapPct
    )
  }
  const spacingRaw = area.lineSpacingM ?? 6
  return Math.max(0.25, Number.isFinite(spacingRaw) ? spacingRaw : 6)
}

/** Effective along-track photo spacing for an enabled Area Recon scan. */
export function getAreaPhotoSpacingM(area: Pick<MissionArea, 'reconnaissance'>): number {
  const reconnaissance = area.reconnaissance ?? DEFAULT_RECON_FLIGHT_SETTINGS
  return getReconOverlapSpacingM(
    reconnaissance.altitudeM,
    reconnaissance.frontOverlapPct,
    DEFAULT_RECON_FLIGHT_SETTINGS.frontOverlapPct
  )
}

/** Build straight scan lanes clipped to a simple polygon in local ENU meters. */
export function generateAreaScan(area: Pick<MissionArea, 'points' | 'lineSpacingM' | 'orientationDeg' | 'paddingM' | 'reconnaissance'>): EnuPoint[][] {
  if (!isValidRing(area.points)) return []
  const paddingRaw = area.paddingM ?? 0
  const spacing = getAreaScanSpacingM(area)
  const padding = Math.max(0, Number.isFinite(paddingRaw) ? paddingRaw : 0)
  const origin = area.points.reduce((acc, p) => ({ x: acc.x + p.x / area.points.length, y: acc.y + p.y / area.points.length }), { x: 0, y: 0 })
  const generatePass = (orientationDeg: number): EnuPoint[][] => {
    const angle = ((Number.isFinite(orientationDeg) ? orientationDeg : 0) * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const toLocal = (p: EnuPoint) => {
      const dx = p.x - origin.x
      const dy = p.y - origin.y
      return { u: dx * cos + dy * sin, v: -dx * sin + dy * cos }
    }
    const toWorld = (u: number, v: number): EnuPoint => ({
      x: origin.x + u * cos - v * sin,
      y: origin.y + u * sin + v * cos
    })
    const ring = area.points.map(toLocal)
    const vMin = Math.min(...ring.map((p) => p.v))
    const vMax = Math.max(...ring.map((p) => p.v))
    const lines: EnuPoint[][] = []
    let reverse = false
    let lane = 0
    for (let v = vMin + Math.min(spacing / 2, (vMax - vMin) / 2); v <= vMax + 1e-7 && lane < 1000; v += spacing, lane += 1) {
      const crossings: number[] = []
      for (let i = 0; i < ring.length; i += 1) {
        const a = ring[i]
        const b = ring[(i + 1) % ring.length]
        if ((a.v <= v && b.v > v) || (b.v <= v && a.v > v)) {
          crossings.push(a.u + ((v - a.v) * (b.u - a.u)) / (b.v - a.v))
        }
      }
      crossings.sort((a, b) => a - b)
      const spans: [number, number][] = []
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const start = crossings[i] + padding
        const end = crossings[i + 1] - padding
        if (end - start >= 0.25) spans.push([start, end])
      }
      if (reverse) spans.reverse()
      for (const [start, end] of spans) {
        lines.push(reverse ? [toWorld(end, v), toWorld(start, v)] : [toWorld(start, v), toWorld(end, v)])
        reverse = !reverse
      }
    }
    return lines
  }

  const rawOrientationDeg = area.orientationDeg ?? 0
  const orientationDeg = Number.isFinite(rawOrientationDeg) ? rawOrientationDeg : 0
  const firstPass = generatePass(orientationDeg)
  if (area.reconnaissance?.flightPattern !== 'double') return firstPass
  return [...firstPass, ...generatePass(orientationDeg + 90)]
}

function pointOnSegment(point: EnuPoint, a: EnuPoint, b: EnuPoint): boolean {
  const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x)
  if (Math.abs(cross) > 1e-6) return false
  const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)
  const length2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
  return dot >= -1e-6 && dot <= length2 + 1e-6
}

function insideOrOnRing(point: EnuPoint, ring: EnuPoint[]): boolean {
  return pointInRing(point, ring) || ring.some((vertex, index) => pointOnSegment(point, vertex, ring[(index + 1) % ring.length]))
}

/** Return true only when every interior span of a connector stays within the polygon. */
function segmentInsideRing(a: EnuPoint, b: EnuPoint, ring: EnuPoint[]): boolean {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length2 = dx * dx + dy * dy
  if (length2 < 1e-10) return true
  const cuts = [0, 1]
  for (let index = 0; index < ring.length; index += 1) {
    const c = ring[index]
    const d = ring[(index + 1) % ring.length]
    const ex = d.x - c.x
    const ey = d.y - c.y
    const denom = dx * ey - dy * ex
    const cx = c.x - a.x
    const cy = c.y - a.y
    if (Math.abs(denom) > 1e-9) {
      const t = (cx * ey - cy * ex) / denom
      const u = (cx * dy - cy * dx) / denom
      if (t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8) cuts.push(Math.max(0, Math.min(1, t)))
      continue
    }
    if (Math.abs(cx * dy - cy * dx) > 1e-7) continue
    for (const point of [c, d]) {
      const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2
      if (t >= 0 && t <= 1) cuts.push(t)
    }
  }
  cuts.sort((left, right) => left - right)
  for (let index = 1; index < cuts.length; index += 1) {
    if (cuts[index] - cuts[index - 1] < 1e-8) continue
    const t = (cuts[index] + cuts[index - 1]) / 2
    if (!insideOrOnRing({ x: a.x + dx * t, y: a.y + dy * t }, ring)) return false
  }
  return true
}

function connectorInsideRing(from: EnuPoint, to: EnuPoint, ring: EnuPoint[]): EnuPoint[] {
  if (segmentInsideRing(from, to, ring)) return [from, to]
  const nodes = [from, to, ...ring]
  const distance = nodes.map(() => Number.POSITIVE_INFINITY)
  const previous = nodes.map(() => -1)
  const visited = nodes.map(() => false)
  distance[0] = 0
  for (let step = 0; step < nodes.length; step += 1) {
    let current = -1
    for (let index = 0; index < nodes.length; index += 1) {
      if (!visited[index] && (current < 0 || distance[index] < distance[current])) current = index
    }
    if (current < 0 || !Number.isFinite(distance[current])) break
    if (current === 1) break
    visited[current] = true
    for (let candidate = 0; candidate < nodes.length; candidate += 1) {
      if (candidate === current || visited[candidate] || !segmentInsideRing(nodes[current], nodes[candidate], ring)) continue
      const nextDistance = distance[current] + Math.hypot(nodes[candidate].x - nodes[current].x, nodes[candidate].y - nodes[current].y)
      if (nextDistance < distance[candidate]) {
        distance[candidate] = nextDistance
        previous[candidate] = current
      }
    }
  }
  if (!Number.isFinite(distance[1])) return [from, to]
  const route: EnuPoint[] = []
  for (let at = 1; at >= 0; at = previous[at]) {
    route.push(nodes[at])
    if (at === 0) break
  }
  return route.reverse()
}

/** Connect alternating scan spans into a continuous path without leaving the footprint. */
export function generateAreaTraversal(
  area: Pick<MissionArea, 'points' | 'lineSpacingM' | 'orientationDeg' | 'paddingM' | 'reconnaissance'>,
  scanLines = generateAreaScan(area)
): EnuPoint[] {
  if (!isValidRing(area.points) || scanLines.length === 0) return []
  const path: EnuPoint[] = []
  for (const line of scanLines) {
    if (line.length < 2) continue
    if (path.length === 0) {
      path.push(...line)
      continue
    }
    const connector = connectorInsideRing(path[path.length - 1], line[0], area.points)
    path.push(...connector.slice(1), ...line.slice(1))
  }
  return path
}

export interface AreaCapturePathPoint extends EnuPoint {
  /** Whether this generated navigation point represents a photo capture. */
  capturePhoto: boolean
}

/** Build the Area waypoint path with camera captures sampled along scan lanes.
    Turn/connectors stay in the route but do not create photo markers. */
export function generateAreaCapturePath(
  area: Pick<MissionArea, 'points' | 'lineSpacingM' | 'orientationDeg' | 'paddingM' | 'reconnaissance'>,
  scanLines = generateAreaScan(area)
): AreaCapturePathPoint[] {
  if (!area.reconnaissance?.enabled) {
    return generateAreaTraversal(area, scanLines).map((point) => ({ ...point, capturePhoto: true }))
  }
  if (!isValidRing(area.points) || scanLines.length === 0) return []

  const path: AreaCapturePathPoint[] = []
  const append = (point: EnuPoint, capturePhoto: boolean) => {
    const rounded = { x: round2(point.x), y: round2(point.y) }
    const previous = path[path.length - 1]
    if (previous && Math.hypot(previous.x - rounded.x, previous.y - rounded.y) <= 0.001) {
      previous.capturePhoto ||= capturePhoto
      return
    }
    path.push({ ...rounded, capturePhoto })
  }

  const photoSpacingM = getAreaPhotoSpacingM(area)
  for (const line of scanLines) {
    if (line.length < 2) continue
    const start = line[0]
    const end = line[line.length - 1]
    const previous = path[path.length - 1]
    if (previous) {
      const connector = connectorInsideRing(previous, start, area.points)
      connector.slice(1).forEach((point) => append(point, false))
    }

    const lengthM = Math.hypot(end.x - start.x, end.y - start.y)
    const intervals = Math.max(1, Math.ceil(lengthM / photoSpacingM))
    for (let index = 0; index <= intervals; index += 1) {
      const t = index / intervals
      append({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }, true)
    }
  }
  return path
}

export function polylineIntersectsRing(line: EnuPoint[], ring: EnuPoint[]): boolean {
  if (ring.length < 3) return false
  for (const p of line) if (pointInRing(p, ring)) return true
  for (let i = 1; i < line.length; i += 1) {
    for (let j = 0; j < ring.length; j += 1) {
      if (segIntersectsSeg(line[i - 1], line[i], ring[j], ring[(j + 1) % ring.length])) return true
    }
  }
  return false
}
