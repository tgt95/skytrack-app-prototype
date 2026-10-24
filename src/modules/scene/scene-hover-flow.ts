/* scene-hover-flow.ts — the MOUSE_MOVE body of the edit gestures
   (T-224 / W13a): draft hover, avoid/Z drag previews, avoid-handle affordance,
   capture-frustum emphasis, segment insert affordances, ground guide and
   pointer cursor.

   Owns no listeners. Reads current tool/mission/selection state through the
   ref objects passed by the coordinator and preserves the original branch
   order, drill depth and hover thresholds. */

import type { Cartesian2, Cartesian3, Viewer } from 'cesium'
import { missionOrigin, type SceneTool, type StudioMission } from '../../domain/mission-model'
import {
  avoidHandleId, enuToLngLat, isWaypointGroundGuideEntity, lngLatToEnu, pendingInsertIndex, pendingPointIndex, photoWaypointId, routeInsertIndex, waypointId, zoneId
} from './mission-scene-helpers'
import type { ScenePickCallbacks } from './scene-edit-gestures'
import type { AvoidHeightDrag } from './scene-avoid-height-drag'
import type { HoverGuide, SceneFrustumGeometry } from './scene-hover-guide'
import type { PointDrag } from './scene-point-drag'
import { closestSegmentToRay, type SurfacePick } from './scene-surface-pick'

type CesiumNS = typeof import('cesium')
type MutableRef<T> = { current: T }

export interface HoverFlowDeps {
  viewer: Viewer
  Cesium: CesiumNS
  state: {
    missionRef: MutableRef<StudioMission>
    toolRef: MutableRef<SceneTool>
    simActiveRef: MutableRef<boolean>
    pickRef: MutableRef<ScenePickCallbacks>
    drawAltRef: MutableRef<number>
    pendingPointsRef: MutableRef<{ x: number; y: number; z?: number }[]>
    pendingShapeRef: MutableRef<'polygon' | 'cylinder'>
    hoverRef: MutableRef<{ insert: number | null; pendingInsert: number | null }>
    hoveredWaypointRef: MutableRef<string | null>
    hoveredPhotoRef: MutableRef<string | null>
    showPhotoMarkersRef: MutableRef<boolean>
    frustumGeomRef: MutableRef<Map<string, SceneFrustumGeometry>>
  }
  canvasPosition: (position: Cartesian2) => Cartesian2
  surface: Pick<SurfacePick, 'pickAtDrawingAltitude'>
  hoverGuide: Pick<HoverGuide, 'setPhotoEmphasis' | 'updateWaypointGroundGuide'>
  pointDrag: Pick<PointDrag, 'isZdragActive' | 'previewZdrag'>
  avoidHeightDrag: Pick<AvoidHeightDrag, 'isActive' | 'preview'>
}

