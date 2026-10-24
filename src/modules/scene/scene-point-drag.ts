/* scene-point-drag.ts — authored-waypoint, pending-point and Z-altitude drag
   lifecycle (T-224 / W13a): press arming, preview, and the single commit point.

   The shared click-vs-drag record stays injected; this module never owns
   listeners and never creates, removes or re-layers entities. All numeric
   clamps/rounding below are copied from the original handler verbatim. */

import type { Cartesian2, Cartesian3, Viewer } from 'cesium'
import { missionOrigin, type SceneTool, type StudioMission } from '../../domain/mission-model'
import { enuToLngLat, isWaypointGroundGuideEntity, photoWaypointId, waypointId } from './mission-scene-helpers'
import type { SceneDragPressRecord, ScenePickCallbacks } from './scene-edit-gestures'
import type { SurfacePick } from './scene-surface-pick'

type CesiumNS = typeof import('cesium')
type MutableRef<T> = { current: T }

export interface WaypointDragState {
  id: string
  mode: 'xy' | 'z'
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  startZ: number
  moved: boolean
}

export interface PendingDragState {
  index: number
  mode: 'xy' | 'z'
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  startZ: number
  currentX: number
  currentY: number
  currentZ: number
  moved: boolean
}

export interface PendingDownState {
  index: number
  x: number
  y: number
  tool: SceneTool
}

export interface PendingClickArmState {
  index: number
  toolRev: number
}

export interface WaypointDownState {
  id: string
  x: number
  y: number
  tool: SceneTool
}

export interface ZDragState {
  id: string
  startY: number
  startZ: number
}

export type DrillPickCandidate = { id?: { id?: unknown } }

export interface PointDragDeps {
  viewer: Viewer
  Cesium: CesiumNS
  dragState: SceneDragPressRecord
  state: {
    missionRef: MutableRef<StudioMission>
    toolRef: MutableRef<SceneTool>
    simActiveRef: MutableRef<boolean>
    pickRef: MutableRef<ScenePickCallbacks>
    drawAltRef: MutableRef<number>
    pendingPointsRef: MutableRef<{ x: number; y: number; z?: number }[]>
    hoverRef: MutableRef<{ insert: number | null; pendingInsert: number | null }>
    hoveredWaypointRef: MutableRef<string | null>
    zHeldRef: MutableRef<boolean>
    zdragRef: MutableRef<ZDragState | null>
    zdragInputsRef: MutableRef<boolean>
    wpDragRef: MutableRef<WaypointDragState | null>
    pendingDragRef: MutableRef<PendingDragState | null>
    pendingDownRef: MutableRef<PendingDownState | null>
    pendingClickArmRef: MutableRef<PendingClickArmState | null>
    wpDownRef: MutableRef<WaypointDownState | null>
  }
  surface: Pick<SurfacePick, 'wpMetersPerPixel' | 'wpXyFromScreen' | 'visibleGroundHeightAt'>
  updateWaypointGroundGuide(id: string | null): void
}

export interface PointDrag {
  beginPendingPress(e: PointerEvent, index: number, point: { x: number; y: number; z?: number }): void
  beginWaypointPress(e: PointerEvent, id: string, waypoint: { x: number; y: number; z: number }): void
  beginZdrag(screenPosition: Cartesian2, picked: DrillPickCandidate[]): void
  isZdragActive(): boolean
  previewWpDrag(e: PointerEvent): void
  previewPendingDrag(e: PointerEvent): void
  previewZdrag(endPosition: Cartesian2): void
  commitWpDrag(clientX: number, clientY: number): void
  commitPendingDrag(clientX: number, clientY: number): void
  endZdrag(): void
}

