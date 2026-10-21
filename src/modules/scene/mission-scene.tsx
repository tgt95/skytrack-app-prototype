/* mission-scene.tsx — route-local Cesium 3D host for Mission Studio.
   Owns its Viewer; no Planner imports, no shared render loop. Local ENU meters
   map onto the mission's own geographic origin (per-mission anchor, legacy
   default in mission-model). Online Esri imagery is an optional basemap;
   authored geometry remains in the same local prototype frame. */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Viewer } from 'cesium'
import { Button } from 'skytrack-ui/button'
import { circleFootprint, generateAreaScan, generateAreaTraversal, getAreaFlightAltitudeM, getMissionEnd, getMissionRouteWaypoints, getMissionRoutes, getMissionStart, isValidRing, missionOrigin, projectMockReconFootprintToGround, type AvoidZone, type MissionArea, type SceneSelection, type SceneTool, type StudioMission } from '../../domain/mission-model'
import { BASEMAPS, type MissionBasemapStyle } from './mission-map-2d'
import { computeDerivedTransfers } from '../../domain/transfer-planner'
import { samplePlan, type SimPlan } from '../simulation/simulation'
import { MissionCompassCube, resolveMissionSnap, type MissionCubeSnap } from './mission-compass-cube'
import { WORLD_TERRAIN_FIXTURES } from './world-terrain-fixtures'

type CesiumNS = typeof import('cesium');

export interface MissionSceneHandle {
  resetCamera: () => void
  focusVehicle: () => void
  focusPoint: (p: { x: number; y: number; z: number }) => void
  flyToLocation: (location: { latitude: number; longitude: number }) => void
  zoomBy: (factor: number) => void
  /** Snap to a top-down view preserving the current scene center and range. */
  snapTopDown: () => void
  isZdragActive: () => boolean
  abortZdrag: () => void
}

export type SceneReadiness = 'loading' | 'ready' | 'error' | 'without-3d'

interface MissionSceneProps {
  mission: StudioMission
  tool: SceneTool
  selection: SceneSelection | null
  simActive: boolean
  clockRef: { current: number }
  previewPositionRef: { current: { x: number; y: number; z: number } | null }
  previewCaptureRef: { current: string | null }
  plan: SimPlan | null
  reducedMotion: boolean
  showPhotoMarkers?: boolean
  showCameraFootprint?: boolean
  footprintOpacity?: number
  /** Show photogrammetry Area floor while its geometry is being edited. */
  showAreaSurface?: boolean
  /** Search-result pin (label aid at the selected site): rendered at the
      geocoder result after the mission origin moves there. Must not feed
      camera pivots, fits, or mission state. */
  searchMarker?: { latitude: number; longitude: number; label: string } | null
  /** Active basemap style for Photogrammetry 2D and non-blank legacy 3D Worlds. */
  basemap?: MissionBasemapStyle
  pendingPoints: { x: number; y: number; z?: number }[]
  pendingShape: 'polygon' | 'cylinder'
  draftCursor: { x: number; y: number } | null
  closeDraftAtStart: boolean
  draftAreaSettings: Pick<MissionArea, 'lineSpacingM' | 'orientationDeg' | 'paddingM'>
  draftAvoidSettings: Pick<AvoidZone, 'type' | 'heightM' | 'clearanceM'>
  /** Draft drawing altitude in meters (ruler value). Draft-only: never written
      to the mission until a draw commits. */
  drawingAltM: number
  /** Show the translucent drawing plane at drawingAltM (draw tools only). */
  planeVisible: boolean
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
  onReadinessChange: (readiness: SceneReadiness) => void
}

declare global {
  interface Window {
    CESIUM_BASE_URL: string
    __missionStudio?: Record<string, unknown>
  }
}

import {
  MOCK_FOOTPRINT_RENDER_LIFT_M, avoidHandleId, checkMarkerImage, droneMarkerImage, enuToLngLat, isWaypointGroundGuideEntity, lngLatToEnu, pendingInsertIndex, pendingPointIndex, photoWaypointId, plusMarkerImage, routeInsertIndex, safeColor, syncSearchMarkerEntities, themeColor, waypointId, zoneId,
  WAYPOINT_GROUND_ARROW_SURFACE_ID, WAYPOINT_GROUND_ARROW_WAYPOINT_ID, WAYPOINT_GROUND_GUIDE_ID, WAYPOINT_GROUND_LABEL_ID,
  type SceneToken
} from './mission-scene-helpers'

