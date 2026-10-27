import type { Viewer } from 'cesium'
import type { StudioMission } from '../../domain/mission-model'
import { getMissionRouteWaypoints, getMissionRoutes, missionOrigin, projectMockReconFootprintToGround } from '../../domain/mission-model'
import { samplePlan, type SimPlan } from '../simulation/simulation'
import { resolveMissionSnap, type MissionCubeSnap } from './mission-compass-model'
import { MOCK_FOOTPRINT_RENDER_LIFT_M, enuToLngLat, safeColor, themeColor } from './mission-scene-helpers'
import { removeSceneEntitiesInLayer } from './scene-entity-ownership'
import { createEditGestures, type EditGestureHooks } from './scene-edit-gestures'
import { fitMission, installCameraGestures } from './scene-camera-gestures'
import type { SceneReadiness } from './mission-scene-types'

type CesiumNS = typeof import('cesium')
type MutableRef<T> = { current: T }
type SceneEditState = Parameters<typeof createEditGestures>[0]['state']
type SceneEditControls = Pick<EditGestureHooks, 'hasActiveEditDrag' | 'escAbortEdits'>

interface SceneRuntimeArgs {
  hostRef: MutableRef<HTMLDivElement | null>
  viewerRef: MutableRef<Viewer | null>
  cesiumRef: MutableRef<CesiumNS | null>
  missionRef: MutableRef<StudioMission>
  simActiveRef: MutableRef<boolean>
  planRef: MutableRef<SimPlan | null>
  reducedRef: MutableRef<boolean>
  gestureModeRef: MutableRef<string>
  snapFnRef: MutableRef<(snap: MissionCubeSnap) => void>
  orbitByRef: MutableRef<(dx: number, dy: number) => void>
  orbitEndRef: MutableRef<() => void>
  topDownRef: MutableRef<() => void>
  renderedPreviewCaptureRef: MutableRef<string | null>
  renderedPreviewMissionRef: MutableRef<StudioMission | null>
  settleRef: MutableRef<number>
  previewCaptureRef: { current: string | null }
  previewPositionRef: { current: { x: number; y: number; z: number } | null }
  clockRef: { current: number }
  editState: SceneEditState
  editControlsRef: MutableRef<SceneEditControls | null>
  readinessRef: MutableRef<(readiness: SceneReadiness) => void>
  setStatus: (status: 'loading' | 'ready' | 'error') => void
  setErrorMessage: (message: string | null) => void
  setOrientation: (orientation: { heading: number; pitch: number }) => void
  fitRef: MutableRef<typeof fitMission>
  revalidateWaypointGroundGuideRef: MutableRef<(mission: StudioMission) => void>
  createViewer: (Cesium: CesiumNS, host: HTMLDivElement) => Viewer
  destroyViewer: (viewer: Viewer) => void
}

