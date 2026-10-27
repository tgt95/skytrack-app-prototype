/* scene-surface-pick.ts — pure picking, local-plane and screen→ENU geometry
   used by the edit gestures (T-224 / W13a).

   This module owns no listeners, refs, entities or Viewer lifecycle. It reads
   live state through the ref objects its caller passes in, so every call sees
   the current mission and drawing altitude. Cesium is type-only; the runtime
   namespace arrives as an argument. */

import type { Cartesian2, Cartesian3, Viewer } from 'cesium'
import {
  getAreaFlightAltitudeM, missionOrigin,
  type SceneTool, type StudioMission
} from '../../domain/mission-model'
import { enuToLngLat, lngLatToEnu } from './mission-scene-helpers'

type CesiumNS = typeof import('cesium')
type MutableRef<T> = { current: T }

export interface SurfacePickDeps {
  viewer: Viewer
  Cesium: CesiumNS
  missionRef: MutableRef<StudioMission>
  drawAltRef: MutableRef<number>
  worldTerrainTrianglesRef: MutableRef<Array<readonly [Cartesian3, Cartesian3, Cartesian3]>>
  canvasPositionFromClient: (clientX: number, clientY: number) => Cartesian2
}

export interface SurfacePick {
  pickWorldTerrainSurface(position: Cartesian2): Cartesian3 | undefined
  pickVisibleSurface(position: Cartesian2): Cartesian3 | undefined
  drawingPlaneAltitude(activeTool: SceneTool): number
  pickAtDrawingAltitude(position: Cartesian2, activeTool: SceneTool): Cartesian3 | undefined
  visibleGroundHeightAt(point: Cartesian3): number
  wpMetersPerPixel(): number
  wpXyFromScreen(clientX: number, clientY: number, planeZ: number): { x: number; y: number } | null
}