const MissionScene = forwardRef<MissionSceneHandle, MissionSceneProps>(function MissionScene(
  { mission, tool, selection, simActive, clockRef, previewPositionRef, previewCaptureRef, plan, reducedMotion, showPhotoMarkers = true, showCameraFootprint = false, footprintOpacity = 42, showAreaSurface = false, basemap = 'satellite', searchMarker = null, pendingPoints, pendingShape, draftCursor, closeDraftAtStart, draftAreaSettings, draftAvoidSettings, drawingAltM, planeVisible, onPickWaypoint, onPickZone, onClearSelection, onScenePoint, onDraftHover, onClosePending, onInsertWaypoint, onRemoveWaypoint, onWaypointAltitudeChange, onWaypointPositionChange, onAvoidHeightChange, onPendingPositionChange, onPendingAltitudeChange, onInsertPendingPoint, onRemovePendingPoint, onReadinessChange },
  ref
) {
  const selectedPhotoWaypointId = selection?.kind === 'waypoint'
    && mission.waypoints.find((waypoint) => waypoint.id === selection.id)?.actions.some((action) => action.kind === 'photo')
    ? selection.id
    : null
  const focusedPhotoWaypointId = showPhotoMarkers ? selectedPhotoWaypointId : null
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const cesiumRef = useRef<CesiumNS | null>(null)
  const toolRef = useRef(tool)
  toolRef.current = tool
  const missionRef = useRef(mission)
  missionRef.current = mission
  const selectionRef = useRef(selection)
  selectionRef.current = selection
  const simActiveRef = useRef(simActive)
  simActiveRef.current = simActive
  const planRef = useRef(plan)
  planRef.current = plan
  const reducedRef = useRef(reducedMotion)
  reducedRef.current = reducedMotion
  const pendingPointsRef = useRef(pendingPoints)
  pendingPointsRef.current = pendingPoints
  const pendingShapeRef = useRef(pendingShape)
  pendingShapeRef.current = pendingShape
  /* Search-result pin ref for entity effects that must not re-subscribe when
     only the pin changes. */
  const searchMarkerRef = useRef(searchMarker)
  searchMarkerRef.current = searchMarker
  const pickRef = useRef({
    onPickWaypoint,
    onPickZone,
    onClearSelection,
    onScenePoint,
    onDraftHover,
    onClosePending,
    onInsertWaypoint,
    onRemoveWaypoint,
    onWaypointAltitudeChange,
    onWaypointPositionChange,
    onAvoidHeightChange,
    onPendingPositionChange,
    onPendingAltitudeChange,
    onInsertPendingPoint,
    onRemovePendingPoint
  })
  pickRef.current = {
    onPickWaypoint,
    onPickZone,
    onClearSelection,
    onScenePoint,
    onDraftHover,
    onClosePending,
    onInsertWaypoint,
    onRemoveWaypoint,
    onWaypointAltitudeChange,
    onWaypointPositionChange,
    onAvoidHeightChange,
    onPendingPositionChange,
    onPendingAltitudeChange,
    onInsertPendingPoint,
    onRemovePendingPoint
  }
  const readinessRef = useRef(onReadinessChange)
  readinessRef.current = onReadinessChange
  /* Draft altitude + plane visibility refs for Cesium handlers/effects that
     must not re-subscribe per ruler tick. */
  const drawAltRef = useRef(drawingAltM)
  drawAltRef.current = drawingAltM
  const planeVisibleRef = useRef(planeVisible)
  planeVisibleRef.current = planeVisible
  /* Capture-frustum hover emphasis (Planner setCaptureFrustumEmphasis
     pattern): compact/expanded wireframe positions per photo waypoint. */
  const hoveredPhotoRef = useRef<string | null>(null)
  const selectedPhotoRef = useRef<string | null>(selectedPhotoWaypointId)
  selectedPhotoRef.current = selectedPhotoWaypointId
  const renderedPreviewCaptureRef = useRef<string | null>(null)
  const frustumGeomRef = useRef(new Map<string, { compactBase: import('cesium').Cartesian3[]; expandedBase: import('cesium').Cartesian3[]; compactRays: import('cesium').Cartesian3[]; expandedRays: import('cesium').Cartesian3[] }>())
  const worldTerrainTrianglesRef = useRef<Array<readonly [import('cesium').Cartesian3, import('cesium').Cartesian3, import('cesium').Cartesian3]>>([])
  const showPhotoMarkersRef = useRef(showPhotoMarkers)
  showPhotoMarkersRef.current = showPhotoMarkers
  /* Shared frustum emphasis writer for the hover and pointer-exit paths
     (Planner setCaptureFrustumEmphasis pattern). Only refs + arguments are
     touched, so long-lived canvas handlers stay fresh. */
  const setPhotoEmphasis = (viewer: Viewer, Cesium: CesiumNS, wpid: string | null, emphasized: boolean) => {
    if (!wpid || viewer.isDestroyed()) return
    const geom = frustumGeomRef.current.get(wpid)
    const base = viewer.entities.getById(`ms-photo-base-${wpid}`)
    const rays = viewer.entities.getById(`ms-photo-rays-${wpid}`)
    if (!geom || !base?.polyline || !rays?.polyline) return
    const highlighted = emphasized || selectedPhotoRef.current === wpid
    const depth = highlighted
      ? { base: geom.expandedBase, rays: geom.expandedRays }
      : { base: geom.compactBase, rays: geom.compactRays }
    const color = Cesium.Color.fromCssColorString(highlighted ? '#ea4335' : '#68d7e2').withAlpha(0.92)
    base.polyline.positions = new Cesium.ConstantProperty(depth.base)
    base.polyline.material = new Cesium.ColorMaterialProperty(color)
    base.polyline.width = new Cesium.ConstantProperty(highlighted ? 2.4 : 1.8)
    rays.polyline.positions = new Cesium.ConstantProperty(depth.rays)
    rays.polyline.material = new Cesium.ColorMaterialProperty(color)
    rays.polyline.width = new Cesium.ConstantProperty(highlighted ? 2.4 : 1.8)
  }
  /* Photo-marker frustums carry the 3D camera volume. The independent
     Camera capture footprint toggle adds ground-projected quads only. */
  /* Z altitude-drag state. zHeld tracks a plain Z hold (no Ctrl/Meta, never
     while typing); zdrag is the active press captured by LEFT_DOWN. */
  const zHeldRef = useRef(false)
  const zdragRef = useRef<{ id: string; startY: number; startZ: number } | null>(null)
  const zdragInputsRef = useRef(true)
  /* Hover-gated affordance: currently shown insert segment. Entity hover
     wins; otherwise the pick ray is matched in 3D against authored segments.
     (T-016: the hover minus badge is removed; deletion is click-again.) */
  const hoverRef = useRef<{ insert: number | null; pendingInsert: number | null }>({ insert: null, pendingInsert: null })
  const hoveredWaypointRef = useRef<string | null>(null)
  /* Waypoint drag (T-016): plain press moves XY preserving Z; Shift held at
     pointerdown latches Z-only mode for the whole gesture. Preview edits the
     entity directly; commit fires once on pointerup. */
  const wpDragRef = useRef<{
    id: string
    mode: 'xy' | 'z'
    startClientX: number
    startClientY: number
    startX: number
    startY: number
    startZ: number
    moved: boolean
  } | null>(null)
  /* Pending route point drag: plain press moves XY preserving Z; Shift-drag
     changes Z only. Preview updates entity; commit synchronizes to pane. */
  const pendingDragRef = useRef<{
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
  } | null>(null)
  /* Click-again removal for draft points mirrors authored-waypoint deletion:
     require the same point and <=4 px pointer travel; drags never delete. */
  const pendingDownRef = useRef<{ index: number; x: number; y: number; tool: SceneTool } | null>(null)
  const pendingClickArmRef = useRef<{ index: number; toolRev: number } | null>(null)
  /* Pointerdown record for click-again delete travel checks. */
  const wpDownRef = useRef<{ id: string; x: number; y: number; tool: SceneTool } | null>(null)
  /* Tool active when the current waypoint selection was made; a tool switch
     between first click and second click suppresses click-again delete. */
  const selectMetaRef = useRef<{ id: string; tool: SceneTool; rev: number; selRev: number } | null>(null)
  const topDownRef = useRef<() => void>(() => undefined)
  /* Shared Z-drag abort (restore live preview, no commit). Reads refs only,
     so both the imperative handle and the init closures can call it. */
  const abortZdragLocal = () => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    const zdrag = zdragRef.current
    if (!viewer || !Cesium || viewer.isDestroyed() || !zdrag) return
    const wp = missionRef.current.waypoints.find((w) => w.id === zdrag.id)
    if (wp) {
      const g = enuToLngLat(wp.x, wp.y, missionOrigin(missionRef.current))
      const entity = viewer.entities.getById(`ms-wp-${zdrag.id}`)
      const pos = entity?.position as unknown as { setValue?: (v: import('cesium').Cartesian3) => void } | undefined
      if (pos && typeof pos.setValue === 'function') {
        pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wp.z))
      }
    }
    hoverRef.current = { insert: null, pendingInsert: null }
    viewer.scene.screenSpaceCameraController.enableInputs = zdragInputsRef.current
    zdragRef.current = null
    zHeldRef.current = false
    viewer.scene.requestRender()
  }
  const abortZdragRef = useRef<() => void>(() => undefined)
  abortZdragRef.current = abortZdragLocal
  /* Shared waypoint-drag abort (restore live preview, no commit). Reads refs
     only, so the imperative handle and the init closures can call it. Camera
     inputs are restored by finishCamDrag, which always runs alongside. */
  const abortWpDragLocal = () => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    const wd = wpDragRef.current
    wpDragRef.current = null
    if (!viewer || !Cesium || viewer.isDestroyed() || !wd || !wd.moved) return
    const g = enuToLngLat(wd.startX, wd.startY, missionOrigin(missionRef.current))
    const entity = viewer.entities.getById(`ms-wp-${wd.id}`)
    const pos = entity?.position as unknown as { setValue?: (v: import('cesium').Cartesian3) => void } | undefined
    if (pos && typeof pos.setValue === 'function') {
      pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wd.startZ))
    }
    viewer.scene.requestRender()
  }
  const abortWpDragRef = useRef<() => void>(() => undefined)
  abortWpDragRef.current = abortWpDragLocal
  const abortPendingDragLocal = () => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    const pd = pendingDragRef.current
    pendingDragRef.current = null
    if (!viewer || !Cesium || viewer.isDestroyed() || !pd || !pd.moved) return
    const g = enuToLngLat(pd.startX, pd.startY, missionOrigin(missionRef.current))
    const entity = viewer.entities.getById(`ms-pending-${pd.index}`)
    const pos = entity?.position as unknown as { setValue?: (v: import('cesium').Cartesian3) => void } | undefined
    if (pos && typeof pos.setValue === 'function') {
      pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, pd.startZ))
    }
    const lineEntity = viewer.entities.getById('ms-pending-line')
    if (lineEntity && pendingPointsRef.current.length >= 2) {
      const flat: number[] = []
      const defAlt = Math.max(drawAltRef.current, missionRef.current.takeoffAltM, 0.5)
      pendingPointsRef.current.forEach((p) => {
        const pz = typeof p.z === 'number' ? p.z : defAlt
        const ptG = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
        flat.push(ptG.lng, ptG.lat, pz)
      })
      const poly = lineEntity.polyline as unknown as { positions?: { setValue?: (v: import('cesium').Cartesian3[]) => void } } | undefined
      if (poly && poly.positions && typeof poly.positions.setValue === 'function') {
        poly.positions.setValue(Cesium.Cartesian3.fromDegreesArrayHeights(flat))
      }
    }
    viewer.scene.requestRender()
  }
  const abortPendingDragRef = useRef<() => void>(() => undefined)
  abortPendingDragRef.current = abortPendingDragLocal

  /* Record the tool active when a waypoint becomes selected, so a tool
     switch between first click and second click suppresses delete. Any
     selection break disarms; reselecting re-arms as a fresh first click. */
  const toolRevRef = useRef(0)
  const selRevRef = useRef(0)
  const selKeyRef = useRef<string | null>(null)
  useEffect(() => {
    toolRevRef.current += 1
    pendingClickArmRef.current = null
    pendingDownRef.current = null
  }, [tool])
  useEffect(() => {
    // Continuity is value-based: redundant setSelection calls with the same
    // waypoint neither bump the revision nor disarm the arming click.
    const key = selection?.kind === 'waypoint' ? selection.id : null
    if (key === selKeyRef.current) return
    selKeyRef.current = key
    selRevRef.current += 1
    if (key !== null) {
      selectMetaRef.current = { id: key, tool, rev: toolRevRef.current, selRev: selRevRef.current }
    } else {
      selectMetaRef.current = null
    }
  }, [selection, tool])

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [without3d, setWithout3d] = useState(false)

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed() || status !== 'ready') return
    if (mission.worldType !== '2D' && mission.world === 'Blank space') {
      viewer.imageryLayers.removeAll()
      viewer.scene.requestRender()
      return
    }
    let cancelled = false
    /* Blank space stays imagery-free; 2D and named 3D Worlds use one selected
       imagery layer at a time. Terrain fixtures remain local Cesium geometry. */
    const imageryUrl = BASEMAPS[basemap].url.replace(/\/tile\/\{z\}\/\{y\}\/\{x\}$/, '')
    void import('cesium').then(async (Cesium) => {
      const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(imageryUrl, { enablePickFeatures: false })
      if (cancelled || viewer.isDestroyed()) return
      viewer.imageryLayers.removeAll()
      viewer.imageryLayers.addImageryProvider(provider)
      viewer.scene.requestRender()
    }).catch(() => {
      /* Keep the last imagery or token-based globe visible when the basemap is offline. */
    })
    return () => { cancelled = true }
  }, [status, basemap, mission.worldType, mission.world])
  /* Search-result pin sync for pin-only changes (the mission entity sync
     above already re-adds the pin after its own wipe). Camera-only aid:
     never touches mission state, pivots, or fits. */
  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium || viewer.isDestroyed() || status !== 'ready') return
    syncSearchMarkerEntities(viewer, Cesium, searchMarker)
  }, [status, searchMarker])
  /* Live camera orientation for the Mission Studio compass cube. Updated on
     camera change (rounded to limit renders), gesture steps, and snaps. */
  const [orientation, setOrientation] = useState({ heading: 0.6, pitch: -0.62 })
  const snapFnRef = useRef<(snap: MissionCubeSnap) => void>(() => undefined)
  const orbitByRef = useRef<(dx: number, dy: number) => void>(() => undefined)
  const orbitEndRef = useRef<() => void>(() => undefined)
  const gestureModeRef = useRef('none')
  const handleCubeSnap = useCallback((snap: MissionCubeSnap) => snapFnRef.current(snap), [])
  const handleCubeOrbitBy = useCallback((dx: number, dy: number) => orbitByRef.current(dx, dy), [])
  const handleCubeOrbitEnd = useCallback(() => orbitEndRef.current(), [])
  /* Frames to keep rendering after an entity sync. Cesium builds primitive
     geometry time-sliced across frames; with requestRenderMode a single
     requestRender can leave later primitives unbuilt (slow software GL).
     Draining with bounded extra frames guarantees the scene settles. */
  const settleRef = useRef(0)

  const fitMission = (viewer: Viewer, Cesium: CesiumNS, missionSnap: StudioMission) => {
    const snapOrigin = missionOrigin(missionSnap)
    const pts = missionSnap.waypoints.map((w) => {
      const g = enuToLngLat(w.x, w.y, snapOrigin)
      return Cesium.Cartesian3.fromDegrees(g.lng, g.lat, w.z)
    })
    if (pts.length === 0) {
      const isNamedLegacyWorld = missionSnap.worldType !== '2D' && missionSnap.world !== 'Blank space'
      const cameraOffset = isNamedLegacyWorld ? 195 : 0
      const g = enuToLngLat(missionSnap.spawn.x, missionSnap.spawn.y - cameraOffset, snapOrigin)
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, isNamedLegacyWorld ? 280 : 120),
        orientation: { heading: 0, pitch: isNamedLegacyWorld ? -55 * (Math.PI / 180) : -Math.PI / 3, roll: 0 }
      })
      viewer.scene.requestRender()
      return
    }
    const sphere = Cesium.BoundingSphere.fromPoints(pts)
    const range = Math.min(800, Math.max(70, sphere.radius * 3.2))
    viewer.camera.setView({
      destination: sphere.center,
      orientation: { heading: 0.6, pitch: -0.62, roll: 0 }
    })
    viewer.camera.moveBackward(range)
    viewer.scene.requestRender()
  }

  const fitRef = useRef(fitMission)
  fitRef.current = fitMission

  const worldViewRef = useRef({ world: mission.world, worldType: mission.worldType })
  useEffect(() => {
    const previous = worldViewRef.current
    worldViewRef.current = { world: mission.world, worldType: mission.worldType }
    if (previous.world === mission.world && previous.worldType === mission.worldType) return
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium || viewer.isDestroyed() || status !== 'ready') return
    // Named 3D fixtures are authored around Home. Reframe only on World/type
    // changes so the local surface enters the viewport without moving mission data.
    fitRef.current(viewer, Cesium, missionRef.current)
  }, [mission.world, mission.worldType, status])

  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (viewer && Cesium && !viewer.isDestroyed()) fitRef.current(viewer, Cesium, missionRef.current)
    },
    focusVehicle: () => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (!viewer || !Cesium || viewer.isDestroyed()) return
      const p = planRef.current
      let gx: number
      let gy: number
      let gz: number
      if (p) {
        const t = reducedRef.current ? Math.floor(clockRef.current) : clockRef.current
        const s = samplePlan(p, t)
        gx = s.pos.x
        gy = s.pos.y
        gz = s.pos.z
      } else {
        const start = getMissionStart(missionRef.current)
        gx = start.x
        gy = start.y
        gz = Math.max(start.z, 0.5)
      }
      const g = enuToLngLat(gx, gy, missionOrigin(missionRef.current))
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, gz + 55),
        orientation: { heading: 0, pitch: -Math.PI / 2.6, roll: 0 },
        duration: reducedRef.current ? 0 : 0.9
      })
      viewer.scene.requestRender()
    },
    focusPoint: (pt) => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (!viewer || !Cesium || viewer.isDestroyed()) return
      const g = enuToLngLat(pt.x, pt.y, missionOrigin(missionRef.current))
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, pt.z + 45),
        orientation: { heading: 0, pitch: -Math.PI / 2.8, roll: 0 },
        duration: reducedRef.current ? 0 : 0.9
      })
      viewer.scene.requestRender()
    },
    flyToLocation: ({ latitude, longitude }) => {
      const viewer = viewerRef.current
      const Cesium = cesiumRef.current
      if (!viewer || !Cesium || viewer.isDestroyed()) return
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 2400),
        orientation: { heading: 0, pitch: -Math.PI / 3, roll: 0 },
        duration: reducedRef.current ? 0 : 1
      })
      viewer.scene.requestRender()
    },
    zoomBy: (factor) => {
      const viewer = viewerRef.current
      if (!viewer || viewer.isDestroyed()) return
      const dist = viewer.camera.positionCartographic?.height ?? 200
      viewer.camera.zoomIn(dist * 0.25 * factor)
      viewer.scene.requestRender()
    },
    snapTopDown: () => {
      topDownRef.current()
    },
    isZdragActive: () => zdragRef.current !== null || wpDragRef.current !== null || pendingDragRef.current !== null,
    abortZdrag: () => {
      abortPendingDragLocal()
      abortWpDragLocal()
      abortZdragLocal()
    }
  }))

  /* ------------------------- viewer lifecycle ------------------------- */
  useEffect(() => {
    if (!hostRef.current) return
    if (viewerRef.current && !viewerRef.current.isDestroyed()) return
    let mounted = true
    let failed = false
    let raf = 0
    let screenHandler: import('cesium').ScreenSpaceEventHandler | null = null
    let ro: ResizeObserver | null = null
    let camCleanup: (() => void) | null = null
    // Guard: ignore the LEFT_CLICK that ends a camera drag (Cesium has no
    // click-vs-drag distinction on its own handler).
    const dragState: { downX: number; downY: number; dragged: boolean; avoidId: string | null; avoidStartY: number; avoidStartHeight: number; avoidPosition: import('cesium').Cartesian3 | null; cameraInputs: boolean } = {
      downX: 0, downY: 0, dragged: false, avoidId: null, avoidStartY: 0, avoidStartHeight: 0, avoidPosition: null, cameraInputs: true
    }
    const onPointerDown = (e: PointerEvent) => {
      dragState.downX = e.clientX
      dragState.downY = e.clientY
      dragState.dragged = false
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons !== 0 && Math.hypot(e.clientX - dragState.downX, e.clientY - dragState.downY) > 6) {
        dragState.dragged = true
      }
    }

    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    window.CESIUM_BASE_URL = `${baseUrl}/cesium/`

    async function init() {
      setStatus('loading')
      readinessRef.current('loading')
      setErrorMessage(null)
      if (hostRef.current) {
        while (hostRef.current.firstChild) hostRef.current.removeChild(hostRef.current.firstChild)
      }
      try {
        const Cesium = await import('cesium')
        await import('cesium/Build/Cesium/Widgets/widgets.css')
        if (!mounted || !hostRef.current) return

        const viewer = new Cesium.Viewer(hostRef.current, {
          animation: false,
          baseLayer: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          requestRenderMode: true,
          maximumRenderTimeChange: Number.POSITIVE_INFINITY,
          showRenderLoopErrors: false
        })
        /* Cesium mouse events are local to the canvas's visual bounding rect.
           Convert them back to the canvas CSS-pixel viewport before passing
           positions into camera/picking APIs. This also handles a scaled
           canvas/container; devicePixelRatio is intentionally not applied
           because Cesium scene coordinates use CSS pixels. */
        const canvasPosition = (position: import('cesium').Cartesian2) => {
          const rect = viewer.canvas.getBoundingClientRect()
          const scaleX = rect.width > 0 ? viewer.canvas.clientWidth / rect.width : 1
          const scaleY = rect.height > 0 ? viewer.canvas.clientHeight / rect.height : 1
          return new Cesium.Cartesian2(position.x * scaleX, position.y * scaleY)
        }
        const canvasPositionFromClient = (clientX: number, clientY: number) => {
          const rect = viewer.canvas.getBoundingClientRect()
          return canvasPosition(new Cesium.Cartesian2(clientX - rect.left, clientY - rect.top))
        }
        if (!mounted) {
          viewer.destroy()
          return
        }
        viewerRef.current = viewer
        cesiumRef.current = Cesium
        viewer.scene.globe.baseColor = safeColor(Cesium, themeColor('--muted'), '--muted', 1)
        // Match the sky clear color to the globe base so the horizon has no
        // visible color seam against the Mission Studio scene background.
        viewer.scene.backgroundColor = safeColor(Cesium, themeColor('--muted'), '--muted', 1)
        viewer.scene.skyAtmosphere.show = false
        // Hide the default starfield skybox while keeping the scene base color
        // and mission grid visible.
        viewer.scene.skyBox.show = false

        /* ---- Mission Studio camera gestures (SkyTrac mapping, scene-local) ----
           Plain primary drag on empty scene orbits (heading + pitch);
           Command/Meta, Shift (Ctrl as a documented compatibility extension)
           pan; Option/Alt adjusts pitch only; wheel zoom stays native.
           Modifier mode is captured at pointer-down and held stable for the
           whole drag. In Cursor and in Route/Area/Avoid draw tools a camera
           drag starts only on empty background: mission pick targets
           (waypoints, zones, route insert markers, avoid
           handles, vehicle markers, pending draft points) retain
           priority; grid, route line, leg labels and the drawing plane count
           as empty background. A press that starts on a mission entity (other
           than an avoid handle, which owns its own drag flow) suppresses
           native camera drift for the press duration so picking never
           rotates the view, while the release click still reaches the
           existing pick/draw handlers untouched. A press that moves past the
           drag threshold suppresses the release click, so a camera drag in
           a draw tool never drops a draft point. */
        const DEG = Math.PI / 180
        const MIN_PITCH = -89.5 * DEG
        const MAX_PITCH = -10 * DEG
        const cam: {
          mode: 'none' | 'orbit' | 'pan' | 'pitch' | 'edit'
          pointerId: number | null
          downX: number
          downY: number
          lastX: number
          lastY: number
          thresh: boolean
          pivot: import('cesium').Cartesian3 | null
          range: number
          heading: number
          pitch: number
          savedRotate: boolean
          savedTranslate: boolean
          savedTilt: boolean
          savedLook: boolean
        } = {
          mode: 'none', pointerId: null, downX: 0, downY: 0, lastX: 0, lastY: 0,
          thresh: false, pivot: null, range: 300, heading: 0, pitch: -0.62,
          savedRotate: true, savedTranslate: false, savedTilt: true, savedLook: false
        }
        let snapRaf = 0
        let lastPushedH = Number.NaN
        let lastPushedP = Number.NaN
        // Native controller flags are saved/restored only around an actual
        // camera drag. Snaps and declined pointer-downs must never clobber
        // the controller's default gesture flags.
        let camInputsTouched = false
        const cancelSnap = () => {
          if (snapRaf) {
            cancelAnimationFrame(snapRaf)
            snapRaf = 0
          }
        }
        const pushOrientation = () => {
          if (viewer.isDestroyed() || !mounted) return
          const h = viewer.camera.heading
          const p = viewer.camera.pitch
          if (Math.abs(h - lastPushedH) < 0.004 && Math.abs(p - lastPushedP) < 0.004) return
          lastPushedH = h
          lastPushedP = p
          setOrientation({ heading: h, pitch: p })
        }
        const resolvePivot = (forSnap: boolean): import('cesium').Cartesian3 => {
          // Stable pivot: the mission centroid. A raw screen-center pick goes
          // arbitrarily far on grazing rays (near-horizontal views), which
          // used to throw snaps/orbits off the mission. For drags the screen
          // pick is honored only while it stays near the mission.
          const snap = missionRef.current
          const pts = [...snap.waypoints.map((w) => ({ x: w.x, y: w.y }))]
          for (const a of snap.areas) for (const p of a.points) pts.push(p)
          for (const a of snap.avoids) for (const p of a.points) pts.push(p)
          // Legacy spawn only centers the pivot when no sequence geometry
          // exists (T-021 AC11: mission starts at waypoint 1).
          if (pts.length === 0) pts.push({ x: snap.spawn.x, y: snap.spawn.y })
          let x = 0
          let y = 0
          for (const p of pts) {
            x += p.x
            y += p.y
          }
          if (pts.length > 0) {
            x /= pts.length
            y /= pts.length
          }
          const g = enuToLngLat(x, y, missionOrigin(missionRef.current))
          const home = Cesium.Cartesian3.fromDegrees(g.lng, g.lat, 0)
          if (forSnap) return home
          const rect = viewer.canvas.getBoundingClientRect()
          const center = new Cesium.Cartesian2(Math.max(rect.width / 2, 1), Math.max(rect.height / 2, 1))
          const ray = viewer.camera.getPickRay(center)
          if (ray) {
            const hit = viewer.scene.globe.pick(ray, viewer.scene)
            if (hit && Number.isFinite(hit.x)) {
              const limit = Math.max(150, cam.range * 0.75)
              if (Cesium.Cartesian3.distance(hit, home) <= limit) return hit
              return home
            }
          }
          const ellipsoid = viewer.camera.pickEllipsoid(center, viewer.scene.globe.ellipsoid)
          if (ellipsoid && Number.isFinite(ellipsoid.x)) {
            const limit = Math.max(150, cam.range * 0.75)
            if (Cesium.Cartesian3.distance(ellipsoid, home) <= limit) return ellipsoid
            return home
          }
          return home
        }
        const orbitSensitivity = () => (2 * Math.PI) / Math.max(viewer.canvas.clientHeight, 1)
        const applyLook = () => {
          if (!cam.pivot || viewer.isDestroyed()) return
          viewer.camera.lookAt(cam.pivot, new Cesium.HeadingPitchRange(cam.heading, cam.pitch, cam.range))
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
          viewer.scene.requestRender()
          pushOrientation()
        }
        const applyPan = (dx: number, dy: number) => {
          if (viewer.isDestroyed()) return
          const camera = viewer.camera
          const fov = (camera.frustum as import('cesium').PerspectiveFrustum).fov || Cesium.Math.toRadians(60)
          const metersPerPixel = (2 * cam.range * Math.tan(fov / 2)) / Math.max(viewer.canvas.clientWidth, 1)
          const right = camera.right
          const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(camera.positionWC, new Cesium.Cartesian3())
          const forward = Cesium.Cartesian3.cross(up, right, new Cesium.Cartesian3())
          Cesium.Cartesian3.normalize(forward, forward)
          const sinPitch = Math.max(Math.abs(Math.sin(camera.pitch)), 0.2)
          const cdx = Cesium.Math.clamp(dx, -100, 100)
          const cdy = Cesium.Math.clamp(dy, -100, 100)
          const dX = Cesium.Cartesian3.multiplyByScalar(right, -cdx * metersPerPixel, new Cesium.Cartesian3())
          const dY = Cesium.Cartesian3.multiplyByScalar(forward, (cdy * metersPerPixel) / sinPitch, new Cesium.Cartesian3())
          const delta = Cesium.Cartesian3.add(dX, dY, new Cesium.Cartesian3())
          if (Number.isFinite(delta.x) && Number.isFinite(delta.y) && Number.isFinite(delta.z)) {
            Cesium.Cartesian3.add(camera.position, delta, camera.position)
          }
          if (cam.pivot) cam.range = Cesium.Cartesian3.distance(camera.positionWC, cam.pivot)
          viewer.scene.requestRender()
          pushOrientation()
        }
        const restoreCamInputs = () => {
          if (!camInputsTouched || viewer.isDestroyed()) return
          camInputsTouched = false
          const controller = viewer.scene.screenSpaceCameraController
          controller.enableRotate = cam.savedRotate
          controller.enableTranslate = cam.savedTranslate
          controller.enableTilt = cam.savedTilt
          controller.enableLook = cam.savedLook
        }
        const pickWorldTerrainSurface = (position: import('cesium').Cartesian2): import('cesium').Cartesian3 | undefined => {
          if (worldTerrainTrianglesRef.current.length === 0) return undefined
          const ray = viewer.camera.getPickRay(position)
          if (!ray) return undefined
          let nearest: import('cesium').Cartesian3 | undefined
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
        const pickVisibleSurface = (position: import('cesium').Cartesian2): import('cesium').Cartesian3 | undefined => {
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
        const pickAtDrawingAltitude = (position: import('cesium').Cartesian2, activeTool: SceneTool): import('cesium').Cartesian3 | undefined => {
          const ray = viewer.camera.getPickRay(position)
          if (!ray) return undefined
          const originGeo = missionOrigin(missionRef.current)
          const planePoint = Cesium.Cartesian3.fromDegrees(originGeo.lng, originGeo.lat, drawingPlaneAltitude(activeTool))
          const normal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(planePoint, new Cesium.Cartesian3())
          const plane = new Cesium.Plane(normal, -Cesium.Cartesian3.dot(normal, planePoint))
          const hit = Cesium.IntersectionTests.rayPlane(ray, plane, new Cesium.Cartesian3())
          return hit && Number.isFinite(hit.x) && Number.isFinite(hit.y) && Number.isFinite(hit.z) ? hit : undefined
        }
        const hideWaypointGroundGuide = () => {
          hoveredWaypointRef.current = null
          const guide = viewer.entities.getById(WAYPOINT_GROUND_GUIDE_ID)
          const waypointArrow = viewer.entities.getById(WAYPOINT_GROUND_ARROW_WAYPOINT_ID)
          const surfaceArrow = viewer.entities.getById(WAYPOINT_GROUND_ARROW_SURFACE_ID)
          const label = viewer.entities.getById(WAYPOINT_GROUND_LABEL_ID)
          if (guide) guide.show = false
          if (waypointArrow) waypointArrow.show = false
          if (surfaceArrow) surfaceArrow.show = false
          if (label) label.show = false
          viewer.scene.requestRender()
        }
        const visibleGroundHeightAt = (point: import('cesium').Cartesian3): number => {
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
        const updateWaypointGroundGuide = (id: string | null) => {
          if (!id || viewer.isDestroyed()) {
            hideWaypointGroundGuide()
            return
          }
          const waypoint = missionRef.current.waypoints.find((item) => item.id === id)
          if (!waypoint) {
            hideWaypointGroundGuide()
            return
          }
          hoveredWaypointRef.current = id
          const marker = viewer.entities.getById(`ms-wp-${id}`)
          const markerPosition = marker?.position?.getValue(viewer.clock.currentTime) as unknown as import('cesium').Cartesian3 | undefined
          const point = markerPosition ?? (() => {
            const geo = enuToLngLat(waypoint.x, waypoint.y, missionOrigin(missionRef.current))
            return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, waypoint.z)
          })()
          const cartographic = Cesium.Cartographic.fromCartesian(point)
          if (!cartographic || !Number.isFinite(cartographic.longitude) || !Number.isFinite(cartographic.latitude) || !Number.isFinite(cartographic.height)) {
            hideWaypointGroundGuide()
            return
          }
          const groundHeight = visibleGroundHeightAt(point)
          const surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, groundHeight)
          const linePositions = [point, surface]
          const guideColor = safeColor(Cesium, themeColor('--primary'), '--primary', 0.9)
          const arrowColor = safeColor(Cesium, themeColor('--destructive'), '--destructive', 0.96)
          const guide = viewer.entities.getById(WAYPOINT_GROUND_GUIDE_ID) ?? viewer.entities.add({
            id: WAYPOINT_GROUND_GUIDE_ID,
            show: false,
            polyline: {
              positions: linePositions,
              width: 2,
              arcType: Cesium.ArcType.NONE,
              clampToGround: false,
              material: new Cesium.PolylineDashMaterialProperty({
                color: guideColor,
                dashLength: 12
              }),
              depthFailMaterial: new Cesium.PolylineDashMaterialProperty({
                color: guideColor,
                dashLength: 12
              })
            }
          })
          const guideLine = guide.polyline
          if (guideLine) {
            guideLine.positions = new Cesium.ConstantProperty(linePositions)
            guide.show = true
          }
          const height = Math.abs(cartographic.height - groundHeight)
          const centerHeight = (cartographic.height + groundHeight) / 2
          const arrowHalfLength = Math.min(height / 2, Math.min(15, Math.max(6, height * 0.25)))
          const waypointDirection = Math.sign(cartographic.height - groundHeight)
          const arrowCenter = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, centerHeight)
          const waypointArrowEnd = Cesium.Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            centerHeight + waypointDirection * arrowHalfLength
          )
          const surfaceArrowEnd = Cesium.Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            centerHeight - waypointDirection * arrowHalfLength
          )
          const arrowMaterial = new Cesium.PolylineArrowMaterialProperty(arrowColor)
          const waypointArrowPositions = [arrowCenter, waypointArrowEnd]
          const surfaceArrowPositions = [arrowCenter, surfaceArrowEnd]
          const waypointArrow = viewer.entities.getById(WAYPOINT_GROUND_ARROW_WAYPOINT_ID) ?? viewer.entities.add({
            id: WAYPOINT_GROUND_ARROW_WAYPOINT_ID,
            show: false,
            polyline: {
              positions: waypointArrowPositions,
              width: 12,
              material: arrowMaterial,
              depthFailMaterial: arrowMaterial,
              arcType: Cesium.ArcType.NONE
            }
          })
          const surfaceArrow = viewer.entities.getById(WAYPOINT_GROUND_ARROW_SURFACE_ID) ?? viewer.entities.add({
            id: WAYPOINT_GROUND_ARROW_SURFACE_ID,
            show: false,
            polyline: {
              positions: surfaceArrowPositions,
              width: 12,
              material: arrowMaterial,
              depthFailMaterial: arrowMaterial,
              arcType: Cesium.ArcType.NONE
            }
          })
          if (waypointArrow.polyline) {
            waypointArrow.polyline.positions = new Cesium.ConstantProperty(waypointArrowPositions)
            waypointArrow.show = height > 0.5
          }
          if (surfaceArrow.polyline) {
            surfaceArrow.polyline.positions = new Cesium.ConstantProperty(surfaceArrowPositions)
            surfaceArrow.show = height > 0.5
          }
          const label = viewer.entities.getById(WAYPOINT_GROUND_LABEL_ID) ?? viewer.entities.add({
            id: WAYPOINT_GROUND_LABEL_ID,
            show: false,
            position: arrowCenter,
            label: {
              text: `${Math.round(height)} m`,
              font: '700 14px sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.88),
              backgroundPadding: new Cesium.Cartesian2(6, 3),
              pixelOffset: new Cesium.Cartesian2(18, 0),
              horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          })
          const heightLabel = label.label
          if (heightLabel) {
            // Keep the AGL readout beside the midpoint arrow so it stays
            // aligned with the editable ground-to-waypoint height affordance.
            label.position = new Cesium.ConstantPositionProperty(arrowCenter)
            heightLabel.text = new Cesium.ConstantProperty(`${Math.round(height)} m`)
            label.show = true
          }
          viewer.scene.requestRender()
        }
        const finishCamDrag = () => {
          if (cam.pointerId !== null && !viewer.isDestroyed()) {
            try {
              if (viewer.canvas.hasPointerCapture(cam.pointerId)) viewer.canvas.releasePointerCapture(cam.pointerId)
            } catch {
              /* ignore */
            }
          }
          const wasActive = cam.thresh
          cam.pointerId = null
          cam.mode = 'none'
          cam.thresh = false
          cam.pivot = null
          gestureModeRef.current = 'none'
          if (!viewer.isDestroyed()) {
            restoreCamInputs()
            viewer.canvas.style.cursor = ''
            if (wasActive) pushOrientation()
          }
        }
        const orbitEndCube = () => {
          cam.pivot = null
          gestureModeRef.current = 'none'
          pushOrientation()
        }
        const startCamDrag = (e: PointerEvent): boolean => {
          if (viewer.isDestroyed() || !mounted) return false
          if (!e.isPrimary || e.button !== 0) return false
          if (cam.pointerId !== null) return false
          if (zdragRef.current) return false
          const pos = canvasPositionFromClient(e.clientX, e.clientY)
          let picked: unknown[] = []
          try {
            picked = viewer.scene.drillPick(pos, 6) ?? []
          } catch {
            picked = []
          }
          for (const item of picked) {
            const raw = (item as { id?: { id?: unknown } })?.id?.id
            if (typeof raw !== 'string') continue
            // Background-only allowlist: grid, route line,
            // leg labels and the drawing plane. Every other mission entity
            // retains priority.
            if (raw === 'ms-grid-x' || raw === 'ms-grid-y' || raw.startsWith('ms-route') || raw.startsWith('ms-transfer') || raw.startsWith('ms-world-terrain') || raw === 'ms-draw-plane' || raw.startsWith('ms-route-len-') || raw === 'ms-pending-line') continue
            // Avoid height handles own their drag flow (they manage
            // enableInputs themselves); leave them fully untouched.
            if (avoidHandleId(raw)) return false
            const pendingPressIdx = toolRef.current === 'route' ? pendingPointIndex(raw) : null
            if (pendingPressIdx !== null && pendingPointsRef.current[pendingPressIdx]) {
              pendingDownRef.current = { index: pendingPressIdx, x: e.clientX, y: e.clientY, tool: toolRef.current }
              const pt = pendingPointsRef.current[pendingPressIdx]
              const defAlt = Math.max(drawAltRef.current, missionRef.current.takeoffAltM, 0.5)
              const ptZ = typeof pt.z === 'number' ? pt.z : defAlt
              if (!pendingDragRef.current) {
                pendingDragRef.current = {
                  index: pendingPressIdx,
                  mode: e.shiftKey ? 'z' : 'xy',
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  startX: pt.x,
                  startY: pt.y,
                  startZ: ptZ,
                  currentX: pt.x,
                  currentY: pt.y,
                  currentZ: ptZ,
                  moved: false
                }
              }
              cancelSnap()
              cam.pointerId = e.pointerId
              cam.mode = 'edit'
              {
                const controller = viewer.scene.screenSpaceCameraController
                cam.savedRotate = controller.enableRotate
                cam.savedTranslate = controller.enableTranslate
                cam.savedTilt = controller.enableTilt
                cam.savedLook = controller.enableLook
                controller.enableRotate = false
                controller.enableTranslate = false
                controller.enableTilt = false
                controller.enableLook = false
                camInputsTouched = true
              }
              return false
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
            if (wpPress && wpPressEditable) {
              pendingClickArmRef.current = null
              pendingDownRef.current = null
              wpDownRef.current = { id: wpPress, x: e.clientX, y: e.clientY, tool: toolRef.current }
              if (!zHeldRef.current && !wpDragRef.current) {
                wpDragRef.current = {
                  id: wpPress,
                  mode: e.shiftKey ? 'z' : 'xy',
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  startX: wpPressWp.x,
                  startY: wpPressWp.y,
                  startZ: wpPressWp.z,
                  moved: false
                }
              }
            } else {
              wpDownRef.current = null
            }
            // Any other mission pick owns this press: freeze native camera
            // drift until release, but let the release click through to the
            // existing pick handlers (dragState.dragged stays false unless
            // the pointer actually moves, exactly as before).
            cancelSnap()
            cam.pointerId = e.pointerId
            cam.mode = 'edit'
            {
              const controller = viewer.scene.screenSpaceCameraController
              cam.savedRotate = controller.enableRotate
              cam.savedTranslate = controller.enableTranslate
              cam.savedTilt = controller.enableTilt
              cam.savedLook = controller.enableLook
              controller.enableRotate = false
              controller.enableTranslate = false
              controller.enableTilt = false
              controller.enableLook = false
              camInputsTouched = true
            }
            return false
          }
          cancelSnap()
          cam.pointerId = e.pointerId
          cam.mode = e.altKey ? 'pitch' : e.metaKey || e.shiftKey || e.ctrlKey ? 'pan' : 'orbit'
          // Background press: never a waypoint click or drag.
          wpDownRef.current = null
          gestureModeRef.current = cam.mode
          cam.downX = e.clientX
          cam.downY = e.clientY
          cam.lastX = e.clientX
          cam.lastY = e.clientY
          cam.thresh = false
          cam.pivot = resolvePivot(false)
          cam.range = Cesium.Cartesian3.distance(viewer.camera.positionWC, cam.pivot)
          cam.heading = viewer.camera.heading
          cam.pitch = viewer.camera.pitch
          const controller = viewer.scene.screenSpaceCameraController
          cam.savedRotate = controller.enableRotate
          cam.savedTranslate = controller.enableTranslate
          cam.savedTilt = controller.enableTilt
          cam.savedLook = controller.enableLook
          controller.enableRotate = false
          controller.enableTranslate = false
          controller.enableTilt = false
          controller.enableLook = false
          camInputsTouched = true
          return true
        }
        /* (T-016) waypoint-drag helpers. XY drags intersect the pick ray
           with the horizontal plane through the grab altitude, so the drag
           moves horizontal position only and preserves Z exactly. */
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
        const previewWpDrag = (e: PointerEvent) => {
          const wd = wpDragRef.current
          if (!wd || viewer.isDestroyed() || !mounted) return
          if (wd.mode === 'z') {
            const g = enuToLngLat(wd.startX, wd.startY, missionOrigin(missionRef.current))
            const desiredZ = wd.startZ + (wd.startClientY - e.clientY) * wpMetersPerPixel()
            const groundPoint = Cesium.Cartesian3.fromDegrees(g.lng, g.lat, Math.max(0, desiredZ))
            const previewZ = Math.max(visibleGroundHeightAt(groundPoint), desiredZ, 0)
            const entity = viewer.entities.getById(`ms-wp-${wd.id}`)
            const pos = entity?.position as unknown as { setValue?: (v: import('cesium').Cartesian3) => void } | undefined
            if (pos && typeof pos.setValue === 'function') {
              pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, previewZ))
              updateWaypointGroundGuide(wd.id)
            }
          } else {
            const enu = wpXyFromScreen(e.clientX, e.clientY, wd.startZ)
            if (enu && Number.isFinite(enu.x) && Number.isFinite(enu.y)) {
              const cx = Math.max(-2000, Math.min(2000, enu.x))
              const cy = Math.max(-2000, Math.min(2000, enu.y))
              const g = enuToLngLat(cx, cy, missionOrigin(missionRef.current))
              const entity = viewer.entities.getById(`ms-wp-${wd.id}`)
              const pos = entity?.position as unknown as { setValue?: (v: import('cesium').Cartesian3) => void } | undefined
              if (pos && typeof pos.setValue === 'function') {
                pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wd.startZ))
              }
            }
          }
          viewer.scene.requestRender()
        }
        /* Commit a moved waypoint drag exactly once (one undo entry via the
           parent). XY rounds to 0.1 m like click-to-draw; Z reuses the
           existing altitude path (ground-clamped, no new quantization). */
        const commitWpDrag = (clientX: number, clientY: number) => {
          const wd = wpDragRef.current
          wpDragRef.current = null
          if (!wd || !wd.moved || viewer.isDestroyed()) return
          if (wd.mode === 'z') {
            const entity = viewer.entities.getById(`ms-wp-${wd.id}`)
            const pos = entity?.position?.getValue(viewer.clock.currentTime) as unknown as import('cesium').Cartesian3 | undefined
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
          if (!pd || viewer.isDestroyed() || !mounted) return
          if (pd.mode === 'z') {
            const rawZ = pd.startZ + (pd.startClientY - e.clientY) * wpMetersPerPixel()
            const previewZ = Math.max(0, Math.round(rawZ * 100) / 100)
            pd.currentZ = previewZ
            const g = enuToLngLat(pd.startX, pd.startY, missionOrigin(missionRef.current))
            const entity = viewer.entities.getById(`ms-pending-${pd.index}`)
            const pos = entity?.position as unknown as { setValue?: (v: import('cesium').Cartesian3) => void } | undefined
            if (pos && typeof pos.setValue === 'function') {
              pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, previewZ))
            }
          } else {
            const enu = wpXyFromScreen(e.clientX, e.clientY, pd.startZ)
            if (enu && Number.isFinite(enu.x) && Number.isFinite(enu.y)) {
              const cx = Math.max(-2000, Math.min(2000, Math.round(enu.x * 10) / 10))
              const cy = Math.max(-2000, Math.min(2000, Math.round(enu.y * 10) / 10))
              pd.currentX = cx
              pd.currentY = cy
              const g = enuToLngLat(cx, cy, missionOrigin(missionRef.current))
              const entity = viewer.entities.getById(`ms-pending-${pd.index}`)
              const pos = entity?.position as unknown as { setValue?: (v: import('cesium').Cartesian3) => void } | undefined
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
            const poly = lineEntity.polyline as unknown as { positions?: { setValue?: (v: import('cesium').Cartesian3[]) => void } } | undefined
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
            const pos = entity?.position?.getValue(viewer.clock.currentTime) as unknown as import('cesium').Cartesian3 | undefined
            let z = pd.startZ
            if (pos) {
              const carto = Cesium.Cartographic.fromCartesian(pos)
              if (Number.isFinite(carto.height)) z = Math.max(0, Math.round(carto.height * 100) / 100)
            }
            pickRef.current.onPendingAltitudeChange?.(pd.index, z)
          } else {
            const enu = wpXyFromScreen(clientX, clientY, pd.startZ)
            if (enu && Number.isFinite(enu.x) && Number.isFinite(enu.y)) {
              const cx = Math.max(-2000, Math.min(2000, Math.round(enu.x * 10) / 10))
              const cy = Math.max(-2000, Math.min(2000, Math.round(enu.y * 10) / 10))
              pickRef.current.onPendingPositionChange?.(pd.index, cx, cy)
            } else {
              viewer.scene.requestRender()
            }
          }
        }
        const moveCamDrag = (e: PointerEvent) => {
          if (cam.pointerId !== e.pointerId) return
          if (viewer.isDestroyed() || !mounted) {
            abortPendingDragRef.current()
            abortWpDragRef.current()
            finishCamDrag()
            return
          }
          // Drag mode was captured at pointer-down and stays stable even if
          // the parent switches tools mid-gesture.
          // Edit-press: native camera stays frozen. A waypoint press either
          // rests (release click flows to the pick handlers untouched) or
          // moves past the click threshold and becomes a position/altitude
          // drag (release click suppressed, commit on pointerup).
          if (cam.mode === 'edit') {
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
              previewPendingDrag(e)
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
            previewWpDrag(e)
            return
          }
          const totalDx = e.clientX - cam.downX
          const totalDy = e.clientY - cam.downY
          if (!cam.thresh) {
            if (totalDx * totalDx + totalDy * totalDy < 16) return
            cam.thresh = true
            // Suppress the release LEFT_CLICK so a camera drag never edits.
            dragState.dragged = true
            try {
              viewer.canvas.setPointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
            viewer.canvas.style.cursor = cam.mode === 'orbit' ? 'grabbing' : cam.mode === 'pan' ? 'move' : 'ns-resize'
          }
          const dx = e.clientX - cam.lastX
          const dy = e.clientY - cam.lastY
          cam.lastX = e.clientX
          cam.lastY = e.clientY
          const sens = orbitSensitivity()
          if (cam.mode === 'orbit') {
            cam.heading = Cesium.Math.zeroToTwoPi(cam.heading + dx * sens)
            cam.pitch = Cesium.Math.clamp(cam.pitch - dy * sens, MIN_PITCH, MAX_PITCH)
            applyLook()
          } else if (cam.mode === 'pitch') {
            cam.pitch = Cesium.Math.clamp(cam.pitch - dy * sens, MIN_PITCH, MAX_PITCH)
            applyLook()
          } else if (cam.mode === 'pan') {
            applyPan(dx, dy)
          }
        }
        const endCamPointer = (e: PointerEvent) => {
          if (cam.pointerId !== e.pointerId) return
          // Waypoint or pending drag resolves on pointerup.
          if (pendingDragRef.current) {
            if (pendingDragRef.current.moved) commitPendingDrag(e.clientX, e.clientY)
            else pendingDragRef.current = null
          }
          if (wpDragRef.current) {
            if (wpDragRef.current.moved) commitWpDrag(e.clientX, e.clientY)
            else wpDragRef.current = null
          }
          finishCamDrag()
        }
        const cancelCamPointer = (e: PointerEvent) => {
          if (cam.pointerId !== e.pointerId) return
          // Pointer cancel: never commit a partial drag; restore preview.
          abortPendingDragRef.current()
          abortWpDragRef.current()
          finishCamDrag()
        }
        const onCamKey = (e: KeyboardEvent) => {
          // Cancel only an active camera gesture or snap; never steal keys
          // from waypoint editing or parent shortcuts.
          if (e.key === 'Escape' && (zdragRef.current || wpDragRef.current || pendingDragRef.current)) {
            abortPendingDragRef.current()
            abortWpDragRef.current()
            abortZdragRef.current()
            return
          }
          if (e.key === 'Escape' && (cam.pointerId !== null || snapRaf)) {
            cancelSnap()
            finishCamDrag()
            orbitEndCube()
          }
        }
        const onCamBlur = () => {
          cancelSnap()
          abortPendingDragRef.current()
          abortWpDragRef.current()
          finishCamDrag()
          orbitEndCube()
        }
        snapFnRef.current = (snap: MissionCubeSnap) => {
          if (viewer.isDestroyed() || !mounted) return
          cancelSnap()
          finishCamDrag()
          const pivot = resolvePivot(true)
          const range = Cesium.Cartesian3.distance(viewer.camera.positionWC, pivot)
          const startH = viewer.camera.heading
          const startP = viewer.camera.pitch
          const targetH = snap.heading !== undefined ? Cesium.Math.zeroToTwoPi(snap.heading) : startH
          const targetP = snap.pitch !== undefined ? Cesium.Math.clamp(snap.pitch, MIN_PITCH, MAX_PITCH) : startP
          let dH = 0
          if (snap.heading !== undefined) {
            dH = targetH - startH
            while (dH > Math.PI) dH -= 2 * Math.PI
            while (dH < -Math.PI) dH += 2 * Math.PI
          }
          const dP = targetP - startP
          gestureModeRef.current = 'snap'
          const commit = (h: number, p: number) => {
            if (viewer.isDestroyed() || !mounted) return
            viewer.camera.lookAt(pivot, new Cesium.HeadingPitchRange(h, p, range))
            viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
            viewer.scene.requestRender()
            pushOrientation()
          }
          if (reducedRef.current || (Math.abs(dH) < 1e-6 && Math.abs(dP) < 1e-6)) {
            commit(targetH, targetP)
            gestureModeRef.current = 'none'
            return
          }
          const t0 = performance.now()
          const dur = 350
          const step = (now: number) => {
            snapRaf = 0
            if (!mounted || viewer.isDestroyed()) {
              gestureModeRef.current = 'none'
              return
            }
            const t = Math.min((now - t0) / dur, 1)
            const ease = 1 - Math.pow(1 - t, 3)
            commit(Cesium.Math.zeroToTwoPi(startH + dH * ease), startP + dP * ease)
            if (t < 1) snapRaf = requestAnimationFrame(step)
            else gestureModeRef.current = 'none'
          }
          snapRaf = requestAnimationFrame(step)
        }
        orbitByRef.current = (dx: number, dy: number) => {
          if (viewer.isDestroyed() || !mounted) return
          if (cam.pointerId !== null) return
          cancelSnap()
          if (!cam.pivot) {
            cam.pivot = resolvePivot(false)
            cam.range = Cesium.Cartesian3.distance(viewer.camera.positionWC, cam.pivot)
            cam.heading = viewer.camera.heading
            cam.pitch = viewer.camera.pitch
          }
          gestureModeRef.current = 'orbit'
          const sens = orbitSensitivity()
          cam.heading = Cesium.Math.zeroToTwoPi(cam.heading + dx * sens)
          cam.pitch = Cesium.Math.clamp(cam.pitch - dy * sens, MIN_PITCH, MAX_PITCH)
          applyLook()
        }
        orbitEndRef.current = () => {
          orbitEndCube()
        }
        /* Top-down 2D snap: keep the current scene center (screen-center
           globe pick clamped near the mission, centroid fallback) and the
           current range; hold heading; pitch goes to the clamp floor
           (-89.5deg), the closest this controller gets to straight down.
           Instant: a snap, not a flight. Reduced-motion independent. */
        topDownRef.current = () => {
          if (viewer.isDestroyed() || !mounted) return
          cancelSnap()
          finishCamDrag()
          const pivot = resolvePivot(true)
          const range = Cesium.Cartesian3.distance(viewer.camera.positionWC, pivot)
          const heading = viewer.camera.heading
          const target = Cesium.Cartographic.fromCartesian(pivot, Cesium.Ellipsoid.WGS84)
          if (!target) return
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromRadians(
              target.longitude,
              target.latitude,
              target.height + range,
              Cesium.Ellipsoid.WGS84
            ),
            orientation: { heading, pitch: MIN_PITCH, roll: 0 }
          })
          viewer.scene.requestRender()
          pushOrientation()
        }
        /* Plain Z hold arms waypoint altitude-drag. Ctrl/Meta+Z stays undo;
           typing targets never arm (matching the parent shortcut guard). */
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
        viewer.canvas.addEventListener('pointerdown', startCamDrag)
        viewer.canvas.addEventListener('pointermove', moveCamDrag)
        viewer.canvas.addEventListener('pointerup', endCamPointer)
        viewer.canvas.addEventListener('pointercancel', cancelCamPointer)
        viewer.canvas.addEventListener('lostpointercapture', cancelCamPointer)
        /* Pointer exit must clear frustum emphasis: Cesium MOUSE_MOVE stops
           firing once the pointer leaves the canvas, otherwise the last
           hovered frustum would stay expanded and red. */
        const clearPhotoHover = () => {
          const prev = hoveredPhotoRef.current
          if (prev === null) return
          const liveViewer = viewerRef.current
          const liveCesium = cesiumRef.current
          if (liveViewer && liveCesium && !liveViewer.isDestroyed()) {
            setPhotoEmphasis(liveViewer, liveCesium, prev, false)
            liveViewer.canvas.style.cursor = ''
            liveViewer.scene.requestRender()
          }
          hoveredPhotoRef.current = null
        }
        const clearWaypointHover = () => hideWaypointGroundGuide()
        window.addEventListener('keydown', onCamKey)
        window.addEventListener('keydown', onZKeyDown)
        window.addEventListener('keyup', onZKeyUp)
        window.addEventListener('blur', onCamBlur)
        window.addEventListener('blur', onZBlur)
        const removeCamChanged = viewer.camera.changed.addEventListener(() => {
          pushOrientation()
        })
        camCleanup = () => {
          cancelSnap()
          finishCamDrag()
          orbitEndCube()
          viewer.canvas.removeEventListener('pointerdown', startCamDrag)
          viewer.canvas.removeEventListener('pointermove', moveCamDrag)
          viewer.canvas.removeEventListener('pointerup', endCamPointer)
          viewer.canvas.removeEventListener('pointercancel', cancelCamPointer)
          viewer.canvas.removeEventListener('lostpointercapture', cancelCamPointer)
          viewer.canvas.removeEventListener('mouseleave', clearPhotoHover)
          viewer.canvas.removeEventListener('mouseleave', clearWaypointHover)
          window.removeEventListener('keydown', onCamKey)
          window.removeEventListener('keydown', onZKeyDown)
          window.removeEventListener('keyup', onZKeyUp)
          window.removeEventListener('blur', onCamBlur)
          window.removeEventListener('blur', onZBlur)
          removeCamChanged()
          snapFnRef.current = () => {}
          orbitByRef.current = () => {}
          orbitEndRef.current = () => {}
          topDownRef.current = () => {}
        }

        const onContextLost = (e: Event) => {
          e.preventDefault()
          cancelSnap()
          finishCamDrag()
          orbitEndCube()
          if (!mounted || viewerRef.current !== viewer) return
          failed = true
          setStatus('error')
          readinessRef.current('error')
          setErrorMessage('WebGL context lost. Retry, or continue editing from the waypoint list.')
        }
        viewer.canvas.addEventListener('webglcontextlost', onContextLost)
        const onRenderError = (_scene: unknown, err: unknown) => {
          console.error('Mission Studio renderError:', err)
          cancelSnap()
          finishCamDrag()
          orbitEndCube()
          if (!mounted || viewerRef.current !== viewer) return
          failed = true
          setStatus('error')
          readinessRef.current('error')
          setErrorMessage('3D renderer error. Retry, or continue editing from the waypoint list.')
        }
        viewer.scene.renderError.addEventListener(onRenderError)

        screenHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
        viewer.canvas.addEventListener('pointerdown', onPointerDown)
        viewer.canvas.addEventListener('pointermove', onPointerMove)
        viewer.canvas.addEventListener('mouseleave', clearWaypointHover)
        screenHandler.setInputAction((movement: { endPosition: import('cesium').Cartesian2 }) => {
          if (viewer.isDestroyed()) return
          const drawTool = toolRef.current
          if ((drawTool === 'area' || drawTool === 'avoid') && !simActiveRef.current) {
            const cartesian = pickAtDrawingAltitude(canvasPosition(movement.endPosition), drawTool)
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
          if (dragState.avoidId && dragState.avoidPosition) {
            const metersPerPixel = Math.max(0.02, Math.min(8, (viewer.camera.positionCartographic?.height ?? 100) / Math.max(1, viewer.canvas.clientHeight)))
            const nextHeight = Math.max(0, dragState.avoidStartHeight + (dragState.avoidStartY - canvasPosition(movement.endPosition).y) * metersPerPixel)
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
            return
          }
          /* Z altitude-drag: vertical pointer motion maps to waypoint z only,
             live-clamped at ground. The commit happens on LEFT_UP. */
          const zdrag = zdragRef.current
          if (zdrag) {
            const metersPerPixel = Math.max(0.02, Math.min(8, (viewer.camera.positionCartographic?.height ?? 100) / Math.max(1, viewer.canvas.clientHeight)))
            const wp = missionRef.current.waypoints.find((w) => w.id === zdrag.id)
            if (wp) {
              const g = enuToLngLat(wp.x, wp.y, missionOrigin(missionRef.current))
              const desiredZ = zdrag.startZ + (zdrag.startY - canvasPosition(movement.endPosition).y) * metersPerPixel
              const groundPoint = Cesium.Cartesian3.fromDegrees(g.lng, g.lat, Math.max(0, desiredZ))
              const previewZ = Math.max(visibleGroundHeightAt(groundPoint), desiredZ, 0)
              const entity = viewer.entities.getById(`ms-wp-${zdrag.id}`)
              const pos = entity?.position as unknown as { setValue?: (v: import('cesium').Cartesian3) => void } | undefined
              if (pos && typeof pos.setValue === 'function') {
                pos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, previewZ))
                updateWaypointGroundGuide(zdrag.id)
              }
            }
            viewer.scene.requestRender()
            return
          }
          const picked = viewer.scene.drillPick(canvasPosition(movement.endPosition), 8) ?? []
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
            setPhotoEmphasis(viewer, Cesium, hoveredPhotoRef.current, false)
            setPhotoEmphasis(viewer, Cesium, hoveredPhoto, true)
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
              const ray = viewer.camera.getPickRay(canvasPosition(movement.endPosition))
              if (ray) {
                const pts = pendingPointsRef.current
                const o = ray.origin
                const u = Cesium.Cartesian3.normalize(ray.direction, new Cesium.Cartesian3())
                const defAlt = Math.max(drawAltRef.current, missionRef.current.takeoffAltM, 0.5)
                const segPoint = (p: { x: number; y: number; z?: number }): import('cesium').Cartesian3 => {
                  const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
                  return Cesium.Cartesian3.fromDegrees(g.lng, g.lat, typeof p.z === 'number' ? p.z : defAlt)
                }
                let best = 3
                for (let j = 1; j < pts.length; j += 1) {
                  const a = pts[j - 1]
                  const b = pts[j]
                  const A = segPoint(a)
                  const B = segPoint(b)
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
                  if (d < best) { best = d; hoverPendingInsert = j }
                }
              }
            }
            if (hoverInsert === null) {
              const ray = viewer.camera.getPickRay(canvasPosition(movement.endPosition))
              if (ray) {
                const wps = missionRef.current.waypoints
                // Closest approach between pick ray and each authored 3D
                // segment (Ericson 5.1.9, clamped to the segment).
                const o = ray.origin
                const u = Cesium.Cartesian3.normalize(ray.direction, new Cesium.Cartesian3())
                const segPoint = (w: { x: number; y: number; z: number }): import('cesium').Cartesian3 => {
                  const g = enuToLngLat(w.x, w.y, missionOrigin(missionRef.current))
                  return Cesium.Cartesian3.fromDegrees(g.lng, g.lat, w.z)
                }
                let best = 3
                for (let j = 1; j < wps.length; j += 1) {
                  const a = wps[j - 1]
                  const b = wps[j]
                  if (a.generatedByArea || a.generatedByAvoid || b.generatedByArea || b.generatedByAvoid) continue
                  const A = segPoint(a)
                  const B = segPoint(b)
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
                  if (d < best) { best = d; hoverInsert = j }
                }
              }
            }
          }
          updateWaypointGroundGuide(hoveredWaypointId)
          const prevHover = hoverRef.current
          if (prevHover.insert !== hoverInsert) {
            if (prevHover.insert !== null) {
              const e = viewer.entities.getById(`ms-route-insert-${prevHover.insert}`)
              if (e) e.show = false
            }
            if (hoverInsert !== null) {
              const e = viewer.entities.getById(`ms-route-insert-${hoverInsert}`)
              if (e) e.show = true
            }
          }
          if (prevHover.pendingInsert !== hoverPendingInsert) {
            if (prevHover.pendingInsert !== null && prevHover.pendingInsert !== undefined) {
              const e = viewer.entities.getById(`ms-pending-insert-${prevHover.pendingInsert}`)
              if (e) e.show = false
            }
            if (hoverPendingInsert !== null) {
              const e = viewer.entities.getById(`ms-pending-insert-${hoverPendingInsert}`)
              if (e) e.show = true
            }
          }
          hoverRef.current = { insert: hoverInsert, pendingInsert: hoverPendingInsert }
          viewer.canvas.style.cursor = hoveredId
            ? 'ns-resize'
            : hoveredAuthoredWp || hoveredPhoto !== null || hoverInsert !== null || hoveredPendingPoint || hoverPendingInsert !== null
            ? 'pointer'
            : ''
          viewer.scene.requestRender()
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        screenHandler.setInputAction((movement: { position: import('cesium').Cartesian2 }) => {
          if (viewer.isDestroyed()) return
          const screenPosition = canvasPosition(movement.position)
          const picked = viewer.scene.drillPick(screenPosition, 8) ?? []
          const handle = picked.map((item) => avoidHandleId(item?.id?.id)).find(Boolean)
          if (handle) {
            const zone = missionRef.current.avoids.find((item) => item.id === handle)
            const position = viewer.entities.getById(`ms-avoid-height-${handle}`)?.position?.getValue(viewer.clock.currentTime)
            if (!zone || !position) return
            dragState.avoidId = handle
            dragState.avoidStartY = screenPosition.y
            dragState.avoidStartHeight = zone.heightM ?? 15
            dragState.avoidPosition = position
            dragState.dragged = true
            dragState.cameraInputs = viewer.scene.screenSpaceCameraController.enableInputs
            viewer.scene.screenSpaceCameraController.enableInputs = false
            return
          }
          /* Z altitude-drag begin: plain Z held while pressing a waypoint
             (Design only, sim excluded).
             Camera inputs freeze for the press; the release click still flows
             to the pick handlers when the press never moves. */
          if (zHeldRef.current && !simActiveRef.current && !zdragRef.current) {
            const hit = picked.map((item) => {
              const raw = item?.id?.id
              return waypointId(raw) ?? photoWaypointId(raw) ?? (isWaypointGroundGuideEntity(raw) ? hoveredWaypointRef.current : null)
            }).find(Boolean)
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
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN)
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
            const pos = entity?.position?.getValue(viewer.clock.currentTime) as unknown as import('cesium').Cartesian3 | undefined
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
              const wpos = entity?.position as unknown as { setValue?: (v: import('cesium').Cartesian3) => void } | undefined
              if (wpos && typeof wpos.setValue === 'function') {
                wpos.setValue(Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wp.z))
              }
            }
          }
          viewer.scene.requestRender()
        }
        screenHandler.setInputAction(() => {
          if (!dragState.avoidId) {
            endZdrag()
            return
          }
          const id = dragState.avoidId
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
        }, Cesium.ScreenSpaceEventType.LEFT_UP)
        screenHandler.setInputAction(
          (movement: { position: import('cesium').Cartesian2 }) => {
            if (viewer.isDestroyed()) return
            if (dragState.dragged) {
              dragState.dragged = false
              return
            }
            if (toolRef.current === 'home') {
              const cartesian = pickVisibleSurface(canvasPosition(movement.position))
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
            const cartesian = pickAtDrawingAltitude(canvasPosition(movement.position), currentTool)
            if (!cartesian) return
            const carto = Cesium.Cartographic.fromCartesian(cartesian)
            const enu = lngLatToEnu(
              (carto.longitude * 180) / Math.PI,
              (carto.latitude * 180) / Math.PI,
              missionOrigin(missionRef.current)
            )
            if (Math.abs(enu.x) < 2000 && Math.abs(enu.y) < 2000) pickRef.current.onScenePoint(enu)
          },
          Cesium.ScreenSpaceEventType.LEFT_CLICK
        )

        ro = new ResizeObserver(() => {
          if (!viewer.isDestroyed()) {
            viewer.resize()
            viewer.scene.requestRender()
          }
        })
        if (hostRef.current) ro.observe(hostRef.current)

        let lastVehiclePosition: { x: number; y: number; z: number } | null = null
        const previewScanEntityIds = [
          ...Array.from({ length: 4 }, (_, index) => `ms-preview-scan-ray-${index}`),
          ...Array.from({ length: 4 }, (_, index) => `ms-preview-scan-face-${index}`),
          'ms-preview-scan-ground-outline',
          'ms-preview-scan-ground-fill'
        ]
        const tick = () => {
          raf = requestAnimationFrame(tick)
          if (viewer.isDestroyed()) return
          const p = planRef.current
          const entity = viewer.entities.getById('ms-vehicle')
          if (settleRef.current > 0) {
            settleRef.current -= 1
            viewer.scene.requestRender()
          }
          const activeCaptureId = previewCaptureRef.current
          if (activeCaptureId !== renderedPreviewCaptureRef.current) {
            previewScanEntityIds.forEach((id) => viewer.entities.removeById(id))
            if (activeCaptureId) {
              const currentMission = missionRef.current
              const waypoint = currentMission.waypoints.find((item) => item.id === activeCaptureId
                && item.actions.some((action) => action.kind === 'photo'))
              if (waypoint) {
                const routes = getMissionRoutes(currentMission)
                const routeId = waypoint.routeId ?? routes[0]?.id
                const photoWaypoints = waypoint.generatedByArea
                  ? currentMission.waypoints.filter((item) => item.generatedByArea === waypoint.generatedByArea).sort((a, b) => a.seq - b.seq)
                  : getMissionRouteWaypoints(currentMission, routeId ?? '')
                const index = photoWaypoints.findIndex((item) => item.id === waypoint.id)
                const next = index >= 0 ? photoWaypoints[index + 1] : undefined
                const prior = index > 0 ? photoWaypoints[index - 1] : undefined
                const dx = next ? next.x - waypoint.x : prior ? waypoint.x - prior.x : 0
                const dy = next ? next.y - waypoint.y : prior ? waypoint.y - prior.y : 1
                const length = Math.max(0.001, Math.hypot(dx, dy))
                const pitchDeg = waypoint.actions.find((action) => action.kind === 'photo')?.gimbalPitchDeg
                  ?? currentMission.areas.find((item) => item.id === waypoint.generatedByArea)?.reconnaissance?.gimbalPitchDeg
                  ?? routes.find((item) => item.id === routeId)?.reconnaissance?.gimbalPitchDeg
                  ?? -65
                const groundEnu = projectMockReconFootprintToGround(waypoint, { x: dx / length, y: dy / length }, pitchDeg)
                if (groundEnu) {
                  const ground = groundEnu.map((point) => {
                    const geo = enuToLngLat(point.x, point.y, missionOrigin(missionRef.current))
                    return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, MOCK_FOOTPRINT_RENDER_LIFT_M)
                  })
                  const originGeo = enuToLngLat(waypoint.x, waypoint.y, missionOrigin(missionRef.current))
                  const origin = Cesium.Cartesian3.fromDegrees(originGeo.lng, originGeo.lat, Math.max(0.5, waypoint.z))
                  const scanColor = Cesium.Color.fromCssColorString('#ea4335')
                  ground.forEach((corner, cornerIndex) => {
                    viewer.entities.add({
                      id: `ms-preview-scan-ray-${cornerIndex}`,
                      polyline: { positions: [origin, corner], width: 2.8, material: scanColor.withAlpha(0.98), arcType: Cesium.ArcType.NONE }
                    })
                    viewer.entities.add({
                      id: `ms-preview-scan-face-${cornerIndex}`,
                      polygon: {
                        hierarchy: new Cesium.PolygonHierarchy([origin, corner, ground[(cornerIndex + 1) % ground.length]]),
                        perPositionHeight: true,
                        material: scanColor.withAlpha(0.2)
                      }
                    })
                  })
                  viewer.entities.add({
                    id: 'ms-preview-scan-ground-outline',
                    polyline: { positions: [...ground, ground[0]], width: 3, material: scanColor, arcType: Cesium.ArcType.NONE }
                  })
                  viewer.entities.add({
                    id: 'ms-preview-scan-ground-fill',
                    polygon: {
                      hierarchy: new Cesium.PolygonHierarchy(ground),
                      perPositionHeight: true,
                      material: scanColor.withAlpha(0.28),
                      outline: true,
                      outlineColor: scanColor
                    }
                  })
                }
              }
            }
            renderedPreviewCaptureRef.current = activeCaptureId
            viewer.scene.requestRender()
          }
          if (!entity) return
          const previewPosition = previewPositionRef.current
          const vehicleVisible = simActiveRef.current || previewPosition !== null
          if (entity.show !== vehicleVisible) {
            entity.show = vehicleVisible
            viewer.scene.requestRender()
          }
          if (!vehicleVisible) return
          let position = previewPosition
          if (simActiveRef.current && p) {
            const t = reducedRef.current ? Math.floor(clockRef.current) : clockRef.current
            position = samplePlan(p, t).pos
          }
          if (!position) return
          const moved = !lastVehiclePosition
            || Math.hypot(
              position.x - lastVehiclePosition.x,
              position.y - lastVehiclePosition.y,
              position.z - lastVehiclePosition.z
            ) > 0.01
          if (!moved) return
          const g = enuToLngLat(position.x, position.y, missionOrigin(missionRef.current))
          const cartesian = Cesium.Cartesian3.fromDegrees(g.lng, g.lat, Math.max(position.z, 0.3))
          const prop = entity.position as unknown as {
            setValue?: (v: import('cesium').Cartesian3) => void
          }
          if (prop && typeof prop.setValue === 'function') prop.setValue(cartesian)
          else entity.position = new Cesium.ConstantPositionProperty(cartesian)
          lastVehiclePosition = position
          viewer.scene.requestRender()
        }
        raf = requestAnimationFrame(tick)

        window.__missionStudio = {
          ...(window.__missionStudio || {}),
          status: () => (viewerRef.current && !viewerRef.current.isDestroyed() ? 'ready' : 'none'),
          hasViewer: () => !!(viewerRef.current && !viewerRef.current.isDestroyed()),
          hasSceneEntity: (id: string) => {
            const v = viewerRef.current
            if (!v || v.isDestroyed() || typeof id !== 'string') return false
            return !!v.entities.getById(id)
          },
          raiseRenderError: () => {
            if (!viewer.isDestroyed()) {
              viewer.scene.renderError.raiseEvent(viewer.scene, new Error('Simulated renderError'))
              return true
            }
            return false
          },
          simulateContextLoss: () => {
            viewer.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
            return true
          },
          cameraOrientation: () => {
            const v = viewerRef.current
            if (!v || v.isDestroyed()) return null
            const rect = v.canvas.getBoundingClientRect()
            const center = new Cesium.Cartesian2(Math.max(rect.width / 2, 1), Math.max(rect.height / 2, 1))
            const ray = v.camera.getPickRay(center)
            const centerHit = ray ? v.scene.globe.pick(ray, v.scene) : undefined
            const centerGeo = centerHit ? Cesium.Cartographic.fromCartesian(centerHit, Cesium.Ellipsoid.WGS84) : undefined
            return {
              headingDeg: (v.camera.heading * 180) / Math.PI,
              pitchDeg: (v.camera.pitch * 180) / Math.PI,
              heightM: v.camera.positionCartographic?.height ?? null,
              posM: [v.camera.positionWC.x, v.camera.positionWC.y, v.camera.positionWC.z],
              centerM: centerHit ? [centerHit.x, centerHit.y, centerHit.z] : null,
              centerGeo: centerGeo ? [centerGeo.longitude, centerGeo.latitude, centerGeo.height] : null,
              centerRangeM: centerHit ? Cesium.Cartesian3.distance(v.camera.positionWC, centerHit) : null,
              canvasPx: [rect.width, rect.height]
            }
          },
          waypointScreens: () => {
            const v = viewerRef.current
            if (!v || v.isDestroyed()) return []
            const out: { id: string; x: number; y: number }[] = []
            for (const entity of v.entities.values) {
              if (!entity.id.startsWith('ms-wp-')) continue
              const pos = entity.position?.getValue(v.clock.currentTime)
              if (!pos) continue
              const c = v.scene.cartesianToCanvasCoordinates(pos)
              if (!c) continue
              const rect = v.canvas.getBoundingClientRect()
              out.push({ id: entity.id, x: c.x + rect.left, y: c.y + rect.top })
            }
            return out
          },
          snapView: (id: string) => {
            const snap = resolveMissionSnap(id)
            if (!snap) return false
            snapFnRef.current(snap)
            return true
          },
          cameraDragActive: () => gestureModeRef.current !== 'none',
          gestureMode: () => gestureModeRef.current,
          waypointDragActive: () => wpDragRef.current !== null,
          waypointDragMode: () => wpDragRef.current?.mode ?? null,
          pickAt: (clientX: number, clientY: number) => {
            const v = viewerRef.current
            if (!v || v.isDestroyed()) return []
            const pos = canvasPositionFromClient(clientX, clientY)
            let picked: unknown[] = []
            try {
              picked = v.scene.drillPick(pos, 6) ?? []
            } catch {
              picked = []
            }
            return picked
              .map((item) => (item as { id?: { id?: unknown } })?.id?.id)
              .filter((raw): raw is string => typeof raw === 'string')
          },
          controllerFlags: () => {
            const v = viewerRef.current
            if (!v || v.isDestroyed()) return null
            const c = v.scene.screenSpaceCameraController
            return {
              rotate: c.enableRotate,
              translate: c.enableTranslate,
              tilt: c.enableTilt,
              look: c.enableLook,
              zoom: c.enableZoom,
              inputs: c.enableInputs
            }
          }
        }

        fitRef.current(viewer, Cesium, missionRef.current)
        if (mounted && !failed) {
          viewer.resize()
          viewer.scene.requestRender()
          pushOrientation()
          if (!failed) {
            setStatus('ready')
            readinessRef.current('ready')
          }
        }
      } catch (err) {
        console.error('Mission Studio Cesium init failed', err)
        if (!mounted) return
        if (viewerRef.current) {
          try {
            viewerRef.current.destroy()
          } catch {
            /* ignore */
          }
          viewerRef.current = null
        }
        setStatus('error')
        readinessRef.current('error')
        const detail =
          err instanceof Error && err.message ? err.message : 'WebGL unavailable or 3D assets blocked'
        setErrorMessage(`Could not start the 3D scene (${detail}).`)
      }
    }
    void init()
    return () => {
      mounted = false
      if (raf) cancelAnimationFrame(raf)
      if (camCleanup) camCleanup()
      camCleanup = null
      if (screenHandler && !screenHandler.isDestroyed()) screenHandler.destroy()
      screenHandler = null
      if (ro) ro.disconnect()
      const viewer = viewerRef.current
      if (viewer && !viewer.isDestroyed()) viewer.destroy()
      viewerRef.current = null
      cesiumRef.current = null
    }
  }, [retryCount])

  /* ------------------------- entity sync ------------------------- */
  /* Draft overlay (drawing plane + pending draft points): recreated alone by
     both the full entity sync and a dedicated ruler effect, so ruler ticks
     never rebuild the whole scene. Draft heights preview the commit rule:
     route previews max(ruler, takeoff), area/avoid preview the ruler base. */
  const syncDraftOverlay = (
    viewer: Viewer,
    Cesium: CesiumNS,
    missionSnap: StudioMission,
    draftPoints: { x: number; y: number; z?: number }[],
    draftTool: SceneTool,
    shape: 'polygon' | 'cylinder',
    cursor: { x: number; y: number } | null,
    closeAtStart: boolean,
    areaSettings: Pick<MissionArea, 'lineSpacingM' | 'orientationDeg' | 'paddingM'>,
    avoidSettings: Pick<AvoidZone, 'type' | 'heightM' | 'clearanceM'>,
    rulerAlt: number,
    showPlane: boolean
  ) => {
    const cssColor = (varName: SceneToken, alpha: number): import('cesium').Color =>
      safeColor(Cesium, themeColor(varName), varName, alpha)
    for (const entity of [...viewer.entities.values]) {
      if (entity.id === 'ms-draw-plane' || entity.id === 'ms-pending-line' || entity.id.startsWith('ms-pending-')) {
        viewer.entities.remove(entity)
      }
    }
    if (showPlane) {
      const pts = [...missionSnap.waypoints.map((w) => ({ x: w.x, y: w.y }))]
      if (pts.length === 0) pts.push({ x: missionSnap.spawn.x, y: missionSnap.spawn.y })
      for (const a of missionSnap.areas) for (const p of a.points) pts.push(p)
      for (const a of missionSnap.avoids) for (const p of a.points) pts.push(p)
      let cx = 0
      let cy = 0
      for (const p of pts) {
        cx += p.x
        cy += p.y
      }
      if (pts.length > 0) {
        cx /= pts.length
        cy /= pts.length
      }
      const half = 60
      const corners = [
        enuToLngLat(cx - half, cy - half, missionOrigin(missionRef.current)),
        enuToLngLat(cx + half, cy - half, missionOrigin(missionRef.current)),
        enuToLngLat(cx + half, cy + half, missionOrigin(missionRef.current)),
        enuToLngLat(cx - half, cy + half, missionOrigin(missionRef.current))
      ]
      viewer.entities.add({
        id: 'ms-draw-plane',
        name: 'Drawing plane',
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(corners.flatMap((g) => [g.lng, g.lat])),
          height: Math.max(0, rulerAlt),
          material: cssColor('--primary', 0.1),
          outline: true,
          outlineColor: cssColor('--primary', 0.5),
          outlineWidth: 2
        }
      })
    }
    if (draftPoints.length > 0) {
      const defaultDraftAlt = draftTool === 'route'
        ? Math.max(rulerAlt, missionSnap.takeoffAltM, 0.5)
        : Math.max(rulerAlt, 0.2)
      // The transparent drawing plane can depth-occlude preview strokes when
      // they share its height. Lift only temporary Area/Avoid outlines; saved
      // geometry and waypoint elevations keep their authored altitude.
      const draftOutlineAlt = draftTool === 'route' ? defaultDraftAlt : defaultDraftAlt + 1
      draftPoints.forEach((p, index) => {
        const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
        const alt = typeof p.z === 'number' ? p.z : defaultDraftAlt
        viewer.entities.add({
          id: `ms-pending-${index}`,
          position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, alt),
          point: (draftTool !== 'route' && shape === 'polygon' && closeAtStart && index === 0) ? undefined : {
            pixelSize: 9,
            color: Cesium.Color.WHITE,
            outlineColor: cssColor('--primary', 1),
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          },
          label: {
            text: String(index + 1),
            font: '600 10px sans-serif',
            fillColor: Cesium.Color.WHITE,
            pixelOffset: new Cesium.Cartesian2(0, 15),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        })
      })
      if (draftPoints.length >= 2) {
        const flat: number[] = []
        for (const p of draftPoints) {
          const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
          const alt = typeof p.z === 'number' ? p.z : draftOutlineAlt
          flat.push(g.lng, g.lat, alt)
        }
        viewer.entities.add({
          id: 'ms-pending-line',
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
            width: 2,
            material: cssColor('--primary', 0.85),
            depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.85) }),
            arcType: Cesium.ArcType.NONE
          }
        })
        if (draftTool === 'route') {
          const plusCss = safeColor(Cesium, themeColor('--primary'), '--primary', 1).toCssColorString()
          for (let j = 1; j < draftPoints.length; j += 1) {
            const a = draftPoints[j - 1]
            const b = draftPoints[j]
            const aZ = typeof a.z === 'number' ? a.z : defaultDraftAlt
            const bZ = typeof b.z === 'number' ? b.z : defaultDraftAlt
            const mid = {
              x: (a.x + b.x) / 2,
              y: (a.y + b.y) / 2,
              z: (aZ + bZ) / 2
            }
            const g = enuToLngLat(mid.x, mid.y, missionOrigin(missionRef.current))
            viewer.entities.add({
              id: `ms-pending-insert-${j}`,
              show: false,
              position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
              billboard: {
                image: plusMarkerImage(plusCss),
                width: 22,
                height: 22,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
              }
            })
          }
        }
      }

      const checkCss = safeColor(Cesium, themeColor('--primary'), '--primary', 1).toCssColorString()
      const checkPoint = closeAtStart && shape === 'polygon'
        ? draftPoints[0]
        : shape === 'cylinder' && draftPoints.length === 1 && cursor && Math.hypot(cursor.x - draftPoints[0].x, cursor.y - draftPoints[0].y) >= 0.5
          ? cursor
          : null
      if (checkPoint) {
        const g = enuToLngLat(checkPoint.x, checkPoint.y, missionOrigin(missionRef.current))
        viewer.entities.add({
          id: 'ms-pending-check',
          position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, defaultDraftAlt),
          billboard: { image: checkMarkerImage(checkCss), width: 28, height: 28, disableDepthTestDistance: Number.POSITIVE_INFINITY }
        })
      }

      if (shape === 'polygon' && draftPoints.length >= 3 && cursor) {
        const last = draftPoints[draftPoints.length - 1]
        const a = enuToLngLat(last.x, last.y, missionOrigin(missionRef.current))
        const b = enuToLngLat(cursor.x, cursor.y, missionOrigin(missionRef.current))
        viewer.entities.add({
          id: 'ms-pending-preview-edge',
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([a.lng, a.lat, draftOutlineAlt, b.lng, b.lat, draftOutlineAlt]),
            width: 2,
            material: cssColor('--primary', 0.95),
            depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.95) }),
            arcType: Cesium.ArcType.NONE
          }
        })
      } else if (shape === 'cylinder' && draftPoints.length === 1 && cursor) {
        const center = draftPoints[0]
        const radius = Math.hypot(cursor.x - center.x, cursor.y - center.y)
        if (radius >= 0.5) {
          const ring = circleFootprint(center, radius)
          const flat = ring.flatMap((p) => {
            const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
            return [g.lng, g.lat, draftOutlineAlt]
          })
          const first = ring[0]
          const fg = enuToLngLat(first.x, first.y, missionOrigin(missionRef.current))
          flat.push(fg.lng, fg.lat, draftOutlineAlt)
          viewer.entities.add({
            id: 'ms-pending-circle-preview',
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
              width: 2,
              material: cssColor('--primary', 0.95),
              depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.95) }),
              arcType: Cesium.ArcType.NONE
            }
          })
        }
      }

      let ring: { x: number; y: number }[] = []
      if ((draftTool === 'area' || draftTool === 'avoid') && shape === 'polygon' && draftPoints.length >= 3 && isValidRing(draftPoints)) {
        ring = draftPoints.map(({ x, y }) => ({ x, y }))
      } else if ((draftTool === 'area' || draftTool === 'avoid') && shape === 'cylinder' && draftPoints.length === 1 && cursor) {
        const radius = Math.hypot(cursor.x - draftPoints[0].x, cursor.y - draftPoints[0].y)
        if (radius >= 0.5) ring = circleFootprint(draftPoints[0], radius)
      }
      if (ring.length >= 3) {
        const geo = ring.flatMap((p) => {
          const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
          return [g.lng, g.lat]
        })
        viewer.entities.add({
          id: 'ms-pending-zone-fill',
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(geo),
            height: draftOutlineAlt,
            extrudedHeight: draftTool === 'avoid' ? draftOutlineAlt + Math.max(1, avoidSettings.heightM ?? 15) : undefined,
            material: cssColor(draftTool === 'avoid' ? '--destructive' : '--primary', 0.1),
            outline: false
          }
        })
        if (draftTool === 'area') {
          const previewArea = { points: ring, ...areaSettings }
          const lanes = generateAreaScan(previewArea)
          const traversal = generateAreaTraversal(previewArea, lanes)
          if (traversal.length >= 2) {
            const flat = traversal.flatMap((point) => {
              const g = enuToLngLat(point.x, point.y, missionOrigin(missionRef.current))
              return [g.lng, g.lat, draftOutlineAlt + 0.1]
            })
            viewer.entities.add({
              id: 'ms-pending-area-traversal',
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
                width: 2,
                material: cssColor('--primary', 0.8),
                depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.8) }),
                arcType: Cesium.ArcType.NONE
              }
            })
          }
        }
      }
    }
  }

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium || viewer.isDestroyed() || status !== 'ready') return
    const cssColor = (varName: SceneToken, alpha: number): import('cesium').Color =>
      safeColor(Cesium, themeColor(varName), varName, alpha)

    viewer.entities.removeAll()
    worldTerrainTrianglesRef.current = []
    hoverRef.current = { insert: null, pendingInsert: null }
    // Search-result pin is a camera aid, not mission geometry: re-add it
    // after the wipe so mission edits never silently drop the visible result.
    syncSearchMarkerEntities(viewer, Cesium, searchMarkerRef.current)

    const home = mission.spawn
    const homeGeo = enuToLngLat(home.x, home.y, missionOrigin(missionRef.current))
    viewer.entities.add({
      id: 'ms-home-point',
      name: 'Drone Home point',
      position: Cesium.Cartesian3.fromDegrees(homeGeo.lng, homeGeo.lat, 0.8),
      point: {
        pixelSize: 18,
        color: cssColor('--primary', 1),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: 'HOME',
        font: '700 11px sans-serif',
        fillColor: Cesium.Color.WHITE,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#18181b').withAlpha(0.82),
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        pixelOffset: new Cesium.Cartesian2(0, -25),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })
    const homeGround = { x: home.x, y: home.y, z: 0.8 }
    const homeLaunch = { x: home.x, y: home.y, z: Math.max(0.8, mission.takeoffAltM) }
    const missionStart = getMissionStart(mission)
    const departurePoints = [homeGround, homeLaunch, missionStart].flatMap((point) => {
      const geo = enuToLngLat(point.x, point.y, missionOrigin(missionRef.current))
      return [geo.lng, geo.lat, point.z]
    })
    viewer.entities.add({
      id: 'ms-home-departure',
      name: 'Home to mission start',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(departurePoints),
        width: 2.5,
        material: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.72), dashLength: 12 }),
        arcType: Cesium.ArcType.NONE
      }
    })
    const lastMissionPoint = getMissionEnd(mission)
    if (mission.returnHomeOnEnd && lastMissionPoint) {
      const homeReturn = [
        { x: lastMissionPoint.x, y: lastMissionPoint.y, z: lastMissionPoint.z },
        { x: home.x, y: home.y, z: lastMissionPoint.z },
        homeGround
      ].flatMap((point) => {
        const geo = enuToLngLat(point.x, point.y, missionOrigin(missionRef.current))
        return [geo.lng, geo.lat, point.z]
      })
      viewer.entities.add({
        id: 'ms-home-return',
        name: 'Mission end to Home',
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(homeReturn),
          width: 2.5,
          material: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.72), dashLength: 12 }),
          arcType: Cesium.ArcType.NONE
        }
      })
    }

    // Ground grid (mock studio floor): two alternating-direction strips.
    // Alternating keeps every connector to a 10 m edge tick; a naive
    // pair-per-line strip draws long frame-crossing diagonals, and many
    // per-line entities starved primitive construction (see handback).
    const strip = (horiz: boolean): import('cesium').Cartesian3[] => {
      const pts: import('cesium').Cartesian3[] = []
      let flip = false
      const at = (g: number): [number, number, number, number] =>
        horiz
          ? [flip ? 120 : -120, g, flip ? -120 : 120, g]
          : [g, flip ? 120 : -120, g, flip ? -120 : 120]
      for (let g = -120; g <= 120; g += 10) {
        const [x1, y1, x2, y2] = at(g)
        const a = enuToLngLat(x1, y1, missionOrigin(missionRef.current))
        const b = enuToLngLat(x2, y2, missionOrigin(missionRef.current))
        pts.push(Cesium.Cartesian3.fromDegrees(a.lng, a.lat, 0.05))
        pts.push(Cesium.Cartesian3.fromDegrees(b.lng, b.lat, 0.05))
        flip = !flip
      }
      return pts
    }
    if (mission.worldType !== '2D' && mission.world === 'Blank space') {
      const gridMat = cssColor('--muted-foreground', 0.22)
      viewer.entities.add({
        id: 'ms-grid-x',
        polyline: { positions: strip(true), width: 1, material: gridMat, arcType: Cesium.ArcType.NONE }
      })
      viewer.entities.add({
        id: 'ms-grid-y',
        polyline: { positions: strip(false), width: 1, material: gridMat, arcType: Cesium.ArcType.NONE }
      })
    }

    // Non-blank legacy 3D Worlds use local hard-coded elevation fixtures.
    // Sample only the current globe terrain when available; ellipsoid-only
    // scenes fall back to zero. This keeps synthetic relief above the visible
    // ground without installing or requesting a terrain provider.
    if (mission.worldType !== '2D' && mission.world !== 'Blank space') {
      const terrain = WORLD_TERRAIN_FIXTURES[mission.world]
      const rows = terrain?.elevationsM
      const rowCount = rows?.length ?? 0
      const columnCount = rows?.[0]?.length ?? 0
      if (terrain && rowCount > 1 && columnCount > 1 && rows?.every((row) => row.length === columnCount)) {
        const maxElevation = Math.max(...rows.flat())
        const terrainTint = safeColor(Cesium, terrain.tint, '--muted-foreground', 1)
        const lowTint = Cesium.Color.fromCssColorString('#456e54')
        const highTint = Cesium.Color.fromCssColorString('#dfb66d')
        const centerX = missionRef.current.spawn.x - ((columnCount - 1) * terrain.sampleSpacingM) / 2
        const centerY = missionRef.current.spawn.y - ((rowCount - 1) * terrain.sampleSpacingM) / 2
        // Keep the relief inside the default overview camera frustum. Values
        // are relative to the local surface, not absolute altitude.
        const verticalScale = 2
        const vertexPositions = rows.map((samples, rowIndex) => samples.map((relativeHeight, columnIndex) => {
          const x = centerX + columnIndex * terrain.sampleSpacingM
          const y = centerY + (rowCount - 1 - rowIndex) * terrain.sampleSpacingM
          const geo = enuToLngLat(x, y, missionOrigin(missionRef.current))
          const sampledGround = viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(geo.lng, geo.lat)) ?? 0
          const height = Math.max(0, sampledGround) + 3 + relativeHeight * verticalScale
          return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, height)
        }))
        worldTerrainTrianglesRef.current = []
        for (let row = 0; row < rowCount - 1; row += 1) {
          for (let column = 0; column < columnCount - 1; column += 1) {
            const corners = [
              vertexPositions[row + 1][column],
              vertexPositions[row + 1][column + 1],
              vertexPositions[row][column + 1],
              vertexPositions[row][column]
            ]
            worldTerrainTrianglesRef.current.push(
              [corners[0], corners[1], corners[2]],
              [corners[0], corners[2], corners[3]]
            )
            const relativeHeights = [rows[row + 1][column], rows[row + 1][column + 1], rows[row][column + 1], rows[row][column]]
            const cellMean = relativeHeights.reduce((sum, value) => sum + value, 0) / relativeHeights.length
            const intensity = maxElevation > 0 ? cellMean / maxElevation : 0
            const material = Cesium.Color.lerp(lowTint, highTint, Math.max(0, Math.min(1, intensity)), new Cesium.Color())
            const cellTint = Cesium.Color.lerp(material, terrainTint, 0.12, new Cesium.Color()).withAlpha(0.48)
            viewer.entities.add({
              id: `ms-world-terrain-${row}-${column}`,
              name: `${terrain.label} elevation surface`,
              description: terrain.description,
              polygon: {
                hierarchy: new Cesium.PolygonHierarchy(corners),
                perPositionHeight: true,
                material: cellTint,
                outline: false
              }
            })
          }
        }
        // Elevation-following grid makes the synthetic slopes readable from
        // the normal oblique camera. Polylines also avoid translucent seams
        // between independently triangulated cell polygons.
        const contourColor = terrainTint.withAlpha(0.9)
        for (let row = 0; row < rowCount; row += 1) {
          viewer.entities.add({
            id: `ms-world-terrain-row-${row}`,
            name: `${terrain.label} elevation contour`,
            polyline: { positions: vertexPositions[row], width: 2, material: contourColor, arcType: Cesium.ArcType.NONE }
          })
        }
        for (let column = 0; column < columnCount; column += 1) {
          viewer.entities.add({
            id: `ms-world-terrain-column-${column}`,
            name: `${terrain.label} elevation contour`,
            polyline: { positions: vertexPositions.map((row) => row[column]), width: 2, material: contourColor, arcType: Cesium.ArcType.NONE }
          })
        }
      }
    }

    // Sample Facade context block removed (F007): grid, route, Areas,
    // Avoid zones and markers below are the only scene objects.

    const zoneEntity = (kind: 'area' | 'avoid', id: string, label: string, ring: { x: number; y: number }[], extrudeM?: number, baseM?: number) => {
      if (ring.length < 3) return
      const deg = ring.flatMap((p) => {
        const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
        return [g.lng, g.lat]
      })
      const isAvoid = kind === 'avoid'
      const selected = selection?.kind === kind && selection.id === id
      const height = Math.max(0, extrudeM ?? 0)
      // Footprints render at their saved base altitude (legacy 0 keeps the
      // previous 0.15 m mock-floor look). Avoid prisms extrude upward from
      // the base; height 0 still renders a flat footprint.
      const base = Math.max(0, baseM ?? 0)
      viewer.entities.add({
        id: `ms-${kind}-${id}`,
        name: label,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(deg),
          height: base > 0 ? base : 0.15,
          // Height 0 means zero height: render a flat footprint, never a
          // positive-volume prism. Saved height stays clamped >= 0.
          extrudedHeight: isAvoid && height > 0 ? base + height : undefined,
          material: isAvoid ? cssColor('--destructive', selected ? 0.4 : 0.22) : cssColor('--primary', selected ? 0.32 : 0.16),
          outline: false
        }
      })
      const ringHeights = (heightM: number) => {
        const flat = ring.flatMap((p) => {
          const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
          return [g.lng, g.lat, heightM]
        })
        const first = ring[0]
        const firstGeo = enuToLngLat(first.x, first.y, missionOrigin(missionRef.current))
        flat.push(firstGeo.lng, firstGeo.lat, heightM)
        return Cesium.Cartesian3.fromDegreesArrayHeights(flat)
      }
      const outlineColor = isAvoid ? cssColor('--destructive', 1) : cssColor('--primary', 1)
      viewer.entities.add({
        id: `ms-${kind}-outline-${id}`,
        polyline: {
          positions: ringHeights(base > 0 ? base : 0.15),
          width: selected ? 3 : 1.5,
          material: outlineColor,
          depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: outlineColor }),
          arcType: Cesium.ArcType.NONE
        }
      })
      if (isAvoid && height > 0) {
        viewer.entities.add({
          id: `ms-${kind}-top-outline-${id}`,
          polyline: {
            positions: ringHeights(base + height),
            width: selected ? 3 : 1.5,
            material: outlineColor,
            depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: outlineColor }),
            arcType: Cesium.ArcType.NONE
          }
        })
      }
    }
    for (const area of mission.areas) {
      // In 2D photogrammetry, keep the Area plane with its scan route. Rendering
      // the boundary at the drawing/launch altitude while scan lanes and photo
      // points sit at Recon altitude makes them appear detached in oblique view.
      const areaRenderAltitude = mission.worldType === '2D'
        ? getAreaFlightAltitudeM(area, mission.takeoffAltM, '2D')
        : area.baseAltM ?? 0
      if (mission.worldType !== '2D' || showAreaSurface) {
        zoneEntity('area', area.id, area.label, area.points, undefined, areaRenderAltitude)
      }
    }
    for (const avoid of mission.avoids) zoneEntity('avoid', avoid.id, avoid.label, avoid.points, avoid.heightM ?? 15, avoid.baseAltM ?? 0)

    // Area scan lanes: straight serpentine segments clipped inside the polygon.
    // Photogrammetry lanes share reconnaissance altitude with generated points.
    for (const area of mission.areas) {
      const stored = area.scanLines
      const lanes = stored && stored.length > 0 ? stored : generateAreaScan(area)
      const areaWaypoints = mission.waypoints
        .filter((waypoint) => waypoint.generatedByArea === area.id)
        .sort((a, b) => a.seq - b.seq)
      const laneAlt = areaWaypoints[0]?.z ?? getAreaFlightAltitudeM(area, mission.takeoffAltM, mission.worldType ?? '3D')
      const traversal = generateAreaTraversal(area, lanes)
      if (traversal.length >= 2) {
        const flat: number[] = []
        for (let pointIndex = 0; pointIndex < traversal.length; pointIndex += 1) {
          const p = traversal[pointIndex]
          const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
          flat.push(g.lng, g.lat, areaWaypoints[pointIndex]?.z ?? laneAlt)
        }
        viewer.entities.add({
          id: `ms-area-scan-${area.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
            width: 2,
            material: cssColor('--primary', 0.7),
            depthFailMaterial: new Cesium.PolylineDashMaterialProperty({ color: cssColor('--primary', 0.7) }),
            arcType: Cesium.ArcType.NONE
          }
        })
        // Area flight-path leg labels: one-decimal distances between
        // consecutive traversal points (restores the generated-leg labels
        // lost when route labels narrowed to authored-only). Traversal
        // vertices only — never the polygon boundary ring.
        for (let i = 1; i < traversal.length; i += 1) {
          const a = traversal[i - 1]
          const b = traversal[i]
          const lengthM = Math.hypot(b.x - a.x, b.y - a.y)
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
          const g = enuToLngLat(mid.x, mid.y, missionOrigin(missionRef.current))
          const labelAlt = ((areaWaypoints[i - 1]?.z ?? laneAlt) + (areaWaypoints[i]?.z ?? laneAlt)) / 2
          viewer.entities.add({
            id: `ms-area-len-${area.id}-${i}`,
            position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, labelAlt),
            label: {
              text: `${lengthM.toFixed(1)} m`,
              font: '11px sans-serif',
              fillColor: Cesium.Color.WHITE,
              pixelOffset: new Cesium.Cartesian2(0, -14),
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          })
        }
      }
    }

    // Avoid vertical Z affordance: ground-center line + top drag handle.
    // The handle floats at a visual minimum so a zero-height volume stays
    // grabbable; the label always shows the saved height (>= 0). Line and
    // handle rise with the saved base altitude; drag edits height only.
    for (const avoid of mission.avoids) {
      if (avoid.points.length < 3) continue
      const center = avoid.points.reduce((acc, p) => ({ x: acc.x + p.x / avoid.points.length, y: acc.y + p.y / avoid.points.length }), { x: 0, y: 0 })
      const g = enuToLngLat(center.x, center.y, missionOrigin(missionRef.current))
      const base = Math.max(0, avoid.baseAltM ?? 0)
      const height = Math.max(0, avoid.heightM ?? 15)
      const visualTop = Math.max(height, 2)
      const selected = selection?.kind === 'avoid' && selection.id === avoid.id
      viewer.entities.add({
        id: `ms-avoid-z-${avoid.id}`,
        show: selected,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([g.lng, g.lat, base + 0.2, g.lng, g.lat, base + Math.max(visualTop, 0.2)]),
          width: 2,
          material: cssColor('--destructive', 0.9),
          arcType: Cesium.ArcType.NONE
        }
      })
      viewer.entities.add({
        id: `ms-avoid-height-${avoid.id}`,
        show: selected,
        position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, base + Math.max(visualTop, 0.4)),
        point: {
          pixelSize: 14,
          color: cssColor('--destructive', 1),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: `${height.toFixed(1)} m`,
          font: '600 11px sans-serif',
          fillColor: Cesium.Color.WHITE,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      })
    }

    // Route polylines: render each Route independently.
    const routes = getMissionRoutes(mission)
    renderedPreviewCaptureRef.current = null
    ;[
      ...Array.from({ length: 4 }, (_, index) => `ms-preview-scan-ray-${index}`),
      ...Array.from({ length: 4 }, (_, index) => `ms-preview-scan-face-${index}`),
      'ms-preview-scan-ground-outline',
      'ms-preview-scan-ground-fill'
    ].forEach((id) => viewer.entities.removeById(id))
    // T-021 AC11: every Route line begins at its first waypoint (Route 1
    // begins at waypoint 1). No synthetic spawn leg.
    routes.forEach((r) => {
      const rWaypoints = getMissionRouteWaypoints(mission, r.id)
      const pts = [...rWaypoints]
      if (pts.length >= 2) {
        const flat: number[] = []
        for (const p of pts) {
          const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
          flat.push(g.lng, g.lat, p.z)
        }
        viewer.entities.add({
          id: `ms-route-${r.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
            width: 3,
            material: cssColor('--primary', 0.95),
            arcType: Cesium.ArcType.NONE
          }
        })
      }
    })

    // Derived planner transfers: non-editable preview between consecutive
    // routes and consecutive areas. Recomputed from current geometry.
    const transfers = computeDerivedTransfers(mission)
    for (const transfer of transfers) {
      if (transfer.points.length >= 2) {
        const flat: number[] = []
        for (const p of transfer.points) {
          const g = enuToLngLat(p.x, p.y, missionOrigin(missionRef.current))
          flat.push(g.lng, g.lat, p.z)
        }
        viewer.entities.add({
          id: `ms-transfer-${transfer.id}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
            width: 2.5,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString('#a78bfa'),
              dashLength: 16
            }),
            arcType: Cesium.ArcType.NONE
          }
        })

        const midIdx = Math.floor(transfer.points.length / 2)
        const midA = transfer.points[Math.max(0, midIdx - 1)]
        const midB = transfer.points[midIdx]
        const mid = { x: (midA.x + midB.x) / 2, y: (midA.y + midB.y) / 2, z: (midA.z + midB.z) / 2 }
        const g = enuToLngLat(mid.x, mid.y, missionOrigin(missionRef.current))
        viewer.entities.add({
          id: `ms-transfer-len-${transfer.id}`,
          position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
          label: {
            text: `${transfer.distanceM.toFixed(1)} m · Transfer`,
            font: 'italic 11px sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#c4b5fd'),
            pixelOffset: new Cesium.Cartesian2(0, -14),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        })
      }
    }

    // Home remains a distinct ground marker. Mission geometry starts at its
    // first authored waypoint or Area scan point.

    // Numbered waypoints. Generated avoid-detour points use a distinct
    // destructive outline so they read as derived, not authored.
    for (const wp of mission.waypoints) {
      const g = enuToLngLat(wp.x, wp.y, missionOrigin(missionRef.current))
      const selected = selection?.kind === 'waypoint' && selection.id === wp.id
      const isDetour = !!wp.generatedByAvoid
      const isHiddenPhotoWaypoint = focusedPhotoWaypointId !== null
        && wp.id !== focusedPhotoWaypointId
        && wp.actions.some((action) => action.kind === 'photo')
      viewer.entities.add({
        id: `ms-wp-${wp.id}`,
        name: isDetour ? `Generated detour ${wp.seq} (mock)` : `Waypoint ${wp.seq}`,
        show: !isHiddenPhotoWaypoint,
        position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wp.z),
        point: {
          pixelSize: selected ? 16 : 11,
          color: selected ? Cesium.Color.WHITE : isDetour ? cssColor('--destructive', 1) : cssColor('--primary', 1),
          outlineColor: selected ? (isDetour ? cssColor('--destructive', 1) : cssColor('--primary', 1)) : Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: String(wp.seq),
          font: '600 11px sans-serif',
          fillColor: selected ? (isDetour ? cssColor('--destructive', 1) : cssColor('--primary', 1)) : Cesium.Color.WHITE,
          pixelOffset: new Cesium.Cartesian2(0, 18),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      })
    // (T-016) no hover remove badge: deletion is click-again on the
    // selected waypoint. First click selects; the point itself stays the
    // only pick target.
    }

    // Straight-segment helpers: 1-decimal length labels on every leg within a route,
    // plus a midpoint insertion marker only between adjacent authored waypoints of the same route.
    routes.forEach((r) => {
      const rWaypoints = getMissionRouteWaypoints(mission, r.id)
      const routeForLabels = [...rWaypoints]
      for (let i = 1; i < routeForLabels.length; i += 1) {
        const a = routeForLabels[i - 1]
        const b = routeForLabels[i]
        const lengthM = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
        const g = enuToLngLat(mid.x, mid.y, missionOrigin(missionRef.current))
        viewer.entities.add({
          id: `ms-route-len-${r.id}-${i}`,
          position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
          label: {
            text: `${lengthM.toFixed(1)} m`,
            font: '11px sans-serif',
            fillColor: Cesium.Color.WHITE,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        })
      }
    })

    for (let j = 1; j < mission.waypoints.length; j += 1) {
      const a = mission.waypoints[j - 1]
      const b = mission.waypoints[j]
      if (a.generatedByArea || a.generatedByAvoid || b.generatedByArea || b.generatedByAvoid) continue
      if (a.routeId && b.routeId && a.routeId !== b.routeId) continue
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
      const g = enuToLngLat(mid.x, mid.y, missionOrigin(missionRef.current))
      // 22 px billboard (constant screen size): white disc with the `+`
      // glyph baked in — an ≥16 px hit target with the affordance inside.
      const plusCss = safeColor(Cesium, themeColor('--primary'), '--primary', 1).toCssColorString()
      viewer.entities.add({
        id: `ms-route-insert-${j}`,
        show: false,
        position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
        billboard: {
          image: plusMarkerImage(plusCss),
          width: 22,
          height: 22,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      })
    }

    // Vehicle at the derived mission start (waypoint 1 / first scan point;
    // legacy spawn only when no sequence geometry exists).
    const startXy = getMissionStart(mission)
    const vg = enuToLngLat(startXy.x, startXy.y, missionOrigin(missionRef.current))
    viewer.entities.add({
      id: 'ms-vehicle',
      show: simActive,
      position: Cesium.Cartesian3.fromDegrees(vg.lng, vg.lat, Math.max(startXy.z, 0.5)),
      billboard: {
        image: droneMarkerImage(safeColor(Cesium, themeColor('--warning'), '--warning', 1).toCssColorString()),
        width: 38,
        height: 38,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: 'Drone',
        font: '700 12px sans-serif',
        fillColor: Cesium.Color.WHITE,
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.72),
        backgroundPadding: new Cesium.Cartesian2(6, 4),
        pixelOffset: new Cesium.Cartesian2(0, -28),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })

    viewer.scene.requestRender()
    settleRef.current = 90
    if (hostRef.current) {
      hostRef.current.dataset.entities = String(viewer.entities.values.length)
    }
  }, [mission, selection, simActive, status, pendingPoints, tool, pendingShape, draftCursor, closeDraftAtStart, showAreaSurface])

  /* Draft cursor/ruler updates refresh only the overlay without rebuilding
     committed entities. */
  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium || viewer.isDestroyed() || status !== 'ready') return
    syncDraftOverlay(viewer, Cesium, mission, pendingPoints, tool, pendingShape, draftCursor, closeDraftAtStart, draftAreaSettings, draftAvoidSettings, drawingAltM, planeVisible)
    viewer.scene.requestRender()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission, pendingPoints, tool, drawingAltM, planeVisible, pendingShape, draftCursor, closeDraftAtStart, draftAreaSettings, draftAvoidSettings, status])

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current
    if (!viewer || !Cesium || viewer.isDestroyed()) return
    frustumGeomRef.current = new Map()
    hoveredPhotoRef.current = null
    for (const waypoint of mission.waypoints) {
      viewer.entities.removeById(`ms-photo-base-${waypoint.id}`)
      viewer.entities.removeById(`ms-photo-rays-${waypoint.id}`)
      for (let face = 0; face < 4; face += 1) viewer.entities.removeById(`ms-photo-face-${waypoint.id}-${face}`)
      for (let corner = 0; corner < 4; corner += 1) viewer.entities.removeById(`ms-photo-focus-ray-${waypoint.id}-${corner}`)
      for (let face = 0; face < 4; face += 1) viewer.entities.removeById(`ms-photo-focus-face-${waypoint.id}-${face}`)
      viewer.entities.removeById(`ms-photo-focus-ground-${waypoint.id}`)
      viewer.entities.removeById(`ms-camera-footprint-${waypoint.id}`)
    }
    const routes = getMissionRoutes(mission)
    for (const waypoint of mission.waypoints) {
      const photos = waypoint.actions.filter((action) => action.kind === 'photo')
      if (photos.length === 0) continue
      const geo = enuToLngLat(waypoint.x, waypoint.y, missionOrigin(missionRef.current))
      const routeId = waypoint.routeId ?? routes[0]?.id
      const photoWaypoints = waypoint.generatedByArea
        ? mission.waypoints.filter((item) => item.generatedByArea === waypoint.generatedByArea).sort((a, b) => a.seq - b.seq)
        : getMissionRouteWaypoints(mission, routeId ?? '')
      const index = photoWaypoints.findIndex((item) => item.id === waypoint.id)
      const next = photoWaypoints[index + 1]
      const prior = photoWaypoints[index - 1]
      const dx = next ? next.x - waypoint.x : prior ? waypoint.x - prior.x : 0
      const dy = next ? next.y - waypoint.y : prior ? waypoint.y - prior.y : 1
      const length = Math.max(0.001, Math.hypot(dx, dy))
      const forwardX = dx / length
      const forwardY = dy / length
      const pitchDeg = photos[0].gimbalPitchDeg ?? mission.areas.find((item) => item.id === waypoint.generatedByArea)?.reconnaissance?.gimbalPitchDeg ?? routes.find((item) => item.id === routeId)?.reconnaissance?.gimbalPitchDeg ?? -65
      const selectedPhoto = focusedPhotoWaypointId === waypoint.id
      const showThisPhotoMarker = showPhotoMarkers
        && (focusedPhotoWaypointId === null || selectedPhoto)
      if (showThisPhotoMarker && !selectedPhoto) {
        /* Planner-style wireframe camera (map-3d-layers photo frustums):
           base rectangle + four rays from the capture pose, plus four
           translucent side faces so the sensor reads as a volume. Compact
           depth follows Planner's altitude-scaled formula (expanded is the
           hover size); direction follows the route with the resolved gimbal
           pitch. Cyan matches Planner's photoCamera overlay (owner
           direction; Cesium takes Cesium.Color, not CSS tokens). */
        const buildFrustum = (depth: number) => {
          const pitch = pitchDeg * Math.PI / 180
          const reachH = depth * Math.cos(pitch)
          const dropV = depth * Math.sin(pitch)
          const halfSpan = depth * 0.45
          const halfVert = depth * 0.34
          const sideX = -forwardY * halfSpan
          const sideY = forwardX * halfSpan
          const cornerZ = Math.max(0.5, waypoint.z + dropV)
          const origin = Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, waypoint.z)
          const corners = [
            { g: enuToLngLat(waypoint.x + forwardX * reachH + sideX, waypoint.y + forwardY * reachH + sideY, missionOrigin(missionRef.current)), z: cornerZ + halfVert },
            { g: enuToLngLat(waypoint.x + forwardX * reachH - sideX, waypoint.y + forwardY * reachH - sideY, missionOrigin(missionRef.current)), z: cornerZ + halfVert },
            { g: enuToLngLat(waypoint.x + forwardX * reachH - sideX, waypoint.y + forwardY * reachH - sideY, missionOrigin(missionRef.current)), z: Math.max(0.5, cornerZ - halfVert) },
            { g: enuToLngLat(waypoint.x + forwardX * reachH + sideX, waypoint.y + forwardY * reachH + sideY, missionOrigin(missionRef.current)), z: Math.max(0.5, cornerZ - halfVert) }
          ]
          const base = corners.map((corner) => Cesium.Cartesian3.fromDegrees(corner.g.lng, corner.g.lat, corner.z))
          const rays = base.flatMap((corner) => [origin, corner])
          return { origin, base, rays }
        }
        const compactDepth = Math.max(1.2, Math.min(4.5, Math.abs(waypoint.z) * 0.035))
        const expandedDepth = Math.max(6, Math.min(24, Math.abs(waypoint.z) * 0.16))
        const compact = buildFrustum(compactDepth)
        const expanded = buildFrustum(expandedDepth)
        frustumGeomRef.current.set(waypoint.id, {
          compactBase: compact.base,
          expandedBase: expanded.base,
          compactRays: compact.rays,
          expandedRays: expanded.rays
        })
        const frustumColor = Cesium.Color.fromCssColorString('#68d7e2').withAlpha(0.92)
        viewer.entities.add({
          id: `ms-photo-base-${waypoint.id}`,
          polyline: {
            positions: [...compact.base, compact.base[0]],
            width: 1.8,
            material: frustumColor,
            arcType: Cesium.ArcType.NONE
          }
        })
        viewer.entities.add({
          id: `ms-photo-rays-${waypoint.id}`,
          polyline: {
            positions: compact.rays,
            width: 1.8,
            material: frustumColor,
            arcType: Cesium.ArcType.NONE
          }
        })
        for (let face = 0; face < 4; face += 1) {
          viewer.entities.add({
            id: `ms-photo-face-${waypoint.id}-${face}`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy([compact.origin, compact.base[face], compact.base[(face + 1) % 4]]),
              perPositionHeight: true,
              material: Cesium.Color.fromCssColorString('#68d7e2').withAlpha(0.16)
            }
          })
        }
      }
      const footprintEnu = projectMockReconFootprintToGround(waypoint, { x: forwardX, y: forwardY }, pitchDeg)
      const footprintGround = footprintEnu?.map((point) => {
        const geo = enuToLngLat(point.x, point.y, missionOrigin(missionRef.current))
        // Raise the z=0 mock-ground projection for clear rendering.
        return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, MOCK_FOOTPRINT_RENDER_LIFT_M)
      }) ?? null
      if (showThisPhotoMarker && selectedPhoto && footprintGround) {
        const origin = Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, waypoint.z)
        const red = Cesium.Color.fromCssColorString('#ea4335').withAlpha(0.96)
        footprintGround.forEach((corner, index) => {
          viewer.entities.add({
            id: `ms-photo-focus-ray-${waypoint.id}-${index}`,
            polyline: {
              positions: [origin, corner],
              width: 2.4,
              material: red,
              arcType: Cesium.ArcType.NONE
            }
          })
          viewer.entities.add({
            id: `ms-photo-focus-face-${waypoint.id}-${index}`,
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy([origin, corner, footprintGround[(index + 1) % footprintGround.length]]),
              perPositionHeight: true,
              material: red.withAlpha(0.1)
            }
          })
        })
        viewer.entities.add({
          id: `ms-photo-focus-ground-${waypoint.id}`,
          polyline: {
            positions: [...footprintGround, footprintGround[0]],
            width: 2.4,
            material: red,
            arcType: Cesium.ArcType.NONE
          }
        })
      }
      if (!showCameraFootprint || !footprintGround) continue
      viewer.entities.add({
        id: `ms-camera-footprint-${waypoint.id}`,
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(footprintGround),
          perPositionHeight: true,
          material: Cesium.Color.fromCssColorString('#25d885').withAlpha(Math.max(0, Math.min(100, footprintOpacity)) / 100),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#16a96c')
        }
      })
    }
    settleRef.current = 90
    viewer.scene.requestRender()
  }, [mission, selection, showPhotoMarkers, showCameraFootprint, footprintOpacity, status])

  return (
    <div className='ms-scene' data-testid='ms-scene'>
      <div ref={hostRef} className='ms-scene-host' aria-hidden={status !== 'ready'} />
      {status === 'ready' && !without3d ? (
        <MissionCompassCube
          heading={orientation.heading}
          pitch={orientation.pitch}
          interactive
          onSnap={handleCubeSnap}
          onOrbitBy={handleCubeOrbitBy}
          onOrbitEnd={handleCubeOrbitEnd}
        />
      ) : null}
      {status === 'loading' && !without3d ? (
        <div className='ms-scene-overlay' role='status' aria-label='3D scene loading'>
          <p className='ms-scene-overlay-title'>Loading 3D scene…</p>
          <p className='ms-scene-overlay-sub'>Starting route-local renderer (mock site, no network map).</p>
        </div>
      ) : null}
      {status === 'error' && !without3d ? (
        <div className='ms-scene-overlay' role='alert' data-testid='ms-scene-error'>
          <p className='ms-scene-overlay-title'>3D scene unavailable</p>
          <p className='ms-scene-overlay-sub'>{errorMessage ?? 'Renderer failed to start.'}</p>
          <div className='ms-scene-overlay-actions'>
            <Button size='sm' variant='default' onClick={() => {
              setStatus('loading')
              onReadinessChange('loading')
              setRetryCount((c) => c + 1)
            }} data-testid='ms-scene-retry'>
              Retry 3D
            </Button>
            <Button size='sm' variant='outline' onClick={() => {
              setWithout3d(true)
              onReadinessChange('without-3d')
            }}>
              Continue without 3D
            </Button>
          </div>
        </div>
      ) : null}
      {without3d && status !== 'ready' ? (
        <div className='ms-scene-fallback' role='status'>
          <span>3D off — edit from the waypoint list. </span>
          <Button
            size='sm'
            variant='link'
            onClick={() => {
              setWithout3d(false)
              setStatus('loading')
              onReadinessChange('loading')
              setRetryCount((c) => c + 1)
            }}
          >
            Retry 3D
          </Button>
        </div>
      ) : null}
    </div>
  )
})

export default MissionScene
