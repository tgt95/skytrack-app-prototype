/* scene-click-flow.ts — the LEFT_CLICK body of the edit gestures
   (T-224 / W13a): pending close, avoid/zone selection, pending and authored
   insert, pending delete, waypoint select with click-again delete, clearing,
   and point placement.

   Owns no listeners. Reads current tool/mission/selection state through the
   ref objects passed by the coordinator and preserves the original candidate
   order, drill depth and click-again travel threshold. */

import type { Cartesian2, Viewer } from 'cesium'
import { isValidRing, missionOrigin, type SceneSelection, type SceneTool, type StudioMission } from '../../domain/mission-model'
import {
  avoidHandleId, isWaypointGroundGuideEntity, lngLatToEnu, pendingInsertIndex, pendingPointIndex, photoWaypointId, routeInsertIndex, waypointId, zoneId
} from './mission-scene-helpers'
import type { SceneDragPressRecord, ScenePickCallbacks } from './scene-edit-gestures'
import type { PendingClickArmState, PendingDownState, WaypointDownState } from './scene-point-drag'
import type { SurfacePick } from './scene-surface-pick'

type CesiumNS = typeof import('cesium')
type MutableRef<T> = { current: T }

export interface SceneSelectMeta {
  id: string
  tool: SceneTool
  rev: number
  selRev: number
}

export interface ClickFlowDeps {
  viewer: Viewer
  Cesium: CesiumNS
  dragState: SceneDragPressRecord
  state: {
    missionRef: MutableRef<StudioMission>
    toolRef: MutableRef<SceneTool>
    selectionRef: MutableRef<SceneSelection | null>
    simActiveRef: MutableRef<boolean>
    pickRef: MutableRef<ScenePickCallbacks>
    drawAltRef: MutableRef<number>
    pendingPointsRef: MutableRef<{ x: number; y: number; z?: number }[]>
    pendingShapeRef: MutableRef<'polygon' | 'cylinder'>
    pendingDownRef: MutableRef<PendingDownState | null>
    pendingClickArmRef: MutableRef<PendingClickArmState | null>
    wpDownRef: MutableRef<WaypointDownState | null>
    selectMetaRef: MutableRef<SceneSelectMeta | null>
    toolRevRef: MutableRef<number>
    selRevRef: MutableRef<number>
    hoveredWaypointRef: MutableRef<string | null>
  }
  canvasPosition: (position: Cartesian2) => Cartesian2
  surface: Pick<SurfacePick, 'pickVisibleSurface' | 'pickAtDrawingAltitude'>
}