export function createHoverFlow(deps: HoverFlowDeps): (movement: { endPosition: Cartesian2 }) => void {
  const { viewer, Cesium, state, canvasPosition, surface, hoverGuide, pointDrag, avoidHeightDrag } = deps
  const {
    missionRef, toolRef, simActiveRef, pickRef, drawAltRef, pendingPointsRef, pendingShapeRef,
    hoverRef, hoveredWaypointRef, hoveredPhotoRef, showPhotoMarkersRef, frustumGeomRef
  } = state

  return (movement) => {
    if (viewer.isDestroyed()) return
    const endPosition = canvasPosition(movement.endPosition)
    const drawTool = toolRef.current
    if ((drawTool === 'area' || drawTool === 'avoid') && !simActiveRef.current) {
      const cartesian = surface.pickAtDrawingAltitude(endPosition, drawTool)
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian)
        const point = lngLatToEnu((carto.longitude * 180) / Math.PI, (carto.latitude * 180) / Math.PI, missionOrigin(missionRef.current))
        const points = pendingPointsRef.current
        let nearStart = false
        if (pendingShapeRef.current === 'polygon' && points.length >= 3) {
          const first = points[0]
          // Use the same ellipsoid → ENU coordinates as placed points.
          // This avoids viewport/canvas origin differences in Cesium's
          // worldToWindowCoordinates across device scale factors.
          nearStart = Math.hypot(point.x - first.x, point.y - first.y) <= 2
        }
        pickRef.current.onDraftHover(point, nearStart)
      } else {
        pickRef.current.onDraftHover(null, false)
      }
    }
    if (avoidHeightDrag.isActive()) {
      avoidHeightDrag.preview(movement.endPosition)
      return
    }
    /* Z altitude-drag: vertical pointer motion maps to waypoint z only,
       live-clamped at ground. The commit happens on LEFT_UP. */
    if (pointDrag.isZdragActive()) {
      pointDrag.previewZdrag(endPosition)
      return
    }
    const picked = viewer.scene.drillPick(endPosition, 8) ?? []
    let hoveredId: string | null = null
    for (const candidate of picked) {
      const raw = candidate?.id?.id
      const handle = avoidHandleId(raw)
      const zone = zoneId(raw)
      if (handle) { hoveredId = handle; break }
      if (zone?.kind === 'avoid') { hoveredId = zone.id; break }
    }
    for (const zone of missionRef.current.avoids) {
      const visible = zone.id === hoveredId
      for (const suffix of ['height', 'z']) {
        const entity = viewer.entities.getById(`ms-avoid-${suffix}-${zone.id}`)
        if (entity) entity.show = visible
      }
    }
    /* Capture-frustum hover emphasis (Planner setCaptureFrustumEmphasis
       pattern): the hovered frustum expands to its emphasis size and
       tints selected red; side faces stay static. Picking priority and
       click flows are untouched. */
    let hoveredPhoto: string | null = null
    if (showPhotoMarkersRef.current) {
      for (const candidate of picked) {
        const raw = (candidate as { id?: { id?: unknown } })?.id?.id
        if (typeof raw !== 'string') continue
        for (const wpid of frustumGeomRef.current.keys()) {
          if (raw === `ms-photo-base-${wpid}` || raw === `ms-photo-rays-${wpid}` || raw.startsWith(`ms-photo-face-${wpid}-`)) { hoveredPhoto = wpid; break }
        }
        if (hoveredPhoto) break
      }
    }
    if (hoveredPhoto !== hoveredPhotoRef.current) {
      hoverGuide.setPhotoEmphasis(hoveredPhotoRef.current, false)
      hoverGuide.setPhotoEmphasis(hoveredPhoto, true)
      hoveredPhotoRef.current = hoveredPhoto
    }
    /* Hover-gated segment insert (Design only, authored points only).
       Entity hover wins; otherwise the pick ray is matched in 3D
       against authored segments (ground-plane matching fails for
       elevated segments: the screen-midpoint ray meets the ground
       metres away from the segment at typical pitches). (T-016: no
       remove badge; waypoint hover only drives the pointer cursor.) */
    let hoverInsert: number | null = null
    let hoverPendingInsert: number | null = null
    let hoveredAuthoredWp = false
    let hoveredWaypointId: string | null = null
    let hoveredPendingPoint = false
    if (!simActiveRef.current) {
      for (const candidate of picked) {
        const raw = candidate?.id?.id
        const pendingInsertIdx = pendingInsertIndex(raw)
        if (pendingInsertIdx !== null) { hoverPendingInsert = pendingInsertIdx; break }
        const pendingPtIdx = pendingPointIndex(raw)
        if (pendingPtIdx !== null) { hoveredPendingPoint = true; break }
        const insertIdx = routeInsertIndex(raw)
        if (insertIdx !== null) { hoverInsert = insertIdx; break }
        const wpId = waypointId(raw) ?? (isWaypointGroundGuideEntity(raw) ? hoveredWaypointRef.current : null) ?? photoWaypointId(raw)
        if (wpId) {
          hoveredWaypointId = wpId
          const wp = missionRef.current.waypoints.find((w) => w.id === wpId)
          if (wp) hoveredAuthoredWp = true
          break
        }
      }
      if (toolRef.current === 'route' && pendingPointsRef.current.length >= 2 && hoverPendingInsert === null) {
        const ray = viewer.camera.getPickRay(endPosition)
        if (ray) {
          const pts = pendingPointsRef.current
          const defAlt = Math.max(drawAltRef.current, missionRef.current.takeoffAltM, 0.5)
          const segPoint = (p: { x: number; y: number; z?: number }): Cartesian3 => {
            const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
            return Cesium.Cartesian3.fromDegrees(g.lng, g.lat, typeof p.z === 'number' ? p.z : defAlt)
          }
          // Hover threshold is 3 m, strict closest-approach comparison.
          hoverPendingInsert = closestSegmentToRay(Cesium, ray, pts.length, (index) => {
            const point = pts[index]
            return point ? segPoint(point) : null
          }, 3)
        }
      }
      if (hoverInsert === null) {
        const ray = viewer.camera.getPickRay(endPosition)
        if (ray) {
          const wps = missionRef.current.waypoints
          // Closest approach between pick ray and each authored 3D
          // segment (Ericson 5.1.9, clamped to the segment).
          const segPoint = (w: { x: number; y: number; z: number }): Cartesian3 => {
            const g = enuToLngLat(w.x, w.y, missionOrigin(missionRef.current))
            return Cesium.Cartesian3.fromDegrees(g.lng, g.lat, w.z)
          }
          hoverInsert = closestSegmentToRay(Cesium, ray, wps.length, (index) => {
            const w = wps[index]
            if (!w || w.generatedByArea || w.generatedByAvoid) return null
            return segPoint(w)
          }, 3)
        }
      }
    }
    hoverGuide.updateWaypointGroundGuide(hoveredWaypointId)
    const prevHover = hoverRef.current
    if (prevHover.insert !== hoverInsert) {
      if (prevHover.insert !== null) {
        const entity = viewer.entities.getById(`ms-route-insert-${prevHover.insert}`)
        if (entity) entity.show = false
      }
      if (hoverInsert !== null) {
        const entity = viewer.entities.getById(`ms-route-insert-${hoverInsert}`)
        if (entity) entity.show = true
      }
    }
    if (prevHover.pendingInsert !== hoverPendingInsert) {
      if (prevHover.pendingInsert !== null && prevHover.pendingInsert !== undefined) {
        const entity = viewer.entities.getById(`ms-pending-insert-${prevHover.pendingInsert}`)
        if (entity) entity.show = false
      }
      if (hoverPendingInsert !== null) {
        const entity = viewer.entities.getById(`ms-pending-insert-${hoverPendingInsert}`)
        if (entity) entity.show = true
      }
    }
    hoverRef.current = { insert: hoverInsert, pendingInsert: hoverPendingInsert }
    viewer.canvas.style.cursor = hoveredId
      ? 'ns-resize'
      : hoveredAuthoredWp || hoveredPhoto !== null || hoverInsert !== null || hoveredPendingPoint || hoverPendingInsert !== null
      ? 'pointer'
      : ''
    viewer.scene.requestRender()
  }
}