export function createSurfacePick(deps: SurfacePickDeps): SurfacePick {
  const { viewer, Cesium, missionRef, drawAltRef, worldTerrainTrianglesRef, canvasPositionFromClient } = deps

  const pickWorldTerrainSurface = (position: Cartesian2): Cartesian3 | undefined => {
    if (worldTerrainTrianglesRef.current.length === 0) return undefined
    const ray = viewer.camera.getPickRay(position)
    if (!ray) return undefined
    let nearest: Cartesian3 | undefined
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const triangle of worldTerrainTrianglesRef.current) {
      const hit = Cesium.IntersectionTests.rayTriangle(ray, triangle[0], triangle[1], triangle[2], false)
      if (!hit) continue
      const distance = Cesium.Cartesian3.distance(ray.origin, hit)
      if (distance < nearestDistance) {
        nearest = hit
        nearestDistance = distance
      }
    }
    return nearest
  }
  const pickVisibleSurface = (position: Cartesian2): Cartesian3 | undefined => {
    /* Use the rendered depth surface so clicks land beneath the cursor
       on terrain and local World relief. Mission overlays are visual
       guides rather than ground: do not let their elevated depth shift
       a new point when the cursor crosses an Area, Avoid zone, or draft. */
    let pickedEntityId: unknown
    try {
      const picked = viewer.scene.pick(position) as { id?: { id?: unknown } } | undefined
      pickedEntityId = picked?.id?.id
    } catch {
      pickedEntityId = undefined
    }
    const isMissionOverlay = typeof pickedEntityId === 'string' && pickedEntityId.startsWith('ms-') && !pickedEntityId.startsWith('ms-world-terrain-')
    // Synthetic World relief sits above the ellipsoid and is not part
    // of Cesium's globe depth buffer. Resolve its triangles directly
    // when a mission overlay owns the top pixel, so draft geometry
    // still lands on the visible slope beneath that overlay.
    if (isMissionOverlay) {
      const terrainSurface = pickWorldTerrainSurface(position)
      if (terrainSurface) return terrainSurface
    }
    if (!isMissionOverlay && viewer.scene.pickPositionSupported) {
      try {
        const surface = viewer.scene.pickPosition(position)
        if (surface && Number.isFinite(surface.x) && Number.isFinite(surface.y) && Number.isFinite(surface.z)) return surface
      } catch {
        /* use globe fallback */
      }
    }
    const ray = viewer.camera.getPickRay(position)
    const globeSurface = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined
    if (globeSurface && Number.isFinite(globeSurface.x) && Number.isFinite(globeSurface.y) && Number.isFinite(globeSurface.z)) return globeSurface
    const ellipsoidSurface = viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)
    return ellipsoidSurface && Number.isFinite(ellipsoidSurface.x) ? ellipsoidSurface : undefined
  }
  const drawingPlaneAltitude = (activeTool: SceneTool): number => {
    const currentMission = missionRef.current
    if (activeTool === 'route') return Math.max(drawAltRef.current, currentMission.takeoffAltM, 0.5)
    if (activeTool === 'area') {
      if (currentMission.worldType === '2D') return getAreaFlightAltitudeM({ baseAltM: 0 }, currentMission.takeoffAltM, '2D')
      return Math.max(0, drawAltRef.current)
    }
    if (activeTool === 'avoid') return Math.max(0, drawAltRef.current)
    return 0
  }
  const pickAtDrawingAltitude = (position: Cartesian2, activeTool: SceneTool): Cartesian3 | undefined => {
    const ray = viewer.camera.getPickRay(position)
    if (!ray) return undefined
    const originGeo = missionOrigin(missionRef.current)
    const planePoint = Cesium.Cartesian3.fromDegrees(originGeo.lng, originGeo.lat, drawingPlaneAltitude(activeTool))
    const normal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(planePoint, new Cesium.Cartesian3())
    const plane = new Cesium.Plane(normal, -Cesium.Cartesian3.dot(normal, planePoint))
    const hit = Cesium.IntersectionTests.rayPlane(ray, plane, new Cesium.Cartesian3())
    return hit && Number.isFinite(hit.x) && Number.isFinite(hit.y) && Number.isFinite(hit.z) ? hit : undefined
  }
  const visibleGroundHeightAt = (point: Cartesian3): number => {
    const cartographic = Cesium.Cartographic.fromCartesian(point)
    if (!cartographic || !Number.isFinite(cartographic.longitude) || !Number.isFinite(cartographic.latitude)) return 0
    let groundHeight = viewer.scene.globe.getHeight(cartographic) ?? 0
    // Local terrain fixtures are mesh overlays rather than Cesium
    // terrain tiles, so include their radial surface intersection.
    const normal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(point, new Cesium.Cartesian3())
    const origin = Cesium.Cartesian3.add(point, Cesium.Cartesian3.multiplyByScalar(normal, 10000, new Cesium.Cartesian3()), new Cesium.Cartesian3())
    const ray = { origin, direction: Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3()) }
    for (const triangle of worldTerrainTrianglesRef.current) {
      const hit = Cesium.IntersectionTests.rayTriangle(ray, triangle[0], triangle[1], triangle[2], false)
      if (!hit) continue
      const hitHeight = Cesium.Cartographic.fromCartesian(hit).height
      if (Number.isFinite(hitHeight)) groundHeight = Math.max(groundHeight, hitHeight)
    }
    return Number.isFinite(groundHeight) ? groundHeight : 0
  }

  /* Metres per screen pixel uses the current camera height and canvas height,
     clamped and floored exactly as the original drag math did. */
  const wpMetersPerPixel = () =>
    Math.max(0.02, Math.min(8, (viewer.camera.positionCartographic?.height ?? 100) / Math.max(1, viewer.canvas.clientHeight)))

  const wpXyFromScreen = (clientX: number, clientY: number, planeZ: number): { x: number; y: number } | null => {
    const ray = viewer.camera.getPickRay(canvasPositionFromClient(clientX, clientY))
    if (!ray) return null
    // Plane point: any ENU point at planeZ works; use the mission
    // centroid longitude/latitude for a stable local normal.
    const snap = missionRef.current
    let cx = 0
    let cy = 0
    let n = 0
    for (const w of snap.waypoints) {
      cx += w.x
      cy += w.y
      n += 1
    }
    if (n === 0) {
      cx = snap.spawn.x
      cy = snap.spawn.y
      n = 1
    }
    const gc = enuToLngLat(cx / n, cy / n, missionOrigin(missionRef.current))
    const planePoint = Cesium.Cartesian3.fromDegrees(gc.lng, gc.lat, planeZ)
    const normal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(planePoint, new Cesium.Cartesian3())
    const plane = new Cesium.Plane(normal, -Cesium.Cartesian3.dot(normal, planePoint))
    const hit = Cesium.IntersectionTests.rayPlane(ray, plane, new Cesium.Cartesian3())
    if (!hit || !Number.isFinite(hit.x)) return null
    const carto = Cesium.Cartographic.fromCartesian(hit)
    if (!carto || !Number.isFinite(carto.longitude) || !Number.isFinite(carto.latitude)) return null
    return lngLatToEnu((carto.longitude * 180) / Math.PI, (carto.latitude * 180) / Math.PI, missionOrigin(missionRef.current))
  }

  return {
    pickWorldTerrainSurface,
    pickVisibleSurface,
    drawingPlaneAltitude,
    pickAtDrawingAltitude,
    visibleGroundHeightAt,
    wpMetersPerPixel,
    wpXyFromScreen
  }
}

