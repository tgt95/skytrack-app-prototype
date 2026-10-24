/* scene-camera-gestures.ts — camera gesture installer (T-217 / W04).
   Extracted from mission-scene.tsx. Owns the scene-local camera gesture
   state machine of the owned Viewer:

   - pointerdown arbitration against mission entities (via EditGestureHooks,
     owned by scene-edit-gestures.ts — the camera side drives, it does not
     inspect entity picks beyond the drill it hands over),
   - plain primary drag = orbit (heading + pitch), Meta/Shift/Ctrl = pan,
     Option/Alt = pitch only, wheel stays native (SkyTrac mapping),
   - compass cube snaps (eased) and orbit steps, top-down snap,
   - the click-vs-drag suppression record and the shared pointerdown/up
     recorder order, camera.changed orientation push,
   - the pointer/key listeners that cancel or freeze gestures.

   Every listener this installer creates is removed by dispose(); dispose()
   is idempotent. Viewer creation/destruction stays with MissionScene; the
   edit module owns entity drag flows. All cross-effect state is passed in
   as explicit refs owned by MissionScene. */

import type { Viewer } from 'cesium'
import { missionOrigin, type StudioMission } from '../../domain/mission-model'
import { enuToLngLat } from './mission-scene-helpers'
import type { MissionCubeSnap } from './mission-compass-cube'
import type { EditGestureHooks, SceneDragPressRecord } from './scene-edit-gestures'

type CesiumNS = typeof import('cesium')

/* Pure camera flight to frame the mission (used by resetCamera, world-view
   reframing and harness recovery). No viewer refs — safe to call from
   anywhere with a live Viewer. Moved verbatim from mission-scene.tsx. */
