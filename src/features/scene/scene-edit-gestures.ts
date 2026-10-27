/* scene-edit-gestures.ts — entity picking/edit gesture coordinator (T-217 / W04,
   split by T-224 / W13a). Owns the mission-entity interaction surface of the
   owned Viewer:

   - listener registration and disposal (one ScreenSpaceEventHandler, canvas
     mouseleave, Z-hold keys),
   - the shared click-vs-drag record and camera-arbitration hooks consumed by
     scene-camera-gestures.ts,
   - composition of the extracted hover guide, surface picking, point-drag,
     avoid-height-drag, hover-flow and click-flow modules.

   The extracted modules own no listeners and read live refs; this coordinator
   installs every listener and removes it in dispose(). dispose() is
   idempotent. Viewer creation/destruction stays with MissionScene. */

import type { Cartesian2, Viewer } from 'cesium'
import type { SceneSelection, SceneTool, StudioMission } from '../../domain/mission-model'
import {
  avoidHandleId, isWaypointGroundGuideEntity, pendingPointIndex, photoWaypointId, waypointId
} from './mission-scene-helpers'
import { createAvoidHeightDrag } from './scene-avoid-height-drag'
import { createClickFlow, type SceneSelectMeta } from './scene-click-flow'
import { createHoverFlow } from './scene-hover-flow'
import { createHoverGuide, type SceneFrustumGeometry } from './scene-hover-guide'
import {
  createPointDrag,
  type PendingClickArmState, type PendingDownState, type PendingDragState,
  type WaypointDownState, type WaypointDragState, type ZDragState
} from './scene-point-drag'
import { createSurfacePick } from './scene-surface-pick'

type CesiumNS = typeof import('cesium')

/* Shared click-vs-drag record (created once per Viewer by MissionScene and
   passed to both gesture installers): a camera or entity drag that crossed
   the click threshold suppresses the release LEFT_CLICK. */
export interface SceneDragPressRecord {
  activePointerId: number | null
  downX: number
  downY: number
  dragged: boolean
  avoidId: string | null
  avoidStartY: number
  avoidStartHeight: number
  avoidPosition: import('cesium').Cartesian3 | null
  cameraInputs: boolean
}

/* Callbacks into the parent route (mission/index) — the exact
   MissionSceneProps pick callbacks, kept in one place. */
export interface ScenePickCallbacks {
  onPickWaypoint: (id: string) => void
  onPickZone: (kind: 'area' | 'avoid', id: string) => void
  onClearSelection: () => void
  onScenePoint: (p: { x: number; y: number }) => void
  onDraftHover: (p: { x: number; y: number } | null, nearStart: boolean) => void
  onClosePending: () => void
  onInsertWaypoint: (beforeIndex: number, point: { x: number; y: number }, z: number) => void
  onRemoveWaypoint: (id: string) => void
  onWaypointAltitudeChange: (id: string, z: number) => void
  onWaypointPositionChange: (id: string, x: number, y: number) => void
  onAvoidHeightChange: (id: string, heightM: number) => void
  onPendingPositionChange?: (index: number, x: number, y: number) => void
  onPendingAltitudeChange?: (index: number, z: number) => void
  onInsertPendingPoint?: (index: number, point: { x: number; y: number; z: number }) => void
  onRemovePendingPoint?: (index: number) => void
}

interface SceneEditStateRefs {
  missionRef: { current: StudioMission }
  toolRef: { current: SceneTool }
  selectionRef: { current: SceneSelection | null }
  simActiveRef: { current: boolean }
  pickRef: { current: ScenePickCallbacks }
  drawAltRef: { current: number }
  pendingPointsRef: { current: { x: number; y: number; z?: number }[] }
  pendingShapeRef: { current: 'polygon' | 'cylinder' }
  hoverRef: { current: { insert: number | null; pendingInsert: number | null } }
  hoveredWaypointRef: { current: string | null }
  hoveredPhotoRef: { current: string | null }
  selectedPhotoRef: { current: string | null }
  showPhotoMarkersRef: { current: boolean }
  frustumGeomRef: { current: Map<string, SceneFrustumGeometry> }
  zHeldRef: { current: boolean }
  zdragRef: { current: ZDragState | null }
  zdragInputsRef: { current: boolean }
  wpDragRef: { current: WaypointDragState | null }
  pendingDragRef: { current: PendingDragState | null }
  pendingDownRef: { current: PendingDownState | null }
  pendingClickArmRef: { current: PendingClickArmState | null }
  wpDownRef: { current: WaypointDownState | null }
  selectMetaRef: { current: SceneSelectMeta | null }
  toolRevRef: { current: number }
  selRevRef: { current: number }
  worldTerrainTrianglesRef: { current: Array<readonly [import('cesium').Cartesian3, import('cesium').Cartesian3, import('cesium').Cartesian3]> }
  abortZdrag: () => void
  abortWpDrag: () => void
  abortPendingDrag: () => void
}