/* Closest approach between a pick ray and segment j of a polyline
   (Ericson 5.1.9, clamped to the segment). Callers own the endpoint filter,
   scan length and execution order; this helper preserves the original
   strict `d < best` comparison and initial threshold. */
export function closestSegmentToRay(
  Cesium: CesiumNS,
  ray: { origin: Cartesian3; direction: Cartesian3 },
  count: number,
  endpoint: (index: number) => Cartesian3 | null,
  thresholdMeters: number
): number | null {
  const o = ray.origin
  const u = Cesium.Cartesian3.normalize(ray.direction, new Cesium.Cartesian3())
  let best = thresholdMeters
  let closest: number | null = null
  for (let j = 1; j < count; j += 1) {
    const A = endpoint(j - 1)
    const B = endpoint(j)
    if (!A || !B) continue
    const v = Cesium.Cartesian3.subtract(B, A, new Cesium.Cartesian3())
    const w0 = Cesium.Cartesian3.subtract(o, A, new Cesium.Cartesian3())
    const a11 = Cesium.Cartesian3.dot(u, u)
    const a12 = -Cesium.Cartesian3.dot(u, v)
    const a22 = Cesium.Cartesian3.dot(v, v)
    const b1 = -Cesium.Cartesian3.dot(u, w0)
    const b2 = Cesium.Cartesian3.dot(v, w0)
    const det = a11 * a22 - a12 * a12
    if (Math.abs(det) < 1e-12 || a22 < 1e-12) continue
    let s = (b1 * a22 - b2 * a12) / det
    let t = (a11 * b2 - a12 * b1) / det
    if (s < 0) s = 0
    if (t < 0) { t = 0; s = Math.max(0, b1 / a11) }
    else if (t > 1) { t = 1; s = Math.max(0, (b1 - a12) / a11) }
    const pRay = Cesium.Cartesian3.add(o, Cesium.Cartesian3.multiplyByScalar(u, s, new Cesium.Cartesian3()), new Cesium.Cartesian3())
    const pSeg = Cesium.Cartesian3.add(A, Cesium.Cartesian3.multiplyByScalar(v, t, new Cesium.Cartesian3()), new Cesium.Cartesian3())
    const d = Cesium.Cartesian3.distance(pRay, pSeg)
    if (d < best) { best = d; closest = j }
  }
  return closest
}
