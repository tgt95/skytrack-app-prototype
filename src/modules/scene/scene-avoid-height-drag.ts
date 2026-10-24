/* scene-avoid-height-drag.ts — avoid extrusion height drag lifecycle
   (T-224 / W13a): press, preview, commit and camera-input restoration.

   The shared click-vs-drag record stays injected. This module owns no
   listeners and never adds, removes or re-layers entities; it only updates the
   owned avoid polygon/handle properties in place. */

import type { Cartesian2, Viewer } from 'cesium'
import { missionOrigin, type StudioMission } from '../../domain/mission-model'
import { avoidHandleId, enuToLngLat } from './mission-scene-helpers'
import type { SceneDragPressRecord, ScenePickCallbacks } from './scene-edit-gestures'
import type { DrillPickCandidate } from './scene-point-drag'

type CesiumNS = typeof import('cesium')
type MutableRef<T> = { current: T }

export interface AvoidHeightDragDeps {
  viewer: Viewer
  Cesium: CesiumNS
  dragState: SceneDragPressRecord
  missionRef: MutableRef<StudioMission>
  pickRef: MutableRef<ScenePickCallbacks>
  canvasPosition: (position: Cartesian2) => Cartesian2
}

export interface AvoidHeightDrag {
  /* True when the press belongs to an avoid handle, including a handle whose
     zone/position is not resolvable (the original handler returned there). */
  begin(screenPosition: Cartesian2, picked: DrillPickCandidate[]): boolean
  isActive(): boolean
  preview(endPosition: Cartesian2): void
  commit(): void
  cancel(): void
}

export function createAvoidHeightDrag(deps: AvoidHeightDragDeps): AvoidHeightDrag {
  const { viewer, Cesium, dragState, missionRef, pickRef, canvasPosition } = deps

  const begin = (screenPosition: Cartesian2, picked: DrillPickCandidate[]): boolean => {
    const handle = picked.map((item) => avoidHandleId(item?.id?.id)).find((id): id is string => !!id)
    if (!handle) return false
    const zone = missionRef.current.avoids.find((item) => item.id === handle)
    const position = viewer.entities.getById(`ms-avoid-height-${handle}`)?.position?.getValue(viewer.clock.currentTime)
    if (!zone || !position) return true
    dragState.avoidId = handle
    dragState.avoidStartY = screenPosition.y
    dragState.avoidStartHeight = zone.heightM ?? 15
    dragState.avoidPosition = position
    dragState.dragged = true
    dragState.cameraInputs = viewer.scene.screenSpaceCameraController.enableInputs
    viewer.scene.screenSpaceCameraController.enableInputs = false
    return true
  }

  const isActive = () => !!(dragState.avoidId && dragState.avoidPosition)

  const preview = (endPosition: Cartesian2) => {
    if (!dragState.avoidId || !dragState.avoidPosition) return
    const metersPerPixel = Math.max(0.02, Math.min(8, (viewer.camera.positionCartographic?.height ?? 100) / Math.max(1, viewer.canvas.clientHeight)))
    const nextHeight = Math.max(0, dragState.avoidStartHeight + (dragState.avoidStartY - canvasPosition(endPosition).y) * metersPerPixel)
    // Height is measured upward from the zone's saved base altitude.
    const zone = missionRef.current.avoids.find((item) => item.id === dragState.avoidId)
    const base = zone ? Math.max(0, zone.baseAltM ?? 0) : 0
    const extruded = base + nextHeight
    const zoneEntity = viewer.entities.getById(`ms-avoid-${dragState.avoidId}`)
    const polygon = zoneEntity?.polygon
    if (polygon?.extrudedHeight && 'setValue' in polygon.extrudedHeight) {
      (polygon.extrudedHeight as unknown as { setValue: (value: number) => void }).setValue(extruded)
    } else if (polygon) {
      polygon.extrudedHeight = extruded as unknown as import('cesium').Property
    }
    const handle = viewer.entities.getById(`ms-avoid-height-${dragState.avoidId}`)
    if (handle?.position && 'setValue' in handle.position) {
      if (zone) {
        const center = zone.points.reduce((acc, p) => ({ x: acc.x + p.x / zone.points.length, y: acc.y + p.y / zone.points.length }), { x: 0, y: 0 })
        const g = enuToLngLat(center.x, center.y, missionOrigin(missionRef.current))
        ;(handle.position as unknown as { setValue: (value: import('cesium').Cartesian3) => void }).setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, base + Math.max(nextHeight, 0.4)))
      }
    }
    viewer.scene.requestRender()
  }

  const commit = () => {
    const id = dragState.avoidId
    if (!id) return
    const entity = viewer.entities.getById(`ms-avoid-${id}`)
    const value = entity?.polygon?.extrudedHeight?.getValue(viewer.clock.currentTime)
    if (typeof value === 'number') {
      // Extruded height is stored base-relative: subtract the saved base.
      const zone = missionRef.current.avoids.find((item) => item.id === id)
      const base = zone ? Math.max(0, zone.baseAltM ?? 0) : 0
      pickRef.current.onAvoidHeightChange(id, Math.max(0, value - base))
    }
    viewer.scene.screenSpaceCameraController.enableInputs = dragState.cameraInputs
    dragState.avoidId = null
    dragState.avoidPosition = null
    dragState.dragged = true
    viewer.scene.requestRender()
  }

  const cancel = () => {
    const id = dragState.avoidId
    if (!id) return
    const zone = missionRef.current.avoids.find((item) => item.id === id)
    const base = zone ? Math.max(0, zone.baseAltM ?? 0) : 0
    const polygon = viewer.entities.getById(`ms-avoid-${id}`)?.polygon
    const originalExtrusion = base + dragState.avoidStartHeight
    if (polygon?.extrudedHeight && 'setValue' in polygon.extrudedHeight) {
      (polygon.extrudedHeight as unknown as { setValue: (value: number) => void }).setValue(originalExtrusion)
    } else if (polygon) {
      polygon.extrudedHeight = originalExtrusion as unknown as import('cesium').Property
    }
    const handle = viewer.entities.getById(`ms-avoid-height-${id}`)
    if (handle?.position && 'setValue' in handle.position && dragState.avoidPosition) {
      (handle.position as unknown as { setValue: (value: import('cesium').Cartesian3) => void }).setValue(dragState.avoidPosition)
    }
    viewer.scene.screenSpaceCameraController.enableInputs = dragState.cameraInputs
    dragState.avoidId = null
    dragState.avoidPosition = null
    dragState.dragged = true
    viewer.scene.requestRender()
  }

  return { begin, isActive, preview, commit, cancel }
}