export interface EditGestureHooks {
  /* Camera-arbitration inputs (called by scene-camera-gestures.ts). */
  isZPressActive(): boolean
  hasActiveEditDrag(): boolean
  /* Per pressed candidate: 'skip' keeps scanning (background-allowlist
     entity), 'blocked' ends the press (avoid handle owns its flow), 'hold'
     claims the press for editing and freezes native camera drift (already
     prepared here, applied by the camera side). */
  classifyCandidatePress(e: PointerEvent, raw: string): 'skip' | 'blocked' | 'hold'
  clearWaypointDown(): void
  advanceEditDrag(e: PointerEvent): void
  resolveEditPointer(e: PointerEvent): void
  abortEditDrags(): void
  escAbortEdits(): void
  abortForBlur(): void
  /* Ground guide owner API (also used by the re-validation hook). */
  hideWaypointGroundGuide(): void
  updateWaypointGroundGuide(id: string | null): void
}

export interface EditGestures extends EditGestureHooks {
  /* Installs this module's OWN listeners (entity picking/edit surface:
     ScreenSpaceEventHandler, canvas mouseleave, Z-hold keys). Camera
     arbitration stays with scene-camera-gestures.ts. */
  install(): void
  /* Removal of every installed listener / handler / owner hook. Idempotent. */
  dispose(): void
}