export function fitMission(viewer: Viewer, Cesium: CesiumNS, missionSnap: StudioMission) {
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

export function installCameraGestures(deps: {
  viewer: Viewer
  Cesium: CesiumNS
  /* Effect-scope mounted flag (init may finish after unmount). */
  isMounted: () => boolean
  dragState: SceneDragPressRecord
  canvasPositionFromClient: (clientX: number, clientY: number) => import('cesium').Cartesian2
  missionRef: { current: StudioMission }
  reducedRef: { current: boolean }
  /* 'none' | 'orbit' | 'pan' | 'pitch' | 'edit' | 'snap' — consumed by
     the MissionCompassCube handlers in mission-scene.tsx. */
  gestureModeRef: { current: string }
  setOrientation: (o: { heading: number; pitch: number }) => void
  snapFnRef: { current: (snap: MissionCubeSnap) => void }
  orbitByRef: { current: (dx: number, dy: number) => void }
  orbitEndRef: { current: () => void }
  topDownRef: { current: () => void }
  edit: EditGestureHooks
}): { install: () => void; dispose: () => void; abortGestures: () => void; pushOrientation: () => void } {
  const {
    viewer, Cesium, isMounted, dragState, canvasPositionFromClient,
    missionRef, reducedRef, gestureModeRef, setOrientation,
    snapFnRef, orbitByRef, orbitEndRef, topDownRef, edit
  } = deps
  /* Runtime ownership of the cube-gesture refs lives here between install
     and dispose; install() assigns them and dispose() zeroes them. */

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
    if (viewer.isDestroyed() || !isMounted()) return
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
    const pts = snap.waypoints.map((w) => ({ x: w.x, y: w.y }))
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
  const freezeCamInputs = () => {
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
    if (viewer.isDestroyed() || !isMounted()) return false
    if (!e.isPrimary || e.button !== 0) return false
    if (cam.pointerId !== null) return false
    if (edit.isZPressActive()) return false
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
      // Arbitration: 'skip' keeps scanning (background-allowlist entity),
      // 'blocked' ends the press untouched (avoid handle owns its drag
      // flow), 'hold' claims the press for editing (already prepared by
      // the edit side: drag refs + pointerdown records).
      const verdict = edit.classifyCandidatePress(e, raw)
      if (verdict === 'blocked') return false
      if (verdict === 'skip') continue
      // An edit press claims this press: freeze native camera
      // drift until release, but let the release click through to the
      // existing pick handlers (dragState.dragged stays false unless
      // the pointer actually moves, exactly as before).
      cancelSnap()
      cam.pointerId = e.pointerId
      cam.mode = 'edit'
      freezeCamInputs()
      return false
    }
    cancelSnap()
    cam.pointerId = e.pointerId
    cam.mode = e.altKey ? 'pitch' : e.metaKey || e.shiftKey || e.ctrlKey ? 'pan' : 'orbit'
    // Background press: never a waypoint click or drag.
    edit.clearWaypointDown()
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
    freezeCamInputs()
    return true
  }
  const moveCamDrag = (e: PointerEvent) => {
    if (cam.pointerId !== e.pointerId) return
    if (viewer.isDestroyed() || !isMounted()) {
      edit.abortEditDrags()
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
      edit.advanceEditDrag(e)
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
    edit.resolveEditPointer(e)
    finishCamDrag()
  }
  const cancelCamPointer = (e: PointerEvent) => {
    const ownsCameraPointer = cam.pointerId === e.pointerId
    const ownsEditPointer = dragState.activePointerId === e.pointerId
    if (!ownsCameraPointer && !ownsEditPointer) return
    // Pointer cancel: never commit a partial drag; restore preview.
    if (edit.hasActiveEditDrag()) edit.abortEditDrags()
    if (ownsCameraPointer) finishCamDrag()
    if (ownsEditPointer) dragState.activePointerId = null
  }
  const onCamKey = (e: KeyboardEvent) => {
    // Cancel only an active camera gesture or snap; never steal keys
    // from waypoint editing or parent shortcuts.
    if (e.key === 'Escape' && (edit.isZPressActive() || edit.hasActiveEditDrag())) {
      edit.escAbortEdits()
      finishCamDrag()
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
    edit.abortForBlur()
    dragState.activePointerId = null
    finishCamDrag()
    orbitEndCube()
  }
  /* Shared click-vs-drag recorder (exact original placement and order:
     both were registered after the camera listener of the same event). */
  const onPointerDown = (e: PointerEvent) => {
    dragState.downX = e.clientX
    dragState.downY = e.clientY
    dragState.dragged = false
    if (dragState.activePointerId === null) dragState.activePointerId = e.pointerId
  }
  const onPointerUpRecord = (e: PointerEvent) => {
    if (dragState.activePointerId === e.pointerId) dragState.activePointerId = null
  }
  const onPointerMove = (e: PointerEvent) => {
    if (e.buttons !== 0 && Math.hypot(e.clientX - dragState.downX, e.clientY - dragState.downY) > 6) {
      dragState.dragged = true
    }
  }

  let removedCamChanged: (() => void) | undefined
  let disposed = false

  const install = () => {
    viewer.canvas.addEventListener('pointerdown', startCamDrag)
    viewer.canvas.addEventListener('pointermove', moveCamDrag)
    viewer.canvas.addEventListener('pointerup', endCamPointer)
    viewer.canvas.addEventListener('pointercancel', cancelCamPointer)
    viewer.canvas.addEventListener('lostpointercapture', cancelCamPointer)
    window.addEventListener('keydown', onCamKey)
    window.addEventListener('blur', onCamBlur)
    /* Shared record listeners keep the original relative order: after
       the camera listeners of the same event type. */
    viewer.canvas.addEventListener('pointerdown', onPointerDown)
    viewer.canvas.addEventListener('pointermove', onPointerMove)
    viewer.canvas.addEventListener('pointerup', onPointerUpRecord)
    removedCamChanged = viewer.camera.changed.addEventListener(() => {
      pushOrientation()
    })
    snapFnRef.current = (snap: MissionCubeSnap) => {
      if (viewer.isDestroyed() || !isMounted()) return
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
        if (viewer.isDestroyed() || !isMounted()) return
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
        if (!isMounted() || viewer.isDestroyed()) {
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
      if (viewer.isDestroyed() || !isMounted()) return
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
      if (viewer.isDestroyed() || !isMounted()) return
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
  }

  /* Context-loss / render-error recovery (called from mission-scene.tsx
     before the Viewer goes away). Same triplet as dispose(). */
  const abortGestures = () => {
    cancelSnap()
    finishCamDrag()
    orbitEndCube()
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    abortGestures()
    if (!viewer.isDestroyed()) {
      viewer.canvas.removeEventListener('pointerdown', startCamDrag)
      viewer.canvas.removeEventListener('pointermove', moveCamDrag)
      viewer.canvas.removeEventListener('pointerup', endCamPointer)
      viewer.canvas.removeEventListener('pointercancel', cancelCamPointer)
      viewer.canvas.removeEventListener('lostpointercapture', cancelCamPointer)
      viewer.canvas.removeEventListener('pointerdown', onPointerDown)
      viewer.canvas.removeEventListener('pointermove', onPointerMove)
      viewer.canvas.removeEventListener('pointerup', onPointerUpRecord)
    }
    window.removeEventListener('keydown', onCamKey)
    window.removeEventListener('blur', onCamBlur)
    removedCamChanged?.()
    removedCamChanged = undefined
    /* The cube hooks close over this (now disposed) Viewer. */
    snapFnRef.current = () => {}
    orbitByRef.current = () => {}
    orbitEndRef.current = () => {}
    topDownRef.current = () => {}
  }

  return { install, dispose, abortGestures, pushOrientation }
}