export function createPointDrag(deps: PointDragDeps): PointDrag {
  const { viewer, Cesium, dragState, state, surface, updateWaypointGroundGuide } = deps
  const {
    missionRef, toolRef, simActiveRef, pickRef, drawAltRef, pendingPointsRef, hoverRef, hoveredWaypointRef,
    zHeldRef, zdragRef, zdragInputsRef, wpDragRef, pendingDragRef, pendingDownRef, pendingClickArmRef, wpDownRef
  } = state
  const { wpMetersPerPixel, wpXyFromScreen, visibleGroundHeightAt } = surface

  const beginPendingPress = (e: PointerEvent, index: number, point: { x: number; y: number; z?: number }) => {
    pendingDownRef.current = { index, x: e.clientX, y: e.clientY, tool: toolRef.current }
    const defAlt = Math.max(drawAltRef.current, missionRef.current.takeoffAltM, 0.5)
    const ptZ = typeof point.z === 'number' ? point.z : defAlt
    if (!pendingDragRef.current) {
      pendingDragRef.current = {
        index,
        mode: e.shiftKey ? 'z' : 'xy',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: point.x,
        startY: point.y,
        startZ: ptZ,
        currentX: point.x,
        currentY: point.y,
        currentZ: ptZ,
        moved: false
      }
    }
  }
  // (T-016) authored-waypoint press: record pointerdown for the click-again
  // delete travel check, and latch plain (XY, Z preserved) vs Shift (Z-only,
  // XY preserved) drag mode now — Shift changes mid-drag never switch axes.
  // Z-held presses stay on the Z-drag flow begun by LEFT_DOWN.
  const beginWaypointPress = (e: PointerEvent, id: string, waypoint: { x: number; y: number; z: number }) => {
    pendingClickArmRef.current = null
    pendingDownRef.current = null
    wpDownRef.current = { id, x: e.clientX, y: e.clientY, tool: toolRef.current }
    if (!zHeldRef.current && !wpDragRef.current) {
      wpDragRef.current = {
        id,
        mode: e.shiftKey ? 'z' : 'xy',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: waypoint.x,
        startY: waypoint.y,
        startZ: waypoint.z,
        moved: false
      }
    }
  }

  /* Z altitude-drag begin: plain Z held while pressing a waypoint
     (Design only, sim excluded). Camera inputs freeze for the press; the
     release click still flows to the pick handlers when the press never
     moves. Called only when LEFT_DOWN found no avoid handle. */
  const beginZdrag = (screenPosition: Cartesian2, picked: DrillPickCandidate[]) => {
    if (zHeldRef.current && !simActiveRef.current && !zdragRef.current) {
      const hit = picked.map((item) => {
        const raw = item?.id?.id
        return waypointId(raw) ?? photoWaypointId(raw) ?? (isWaypointGroundGuideEntity(raw) ? hoveredWaypointRef.current : null)
      }).find((id): id is string => !!id)
      if (hit) {
        const wp = missionRef.current.waypoints.find((w) => w.id === hit)
        if (wp) {
          zdragRef.current = { id: hit, startY: screenPosition.y, startZ: wp.z }
          hoverRef.current = { insert: null, pendingInsert: null }
          zdragInputsRef.current = viewer.scene.screenSpaceCameraController.enableInputs
          viewer.scene.screenSpaceCameraController.enableInputs = false
        }
      }
    }
  }

  /* Waypoint-drag helpers. XY drags intersect the pick ray with the
     horizontal plane through the grab altitude, so the drag moves
     horizontal position only and preserves Z exactly. */
  const previewWpDrag = (e: PointerEvent) => {
    const wd = wpDragRef.current
    if (!wd || viewer.isDestroyed()) return
    if (wd.mode === 'z') {
      const g = enuToLngLat(wd.startX, wd.startY, missionOrigin(missionRef.current))
      const desiredZ = wd.startZ + (wd.startClientY - e.clientY) * wpMetersPerPixel()
      const groundPoint = Cesium.Cartesian3.fromDegrees(g.lng, g.lat, Math.max(0, desiredZ))
      const previewZ = Math.max(visibleGroundHeightAt(groundPoint), desiredZ, 0)
      const entity = viewer.entities.getById(`ms-wp-${wd.id}`)
      const pos = entity?.position as unknown as { setValue?: (v: Cartesian3) => void } | undefined
      if (pos && typeof pos.setValue === 'function') {
        pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, previewZ))
        updateWaypointGroundGuide(wd.id)
      }
    } else {
      const enu = wpXyFromScreen(e.clientX, e.clientY, wd.startZ)
      if (enu && Number.isFinite(enu.x) && Number.isFinite(enu.y)) {
        // XY preview clamps to ±2000 m without rounding.
        const cx = Math.max(-2000, Math.min(2000, enu.x))
        const cy = Math.max(-2000, Math.min(2000, enu.y))
        const g = enuToLngLat(cx, cy, missionOrigin(missionRef.current))
        const entity = viewer.entities.getById(`ms-wp-${wd.id}`)
        const pos = entity?.position as unknown as { setValue?: (v: Cartesian3) => void } | undefined
        if (pos && typeof pos.setValue === 'function') {
          pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wd.startZ))
        }
      }
    }
    viewer.scene.requestRender()
  }
  /* Commit a moved waypoint drag exactly once (one undo entry via the
     parent). XY sends raw ENU (no rounding); Z reuses the existing altitude
     path (ground-clamped, no new quantization). */
  const commitWpDrag = (clientX: number, clientY: number) => {
    const wd = wpDragRef.current
    wpDragRef.current = null
    if (!wd || !wd.moved || viewer.isDestroyed()) return
    if (wd.mode === 'z') {
      const entity = viewer.entities.getById(`ms-wp-${wd.id}`)
      const pos = entity?.position?.getValue(viewer.clock.currentTime) as unknown as Cartesian3 | undefined
      let z = wd.startZ
      if (pos) {
        const carto = Cesium.Cartographic.fromCartesian(pos)
        if (Number.isFinite(carto.height)) z = Math.max(0, carto.height, visibleGroundHeightAt(pos))
      }
      hoverRef.current = { insert: null, pendingInsert: null }
      pickRef.current.onWaypointAltitudeChange(wd.id, z)
    } else {
      const enu = wpXyFromScreen(clientX, clientY, wd.startZ)
      if (enu && Number.isFinite(enu.x) && Number.isFinite(enu.y)) {
        hoverRef.current = { insert: null, pendingInsert: null }
        pickRef.current.onWaypointPositionChange(wd.id, enu.x, enu.y)
      } else {
        viewer.scene.requestRender()
      }
    }
  }
  const previewPendingDrag = (e: PointerEvent) => {
    const pd = pendingDragRef.current
    if (!pd || viewer.isDestroyed()) return
    if (pd.mode === 'z') {
      // Pending Z preview rounds to 0.01 m.
      const rawZ = pd.startZ + (pd.startClientY - e.clientY) * wpMetersPerPixel()
      const previewZ = Math.max(0, Math.round(rawZ * 100) / 100)
      pd.currentZ = previewZ
      const g = enuToLngLat(pd.startX, pd.startY, missionOrigin(missionRef.current))
      const entity = viewer.entities.getById(`ms-pending-${pd.index}`)
      const pos = entity?.position as unknown as { setValue?: (v: Cartesian3) => void } | undefined
      if (pos && typeof pos.setValue === 'function') {
        pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, previewZ))
      }
    } else {
      const enu = wpXyFromScreen(e.clientX, e.clientY, pd.startZ)
      if (enu && Number.isFinite(enu.x) && Number.isFinite(enu.y)) {
        // Pending XY preview clamps to ±2000 m and rounds to 0.1 m.
        const cx = Math.max(-2000, Math.min(2000, Math.round(enu.x * 10) / 10))
        const cy = Math.max(-2000, Math.min(2000, Math.round(enu.y * 10) / 10))
        pd.currentX = cx
        pd.currentY = cy
        const g = enuToLngLat(cx, cy, missionOrigin(missionRef.current))
        const entity = viewer.entities.getById(`ms-pending-${pd.index}`)
        const pos = entity?.position as unknown as { setValue?: (v: Cartesian3) => void } | undefined
        if (pos && typeof pos.setValue === 'function') {
          pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, pd.startZ))
        }
      }
    }
    const lineEntity = viewer.entities.getById('ms-pending-line')
    if (lineEntity && pendingPointsRef.current.length >= 2) {
      const flat: number[] = []
      const defAlt = Math.max(drawAltRef.current, missionRef.current.takeoffAltM, 0.5)
      pendingPointsRef.current.forEach((p, idx) => {
        const px = idx === pd.index ? pd.currentX : p.x
        const py = idx === pd.index ? pd.currentY : p.y
        const pz = idx === pd.index ? pd.currentZ : (typeof p.z === 'number' ? p.z : defAlt)
        const g = enuToLngLat(px, py, missionOrigin(missionRef.current))
        flat.push(g.lng, g.lat, pz)
      })
      const poly = lineEntity.polyline as unknown as { positions?: { setValue?: (v: Cartesian3[]) => void } } | undefined
      if (poly && poly.positions && typeof poly.positions.setValue === 'function') {
        poly.positions.setValue(Cesium.Cartesian3.fromDegreesArrayHeights(flat))
      }
    }
    viewer.scene.requestRender()
  }
  const commitPendingDrag = (clientX: number, clientY: number) => {
    const pd = pendingDragRef.current
    pendingDragRef.current = null
    if (!pd || !pd.moved || viewer.isDestroyed()) return
    hoverRef.current = { insert: null, pendingInsert: null }
    if (pd.mode === 'z') {
      const entity = viewer.entities.getById(`ms-pending-${pd.index}`)
      const pos = entity?.position?.getValue(viewer.clock.currentTime) as unknown as Cartesian3 | undefined
      let z = pd.startZ
      if (pos) {
        const carto = Cesium.Cartographic.fromCartesian(pos)
        if (Number.isFinite(carto.height)) z = Math.max(0, Math.round(carto.height * 100) / 100)
      }
      pickRef.current.onPendingAltitudeChange?.(pd.index, z)
    } else {
      const enu = wpXyFromScreen(clientX, clientY, pd.startZ)
      if (enu && Number.isFinite(enu.x) && Number.isFinite(enu.y)) {
        // Pending commit rounds to 0.1 m after the ±2000 m clamp.
        const cx = Math.max(-2000, Math.min(2000, Math.round(enu.x * 10) / 10))
        const cy = Math.max(-2000, Math.min(2000, Math.round(enu.y * 10) / 10))
        pickRef.current.onPendingPositionChange?.(pd.index, cx, cy)
      } else {
        viewer.scene.requestRender()
      }
    }
  }
  /* Z altitude-drag preview: vertical pointer motion maps to waypoint z only,
     live-clamped at ground. The commit happens on LEFT_UP. */
  const previewZdrag = (endPosition: Cartesian2) => {
    const zdrag = zdragRef.current
    if (!zdrag) return
    const desiredZ = zdrag.startZ + (zdrag.startY - endPosition.y) * wpMetersPerPixel()
    const wp = missionRef.current.waypoints.find((w) => w.id === zdrag.id)
    if (wp) {
      const g = enuToLngLat(wp.x, wp.y, missionOrigin(missionRef.current))
      const groundPoint = Cesium.Cartesian3.fromDegrees(g.lng, g.lat, Math.max(0, desiredZ))
      const previewZ = Math.max(visibleGroundHeightAt(groundPoint), desiredZ, 0)
      const entity = viewer.entities.getById(`ms-wp-${zdrag.id}`)
      const pos = entity?.position as unknown as { setValue?: (v: Cartesian3) => void } | undefined
      if (pos && typeof pos.setValue === 'function') {
        pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, previewZ))
        updateWaypointGroundGuide(zdrag.id)
      }
    }
    viewer.scene.requestRender()
  }
  /* End a Z altitude-drag: commit once when the press moved past the
     click threshold, otherwise restore the untouched altitude so the
     release click simply selects the point. */
  const endZdrag = () => {
    const zdrag = zdragRef.current
    if (!zdrag) return
    zdragRef.current = null
    zHeldRef.current = false
    viewer.scene.screenSpaceCameraController.enableInputs = zdragInputsRef.current
    if (dragState.dragged) {
      const entity = viewer.entities.getById(`ms-wp-${zdrag.id}`)
      const pos = entity?.position?.getValue(viewer.clock.currentTime) as unknown as Cartesian3 | undefined
      let z = zdrag.startZ
      if (pos) {
        const carto = Cesium.Cartographic.fromCartesian(pos)
        if (Number.isFinite(carto.height)) z = Math.max(0, carto.height, visibleGroundHeightAt(pos))
      }
      hoverRef.current = { insert: null, pendingInsert: null }
      pickRef.current.onWaypointAltitudeChange(zdrag.id, z)
    } else {
      const wp = missionRef.current.waypoints.find((w) => w.id === zdrag.id)
      if (wp) {
        const g = enuToLngLat(wp.x, wp.y, missionOrigin(missionRef.current))
        const entity = viewer.entities.getById(`ms-wp-${zdrag.id}`)
        const wpos = entity?.position as unknown as { setValue?: (v: Cartesian3) => void } | undefined
        if (wpos && typeof wpos.setValue === 'function') {
          wpos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wp.z))
        }
      }
    }
    viewer.scene.requestRender()
  }

  return {
    beginPendingPress,
    beginWaypointPress,
    beginZdrag,
    isZdragActive: () => zdragRef.current !== null,
    previewWpDrag,
    previewPendingDrag,
    previewZdrag,
    commitWpDrag,
    commitPendingDrag,
    endZdrag
  }
}