/** Starts listeners, camera/edit installers, and the render loop for MissionScene's Viewer. */
export function startMissionSceneRuntime(args: SceneRuntimeArgs): (() => void) | undefined {
  const {
    hostRef, viewerRef, cesiumRef, missionRef, simActiveRef, planRef, reducedRef, gestureModeRef,
    snapFnRef, orbitByRef, orbitEndRef, topDownRef, renderedPreviewCaptureRef, renderedPreviewMissionRef,
    settleRef, previewCaptureRef, previewPositionRef, clockRef, editState, editControlsRef, readinessRef,
    setStatus, setErrorMessage, setOrientation, fitRef, revalidateWaypointGroundGuideRef, createViewer, destroyViewer
  } = args
  const { hoveredWaypointRef, wpDragRef } = editState
    if (!hostRef.current) return
    if (viewerRef.current && !viewerRef.current.isDestroyed()) return
    let mounted = true
    let failed = false
    let raf = 0
    let ro: ResizeObserver | null = null
    let removeContextLost: (() => void) | null = null
    let camCleanup: (() => void) | null = null
    // Guard: ignore the LEFT_CLICK that ends a camera drag (Cesium has no
    // click-vs-drag distinction on its own handler).
    const dragState: { activePointerId: number | null; downX: number; downY: number; dragged: boolean; avoidId: string | null; avoidStartY: number; avoidStartHeight: number; avoidPosition: import('cesium').Cartesian3 | null; cameraInputs: boolean } = {
      activePointerId: null, downX: 0, downY: 0, dragged: false, avoidId: null, avoidStartY: 0, avoidStartHeight: 0, avoidPosition: null, cameraInputs: true
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

        const viewer = createViewer(Cesium, hostRef.current)
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
          destroyViewer(viewer)
          return
        }
        viewerRef.current = viewer
        cesiumRef.current = Cesium
        /* A recreated Viewer starts with an empty entity collection. Reset
           the preview layer's own bookkeeping so its owner renders the
           overlay again instead of assuming it is still on screen. */
        renderedPreviewCaptureRef.current = null
        renderedPreviewMissionRef.current = null
        viewer.scene.postProcessStages.fxaa.enabled = !viewer.scene.msaaSupported
        /* Render at device density for crisp map tiles and geometry, capped to
           avoid unbounded canvas cost on very high-density displays. */
        viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2)
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
        const editCtl = createEditGestures({
          viewer,
          Cesium,
          dragState,
          canvasPosition,
          canvasPositionFromClient,
          state: editState
        })
        const cameraCtl = installCameraGestures({
          viewer,
          Cesium,
          isMounted: () => mounted,
          dragState,
          canvasPositionFromClient,
          missionRef,
          reducedRef,
          gestureModeRef,
          setOrientation,
          snapFnRef,
          orbitByRef,
          orbitEndRef,
          topDownRef,
          edit: editCtl
        })
        /* Listener order matches the original: camera pointer/keyboard
           listeners (and the shared click-vs-drag recorder) first, then the
           edit module's ScreenSpaceEventHandler, canvas mouseleave and
           Z-hold keys. Every listener is removed by the two dispose() calls
           in camCleanup below. */
        cameraCtl.install()
        editCtl.install()
        editControlsRef.current = editCtl
        /* Registered so the committed synchroniser can re-validate the guide
           after it rebuilt the committed geometry. The guide is not rebuilt
           here: it belongs to the pointer handler (scene-edit-gestures). */
        revalidateWaypointGroundGuideRef.current = (currentMission: StudioMission) => {
          if (viewer.isDestroyed()) return
          const hovered = hoveredWaypointRef.current
          if (!hovered || !currentMission.waypoints.some((waypoint) => waypoint.id === hovered)) {
            editCtl.hideWaypointGroundGuide()
            return
          }
          editCtl.updateWaypointGroundGuide(hovered)
        }

        const onContextLost = (e: Event) => {
          e.preventDefault()
          cameraCtl.abortGestures()
          if (!mounted || viewerRef.current !== viewer) return
          failed = true
          setStatus('error')
          readinessRef.current('error')
          setErrorMessage('WebGL context lost. Retry, or continue editing from the waypoint list.')
        }
        viewer.canvas.addEventListener('webglcontextlost', onContextLost)
        removeContextLost = () => viewer.canvas.removeEventListener('webglcontextlost', onContextLost)
        const onRenderError = (_scene: unknown, err: unknown) => {
          console.error('Mission Studio renderError:', err)
          cameraCtl.abortGestures()
          if (!mounted || viewerRef.current !== viewer) return
          failed = true
          setStatus('error')
          readinessRef.current('error')
          setErrorMessage('3D renderer error. Retry, or continue editing from the waypoint list.')
        }
        viewer.scene.renderError.addEventListener(onRenderError)
        camCleanup = () => {
          cameraCtl.dispose()
          editCtl.dispose()
          if (editControlsRef.current === editCtl) editControlsRef.current = null
          if (removeContextLost) removeContextLost()
          viewer.scene.renderError.removeEventListener(onRenderError)
        }
        ro = new ResizeObserver(() => {
          if (!viewer.isDestroyed()) {
            viewer.resize()
            viewer.scene.requestRender()
          }
        })
        if (hostRef.current) ro.observe(hostRef.current)

        let lastVehiclePosition: { x: number; y: number; z: number } | null = null
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
          const activeMission = missionRef.current
          /* The preview layer owns the capture-scan overlay: it removes and
             re-renders its own entities when the captured waypoint or the
             mission geometry changed. No other layer touches them. */
          if (activeCaptureId !== renderedPreviewCaptureRef.current || activeMission !== renderedPreviewMissionRef.current) {
            removeSceneEntitiesInLayer(viewer.entities, 'preview')
            if (activeCaptureId) {
              const currentMission = activeMission
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
            renderedPreviewMissionRef.current = activeMission
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
          ...window.__missionStudio,
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
          cameraCtl.pushOrientation()
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
            destroyViewer(viewerRef.current)
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
      editControlsRef.current = null
      if (ro) ro.disconnect()
      const viewer = viewerRef.current
      if (viewer && !viewer.isDestroyed()) destroyViewer(viewer)
      viewerRef.current = null
      cesiumRef.current = null
      /* Drop the guide re-validation hook: it closes over the destroyed
         Viewer and must not outlive it. */
      revalidateWaypointGroundGuideRef.current = () => undefined
    }
}