export function createClickFlow(deps: ClickFlowDeps): (movement: { position: Cartesian2 }) => void {
  const { viewer, Cesium, dragState, state, canvasPosition, surface } = deps
  const {
    missionRef, toolRef, selectionRef, simActiveRef, pickRef, drawAltRef, pendingPointsRef, pendingShapeRef,
    pendingDownRef, pendingClickArmRef, wpDownRef, selectMetaRef, toolRevRef, selRevRef, hoveredWaypointRef
  } = state

  return (movement) => {
    if (viewer.isDestroyed()) return
    if (dragState.dragged) {
      dragState.dragged = false
      return
    }
    if (toolRef.current === 'home') {
      const cartesian = surface.pickVisibleSurface(canvasPosition(movement.position))
      if (!cartesian) return
      const carto = Cesium.Cartographic.fromCartesian(cartesian)
      const enu = lngLatToEnu(
        (carto.longitude * 180) / Math.PI,
        (carto.latitude * 180) / Math.PI,
        missionOrigin(missionRef.current)
      )
      if (Math.abs(enu.x) < 2000 && Math.abs(enu.y) < 2000) pickRef.current.onScenePoint(enu)
      return
    }
    const screenPosition = canvasPosition(movement.position)
    const picked = viewer.scene.drillPick(screenPosition, 12) ?? []
    for (const candidate of picked) {
      const raw = candidate?.id?.id
      if (raw === 'ms-pending-check') {
        pendingClickArmRef.current = null
        if (!simActiveRef.current) pickRef.current.onClosePending()
        return
      }
      const avoidHandle = avoidHandleId(raw)
      if (avoidHandle) {
        pendingClickArmRef.current = null
        pickRef.current.onPickZone('avoid', avoidHandle)
        return
      }
      const pInsIdx = pendingInsertIndex(raw)
      if (pInsIdx !== null) {
        pendingClickArmRef.current = null
        if (simActiveRef.current) return
        const pts = pendingPointsRef.current
        const first = pts[pInsIdx - 1]
        const second = pts[pInsIdx]
        if (first && second) {
          const defAlt = Math.max(drawAltRef.current, missionRef.current.takeoffAltM, 0.5)
          const fz = typeof first.z === 'number' ? first.z : defAlt
          const sz = typeof second.z === 'number' ? second.z : defAlt
          // Pending insert midpoint rounds XY to 0.1 m, Z to 0.01 m.
          const midPt = {
            x: Math.round(((first.x + second.x) / 2) * 10) / 10,
            y: Math.round(((first.y + second.y) / 2) * 10) / 10,
            z: Math.round(((fz + sz) / 2) * 100) / 100
          }
          pickRef.current.onInsertPendingPoint?.(pInsIdx, midPt)
        }
        return
      }
      const pPtIdx = pendingPointIndex(raw)
      if (pPtIdx !== null) {
        if (
          pPtIdx === 0 &&
          toolRef.current !== 'route' &&
          pendingShapeRef.current === 'polygon' &&
          pendingPointsRef.current.length >= 3 &&
          isValidRing(pendingPointsRef.current)
        ) {
          pendingClickArmRef.current = null
          pickRef.current.onClosePending()
          return
        }
        const down = pendingDownRef.current
        pendingDownRef.current = null
        if (toolRef.current === 'route' && !simActiveRef.current) {
          const arm = pendingClickArmRef.current
          const rect = viewer.canvas.getBoundingClientRect()
          const travel = down && down.index === pPtIdx
            ? Math.hypot(rect.left + movement.position.x - down.x, rect.top + movement.position.y - down.y)
            : Number.POSITIVE_INFINITY
          if (
            arm?.index === pPtIdx &&
            arm.toolRev === toolRevRef.current &&
            down?.tool === 'route' &&
            travel <= 4
          ) {
            pendingClickArmRef.current = null
            pickRef.current.onRemovePendingPoint?.(pPtIdx)
            return
          }
          pendingClickArmRef.current = { index: pPtIdx, toolRev: toolRevRef.current }
        } else {
          pendingClickArmRef.current = null
        }
        return
      }
      // (T-016) the hover minus badge is gone: deletion is
      // click-again on a still-selected authored waypoint (below).
      // Design only; authored points only — the parent revalidates
      // before committing.
      const insertIndex = routeInsertIndex(raw)
      if (insertIndex !== null) {
        pendingClickArmRef.current = null
        if (simActiveRef.current) return
        const first = missionRef.current.waypoints[insertIndex - 1]
        const second = missionRef.current.waypoints[insertIndex]
        const authoredPair = first && second && !first.generatedByArea && !first.generatedByAvoid && !second.generatedByArea && !second.generatedByAvoid
        // Authored-segment insert uses unrounded averages.
        if (authoredPair) pickRef.current.onInsertWaypoint(insertIndex, { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }, (first.z + second.z) / 2)
        return
      }
      // Camera-frustum entities are independent Cesium entities from
      // the waypoint dot. Resolve either surface to the owning photo
      // waypoint so direct clicks on the visible camera marker select
      // the same action as clicking its point or Preview row.
      const wp = waypointId(raw) ?? (isWaypointGroundGuideEntity(raw) ? hoveredWaypointRef.current : null) ?? photoWaypointId(raw)
      if (wp) {
        pendingClickArmRef.current = null
        // (T-016) click-again delete: a second click on a still-
        // selected authored waypoint deletes it only when no tool or
        // selection change intervened and pointer travel stayed at or
        // below the click threshold (4 px). Resolved here on the
        // release click; a drag never reaches this handler
        // (dragState.dragged suppresses it above). Generated points
        // and generated endpoints only select and never create
        // history — the parent revalidates before committing.
        const hit = missionRef.current.waypoints.find((w) => w.id === wp)
        const authored = !!hit && !hit.generatedByArea && !hit.generatedByAvoid
        if (!simActiveRef.current && authored) {
          const sel = selectionRef.current
          const meta = selectMetaRef.current
          const dn = wpDownRef.current
          wpDownRef.current = null
          const rect = viewer.canvas.getBoundingClientRect()
          const travel =
            dn && dn.id === wp
              ? Math.hypot(rect.left + movement.position.x - dn.x, rect.top + movement.position.y - dn.y)
              : Number.POSITIVE_INFINITY
          // Continuous selection since the arming click: any tool or
          // selection change in between disarms (selectMeta null or
          // revision mismatch).
          const continuous =
            !!meta &&
            meta.id === wp &&
            meta.rev === toolRevRef.current &&
            meta.selRev === selRevRef.current &&
            (!dn || dn.id !== wp || dn.tool === toolRef.current)
          if (sel?.kind === 'waypoint' && sel.id === wp && continuous && travel <= 4) {
            pickRef.current.onRemoveWaypoint(wp)
            return
          }
          if (sel?.kind === 'waypoint' && sel.id === wp) {
            // Suppressed delete (travel or an intervened tool change):
            // this click is a fresh first click — re-arm so the next
            // click-again can delete.
            selectMetaRef.current = {
              id: wp,
              tool: toolRef.current,
              rev: toolRevRef.current,
              selRev: selRevRef.current
            }
          }
        } else {
          wpDownRef.current = null
        }
        pickRef.current.onPickWaypoint(wp)
        return
      }
      const zone = zoneId(raw)
      if (zone) {
        pendingClickArmRef.current = null
        pickRef.current.onPickZone(zone.kind, zone.id)
        return
      }
    }
    pendingClickArmRef.current = null
    pendingDownRef.current = null
    const currentTool = toolRef.current
    if (currentTool === 'select' || currentTool === undefined) {
      pickRef.current.onClearSelection()
      return
    }
    const cartesian = surface.pickAtDrawingAltitude(canvasPosition(movement.position), currentTool)
    if (!cartesian) return
    const carto = Cesium.Cartographic.fromCartesian(cartesian)
    const enu = lngLatToEnu(
      (carto.longitude * 180) / Math.PI,
      (carto.latitude * 180) / Math.PI,
      missionOrigin(missionRef.current)
    )
    if (Math.abs(enu.x) < 2000 && Math.abs(enu.y) < 2000) pickRef.current.onScenePoint(enu)
  }
}