export function createEditGestures(deps: {
  viewer: Viewer
  Cesium: CesiumNS
  dragState: SceneDragPressRecord
  canvasPosition: (position: Cartesian2) => Cartesian2
  canvasPositionFromClient: (clientX: number, clientY: number) => Cartesian2
  state: SceneEditStateRefs
}): EditGestures {
  const { viewer, Cesium, dragState, canvasPosition, canvasPositionFromClient } = deps
  const {
    missionRef, toolRef, selectionRef, simActiveRef, pickRef, drawAltRef, pendingPointsRef, pendingShapeRef,
    hoverRef, hoveredWaypointRef, hoveredPhotoRef, selectedPhotoRef, showPhotoMarkersRef, frustumGeomRef,
    zHeldRef, zdragRef, zdragInputsRef, wpDragRef, pendingDragRef,
    pendingDownRef, pendingClickArmRef, wpDownRef, selectMetaRef, toolRevRef, selRevRef,
    worldTerrainTrianglesRef,
    abortZdrag, abortWpDrag, abortPendingDrag
  } = deps.state

  /* Extracted owners. Each receives ref objects (never ref.current) and the
     stable Viewer/Cesium pair; they hold no listeners or lifecycle. */
  const surfacePick = createSurfacePick({
    viewer, Cesium, missionRef, drawAltRef, worldTerrainTrianglesRef, canvasPositionFromClient
  })
  const hoverGuide = createHoverGuide({
    viewer,
    Cesium,
    state: { missionRef, hoveredWaypointRef, hoveredPhotoRef, selectedPhotoRef, frustumGeomRef },
    visibleGroundHeightAt: surfacePick.visibleGroundHeightAt
  })
  const pointDrag = createPointDrag({
    viewer,
    Cesium,
    dragState,
    state: {
      missionRef, toolRef, simActiveRef, pickRef, drawAltRef, pendingPointsRef, hoverRef, hoveredWaypointRef,
      zHeldRef, zdragRef, zdragInputsRef, wpDragRef, pendingDragRef, pendingDownRef, pendingClickArmRef, wpDownRef
    },
    surface: surfacePick,
    updateWaypointGroundGuide: hoverGuide.updateWaypointGroundGuide
  })
  const avoidHeightDrag = createAvoidHeightDrag({
    viewer, Cesium, dragState, missionRef, pickRef, canvasPosition
  })
  const hoverFlow = createHoverFlow({
    viewer,
    Cesium,
    state: {
      missionRef, toolRef, simActiveRef, pickRef, drawAltRef, pendingPointsRef, pendingShapeRef,
      hoverRef, hoveredWaypointRef, hoveredPhotoRef, showPhotoMarkersRef, frustumGeomRef
    },
    canvasPosition,
    surface: surfacePick,
    hoverGuide,
    pointDrag,
    avoidHeightDrag
  })
  const clickFlow = createClickFlow({
    viewer,
    Cesium,
    dragState,
    state: {
      missionRef, toolRef, selectionRef, simActiveRef, pickRef, drawAltRef, pendingPointsRef, pendingShapeRef,
      pendingDownRef, pendingClickArmRef, wpDownRef, selectMetaRef, toolRevRef, selRevRef, hoveredWaypointRef
    },
    canvasPosition,
    surface: surfacePick
  })

  let screenHandler: import('cesium').ScreenSpaceEventHandler | null = null
  let disposed = false
  /* Remover closures — keep the concrete listener types (KeyboardEvent etc.)
     intact; casting through EventListener would widen the handler params. */
  const removeWindow: Array<() => void> = []
  const removeCanvas: Array<() => void> = []

  /* Registration stubs — filled in by install(). */
  const onZKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
    if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) zHeldRef.current = true
  }
  const onZKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'z' || e.key === 'Z') zHeldRef.current = false
  }
  const onZBlur = () => {
    zHeldRef.current = false
  }

  const hooks: EditGestureHooks = {
    isZPressActive: () => zdragRef.current !== null,
    hasActiveEditDrag: () => zdragRef.current !== null || wpDragRef.current !== null || pendingDragRef.current !== null || avoidHeightDrag.isActive(),
    classifyCandidatePress: (e, raw) => {
      // Background-only allowlist: grid, route line,
      // leg labels and the drawing plane. Every other mission entity
      // retains priority.
      if (raw === 'ms-grid-x' || raw === 'ms-grid-y' || raw.startsWith('ms-route') || raw.startsWith('ms-transfer') || raw.startsWith('ms-world-terrain') || raw === 'ms-draw-plane' || raw.startsWith('ms-route-len-') || raw === 'ms-pending-line') return 'skip'
      // Avoid height handles own their drag flow (they manage
      // enableInputs themselves); leave them fully untouched.
      if (avoidHandleId(raw)) return 'blocked'
      const pendingPressIdx = toolRef.current === 'route' ? pendingPointIndex(raw) : null
      if (pendingPressIdx !== null && pendingPointsRef.current[pendingPressIdx]) {
        pointDrag.beginPendingPress(e, pendingPressIdx, pendingPointsRef.current[pendingPressIdx])
        return 'hold'
      }
      // (T-016) authored-waypoint press: record pointerdown for the
      // click-again delete travel check, and latch plain (XY, Z
      // preserved) vs Shift (Z-only, XY preserved) drag mode now —
      // Shift changes mid-drag never switch axes. Z-held presses stay
      // on the existing Z-drag flow (LEFT_DOWN handler).
      const wpPress = waypointId(raw) ?? photoWaypointId(raw) ?? (isWaypointGroundGuideEntity(raw) ? hoveredWaypointRef.current : null)
      const wpPressWp = wpPress ? missionRef.current.waypoints.find((w) => w.id === wpPress) : undefined
      const generatedWpPress = !!wpPressWp && (wpPressWp.generatedByArea || wpPressWp.generatedByAvoid)
      // Generated points keep derived XY. Let Shift-drag adjust their
      // explicit height override, but never preview a plain XY drag the
      // parent cannot persist.
      const wpPressEditable = !!wpPressWp && !simActiveRef.current && (!generatedWpPress || e.shiftKey || zHeldRef.current)
      if (wpPress && wpPressWp && wpPressEditable) {
        pointDrag.beginWaypointPress(e, wpPress, wpPressWp)
      } else {
        wpDownRef.current = null
      }
      // Any other mission pick owns this press: freeze native camera
      // drift until release, but let the release click through to the
      // existing pick handlers (dragState.dragged stays false unless
      // the pointer actually moves, exactly as before).
      return 'hold'
    },
    clearWaypointDown: () => {
      // Background press: never a waypoint click or drag.
      wpDownRef.current = null
    },
    advanceEditDrag: (e) => {
      // Drag mode was captured at pointer-down and stays stable even if
      // the parent switches tools mid-gesture.
      // Edit-press: native camera stays frozen. A waypoint press either
      // rests (release click flows to the pick handlers untouched) or
      // moves past the click threshold and becomes a position/altitude
      // drag (release click suppressed, commit on pointerup).
      if (pendingDragRef.current) {
        const pd = pendingDragRef.current
        if (!pd.moved) {
          const dx = e.clientX - pd.startClientX
          const dy = e.clientY - pd.startClientY
          if (dx * dx + dy * dy < 16) return
          pd.moved = true
          pendingDownRef.current = null
          pendingClickArmRef.current = null
          dragState.dragged = true
          try {
            viewer.canvas.setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          viewer.canvas.style.cursor = pd.mode === 'z' ? 'ns-resize' : 'move'
        }
        pointDrag.previewPendingDrag(e)
        return
      }
      const wd = wpDragRef.current
      if (!wd) return
      if (!wd.moved) {
        const dx = e.clientX - wd.startClientX
        const dy = e.clientY - wd.startClientY
        if (dx * dx + dy * dy < 16) return
        wd.moved = true
        // Suppress the release LEFT_CLICK so a drag never edits,
        // selects, or deletes.
        dragState.dragged = true
        try {
          viewer.canvas.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        viewer.canvas.style.cursor = wd.mode === 'z' ? 'ns-resize' : 'move'
      }
      pointDrag.previewWpDrag(e)
    },
    resolveEditPointer: (e) => {
      // Waypoint or pending drag resolves on pointerup.
      if (pendingDragRef.current) {
        if (pendingDragRef.current.moved) pointDrag.commitPendingDrag(e.clientX, e.clientY)
        else pendingDragRef.current = null
      }
      if (wpDragRef.current) {
        if (wpDragRef.current.moved) pointDrag.commitWpDrag(e.clientX, e.clientY)
        else wpDragRef.current = null
      }
    },
    abortEditDrags: () => {
      // Pointer cancel: never commit a partial drag; restore preview.
      abortPendingDrag()
      abortWpDrag()
      abortZdrag()
      avoidHeightDrag.cancel()
      zHeldRef.current = false
    },
    escAbortEdits: () => {
      abortPendingDrag()
      abortWpDrag()
      abortZdrag()
      avoidHeightDrag.cancel()
      zHeldRef.current = false
      dragState.activePointerId = null
    },
    abortForBlur: () => {
      abortPendingDrag()
      abortWpDrag()
      abortZdrag()
      avoidHeightDrag.cancel()
      zHeldRef.current = false
      dragState.activePointerId = null
    },
    hideWaypointGroundGuide: hoverGuide.hideWaypointGroundGuide,
    updateWaypointGroundGuide: hoverGuide.updateWaypointGroundGuide
  }

  /* Installs this module's OWN listeners (everything entity-picking/edit
     related). Camera arbitration stays with scene-camera-gestures.ts. */
  const install = () => {
    screenHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    screenHandler.setInputAction(hoverFlow, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    screenHandler.setInputAction((movement: { position: Cartesian2 }) => {
      if (viewer.isDestroyed()) return
      const screenPosition = canvasPosition(movement.position)
      const picked = viewer.scene.drillPick(screenPosition, 8) ?? []
      if (avoidHeightDrag.begin(screenPosition, picked)) return
      pointDrag.beginZdrag(screenPosition, picked)
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN)

    screenHandler.setInputAction(() => {
      if (!dragState.avoidId) {
        pointDrag.endZdrag()
        return
      }
      avoidHeightDrag.commit()
    }, Cesium.ScreenSpaceEventType.LEFT_UP)

    screenHandler.setInputAction(clickFlow, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    /* Clear canvas-only hover affordances when Cesium stops sending MOUSE_MOVE
       on pointer exit. Keep a selected photo emphasized through the shared
       emphasis writer. */
    const canvasMouseLeave = () => {
      hoverGuide.clearWaypointHover()
      hoverGuide.clearPhotoHover()
    }
    viewer.canvas.addEventListener('mouseleave', canvasMouseLeave)
    removeCanvas.push(() => viewer.canvas.removeEventListener('mouseleave', canvasMouseLeave))

    /* Plain Z hold arms waypoint altitude-drag. Ctrl/Meta+Z stays undo;
       typing targets never arm (matching the parent shortcut guard). */
    window.addEventListener('keydown', onZKeyDown)
    window.addEventListener('keyup', onZKeyUp)
    window.addEventListener('blur', onZBlur)
    removeWindow.push(
      () => window.removeEventListener('keydown', onZKeyDown),
      () => window.removeEventListener('keyup', onZKeyUp),
      () => window.removeEventListener('blur', onZBlur)
    )
  }

  return {
    ...hooks,
    install,
    dispose: () => {
      if (disposed) return
      disposed = true
      hooks.abortForBlur()
      for (const removeCanvasListener of removeCanvas) removeCanvasListener()
      removeCanvas.length = 0
      for (const removeWindowListener of removeWindow) removeWindowListener()
      removeWindow.length = 0
      if (screenHandler && !screenHandler.isDestroyed()) screenHandler.destroy()
      screenHandler = null
      /* Stale hover affordances must not outlive the owning Viewer. */
      hoveredPhotoRef.current = null
      hoverRef.current = { insert: null, pendingInsert: null }
      wpDragRef.current = null
      pendingDragRef.current = null
      zdragRef.current = null
      zHeldRef.current = false
      dragState.activePointerId = null
    }
  }
}
