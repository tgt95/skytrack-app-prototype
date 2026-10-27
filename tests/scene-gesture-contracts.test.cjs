/* Deterministic behaviour contracts for the scene edit-gesture coordinator
   (T-223 / W13a acceptance). The suite drives `createEditGestures` through the
   callbacks it installs on a controlled ScreenSpaceEventHandler mock and calls
   the public hooks that camera arbitration calls in the app. No Cesium runtime,
   browser, or production debug bridge is involved.

   Covered W13 acceptance rows: 13 (drag suppresses click), 19/22 (waypoint and
   pending drag preview/commit), 23 (press without move), 26/29 (edit abort paths
   used by Escape and blur), 30 (dispose twice), 32 (arbitration verdicts), and
   34 (layer safety). Runtime-only rows remain NOT_RUN. */

const test = require('node:test')
const assert = require('node:assert/strict')
const { emptyMission, missionOrigin } = require('../src/domain/mission-model.ts')
const { enuToLngLat } = require('../src/features/scene/mission-scene-helpers.ts')
const { createEditGestures } = require('../src/features/scene/scene-edit-gestures.ts')
const { installCameraGestures } = require('../src/features/scene/scene-camera-gestures.ts')

const PIXEL_ORIGIN = 100
const SCREEN_SCALE = 1
const START_HEIGHT = 20
const WAYPOINT_ID = 'wp1'

/* Cesium is a controlled mock. Cartesian3 stores degrees (x=lng, y=lat,
   z=height) so the real scene math can round-trip through the same
   enuToLngLat/lngLatToEnu helpers without an ellipsoid model. */
function createCesiumMock () {
  const handlers = []

  const cartographicFromCartesian = (point) => {
    if (!point) return undefined
    return {
      longitude: (point.x * Math.PI) / 180,
      latitude: (point.y * Math.PI) / 180,
      height: point.z ?? 0
    }
  }

  class ScreenSpaceEventHandler {
    constructor (canvas) {
      this.canvas = canvas
      this.actions = new Map()
      this.destroyCount = 0
      this.destroyed = false
      handlers.push(this)
    }

    setInputAction (callback, type) {
      this.actions.set(type, callback)
    }

    isDestroyed () {
      return this.destroyed
    }

    destroy () {
      this.destroyCount += 1
      this.destroyed = true
      this.actions.clear()
    }

    fire (type, movement) {
      const callback = this.actions.get(type)
      assert.equal(typeof callback, 'function', `no callback registered for ScreenSpaceEventType ${type}`)
      callback(movement)
    }
  }

  class Cartesian3 {
    constructor (x = 0, y = 0, z = 0) {
      this.x = x
      this.y = y
      this.z = z
    }

    static fromDegrees (lng, lat, height = 0) {
      return new Cartesian3(lng, lat, height)
    }

    static fromRadians (longitude, latitude, height = 0) {
      return new Cartesian3((longitude * 180) / Math.PI, (latitude * 180) / Math.PI, height)
    }

    static fromDegreesArrayHeights (values) {
      const points = []
      for (let index = 0; index < values.length; index += 3) {
        points.push(new Cartesian3(values[index], values[index + 1], values[index + 2]))
      }
      return points
    }

    static distance (a, b) {
      return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
    }

    static add (a, b, result = new Cartesian3()) {
      result.x = a.x + b.x
      result.y = a.y + b.y
      result.z = a.z + b.z
      return result
    }

    static subtract (a, b, result = new Cartesian3()) {
      result.x = a.x - b.x
      result.y = a.y - b.y
      result.z = a.z - b.z
      return result
    }

    static multiplyByScalar (value, scalar, result = new Cartesian3()) {
      result.x = value.x * scalar
      result.y = value.y * scalar
      result.z = value.z * scalar
      return result
    }

    static negate (value, result = new Cartesian3()) {
      result.x = -value.x
      result.y = -value.y
      result.z = -value.z
      return result
    }

    static normalize (value, result = new Cartesian3()) {
      const length = Math.hypot(value.x, value.y, value.z) || 1
      result.x = value.x / length
      result.y = value.y / length
      result.z = value.z / length
      return result
    }

    static dot (a, b) {
      return a.x * b.x + a.y * b.y + a.z * b.z
    }
  }

  class Cartesian2 {
    constructor (x = 0, y = 0) {
      this.x = x
      this.y = y
    }
  }

  class Plane {
    constructor (normal, distance) {
      this.normal = normal
      this.distance = distance
    }
  }

  class ConstantProperty {
    constructor (value) {
      this.value = value
    }
  }

  class ConstantPositionProperty {
    constructor (value) {
      this.value = value
    }
  }

  class PolylineDashMaterialProperty {
    constructor (options) {
      this.options = options
    }
  }

  class PolylineArrowMaterialProperty {
    constructor (color) {
      this.color = color
    }
  }

  return {
    handlers,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType: { MOUSE_MOVE: 0, LEFT_DOWN: 1, LEFT_UP: 2, LEFT_CLICK: 3 },
    Cartesian2,
    Cartesian3,
    Cartographic: {
      fromCartesian: cartographicFromCartesian,
      fromDegrees: (lng, lat, height = 0) => ({
        longitude: (lng * Math.PI) / 180,
        latitude: (lat * Math.PI) / 180,
        height
      })
    },
    Ellipsoid: {
      WGS84: {
        /* The drag plane is horizontal in this harness, matching the real
           local picking plane's normal role without an ellipsoid model. */
        geodeticSurfaceNormal: () => ({ x: 0, y: 0, z: 1 })
      }
    },
    Plane,
    IntersectionTests: {
      rayPlane: (ray, plane, result) => {
        const normal = plane.normal
        const direction = ray.direction
        const denominator =
          normal.x * direction.x + normal.y * direction.y + normal.z * direction.z
        if (Math.abs(denominator) < 1e-12) return undefined
        const distance =
          -(normal.x * ray.origin.x +
            normal.y * ray.origin.y +
            normal.z * ray.origin.z +
            plane.distance) / denominator
        if (!Number.isFinite(distance)) return undefined
        result.x = ray.origin.x + direction.x * distance
        result.y = ray.origin.y + direction.y * distance
        result.z = ray.origin.z + direction.z * distance
        return result
      },
      rayTriangle: () => undefined
    },
    Color: {
      fromCssColorString: (css) => ({ css, withAlpha: (alpha) => ({ css, alpha }) }),
      WHITE: { css: 'white' },
      BLACK: {
        css: 'black',
        withAlpha: (alpha) => ({ css: 'black', alpha })
      }
    },
    ConstantProperty,
    ConstantPositionProperty,
    PolylineDashMaterialProperty,
    PolylineArrowMaterialProperty,
    ArcType: { NONE: 0 },
    LabelStyle: { FILL_AND_OUTLINE: 0 },
    HorizontalOrigin: { LEFT: 0 },
    VerticalOrigin: { CENTER: 1 }
  }
}

function createEventTarget (extra = {}) {
  const listeners = new Map()
  return {
    ...extra,
    addEventListener (type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(listener)
    },
    removeEventListener (type, listener) {
      listeners.get(type)?.delete(listener)
    },
    dispatch (type, event = {}) {
      for (const listener of Array.from(listeners.get(type) ?? [])) listener(event)
    },
    listenerCount (type) {
      return listeners.get(type)?.size ?? 0
    },
    totalListeners () {
      let total = 0
      for (const set of listeners.values()) total += set.size
      return total
    }
  }
}

function createPositionProperty (initial) {
  const property = {
    current: initial,
    setCalls: 0,
    setValue (value) {
      property.current = value
      property.setCalls += 1
    },
    getValue () {
      return property.current
    }
  }
  return property
}

function createValueProperty (initial) {
  return {
    current: initial,
    setValue (value) { this.current = value },
    getValue () { return this.current }
  }
}

function pointerAt (clientX, clientY, extra = {}) {
  return { clientX, clientY, pointerId: 1, isPrimary: true, button: 0, shiftKey: false, ...extra }
}

function cartesian2At (x, y) {
  return { x, y }
}

function createPickRecorder () {
  const calls = []
  const record = (name) => (...args) => calls.push({ name, args })
  return {
    calls,
    count (name) {
      return calls.filter((call) => call.name === name).length
    },
    argsOf (name) {
      return calls.filter((call) => call.name === name).map((call) => call.args)
    },
    names () {
      return calls.map((call) => call.name)
    },
    callbacks: {
      onPickWaypoint: record('onPickWaypoint'),
      onPickZone: record('onPickZone'),
      onClearSelection: record('onClearSelection'),
      onScenePoint: record('onScenePoint'),
      onDraftHover: record('onDraftHover'),
      onClosePending: record('onClosePending'),
      onInsertWaypoint: record('onInsertWaypoint'),
      onRemoveWaypoint: record('onRemoveWaypoint'),
      onWaypointAltitudeChange: record('onWaypointAltitudeChange'),
      onWaypointPositionChange: record('onWaypointPositionChange'),
      onAvoidHeightChange: record('onAvoidHeightChange'),
      onPendingPositionChange: record('onPendingPositionChange'),
      onPendingAltitudeChange: record('onPendingAltitudeChange'),
      onInsertPendingPoint: record('onInsertPendingPoint'),
      onRemovePendingPoint: record('onRemovePendingPoint')
    }
  }
}

function createHarness (options = {}) {
  const Cesium = createCesiumMock()
  const mission = {
    ...emptyMission(),
    waypoints: [{ id: WAYPOINT_ID, x: 0, y: 0, z: START_HEIGHT, action: { kind: 'photo' } }],
    avoids: options.withAvoid ? [{
      id: 'avoid1', points: [{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }], baseAltM: 5, heightM: 10
    }] : []
  }
  const origin = missionOrigin(mission)
  const recorder = createPickRecorder()

  const calls = {
    render: 0,
    added: [],
    removed: [],
    removedById: [],
    removeAll: 0
  }
  const entities = new Map()

  const pointForEnu = (x, y, z) => {
    const geo = enuToLngLat(x, y, origin)
    return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, z)
  }

  const waypointEntity = {
    id: `ms-wp-${WAYPOINT_ID}`,
    position: createPositionProperty(pointForEnu(0, 0, START_HEIGHT)),
    show: true
  }
  entities.set(waypointEntity.id, waypointEntity)

  const avoidPolygon = options.withAvoid ? {
    id: 'ms-avoid-avoid1',
    polygon: { extrudedHeight: createValueProperty(15) }
  } : null
  const avoidHandlePosition = options.withAvoid
    ? createPositionProperty(pointForEnu(3, 2, 15))
    : null
  if (avoidPolygon) entities.set(avoidPolygon.id, avoidPolygon)
  if (avoidHandlePosition) entities.set('ms-avoid-height-avoid1', { id: 'ms-avoid-height-avoid1', position: avoidHandlePosition })

  const entityCollection = {
    add (entity) {
      calls.added.push(entity.id)
      entities.set(entity.id, entity)
      return entity
    },
    getById (id) {
      return entities.get(id)
    },
    remove (entity) {
      calls.removed.push(entity?.id)
      entities.delete(entity?.id)
      return true
    },
    removeById (id) {
      calls.removedById.push(id)
      return entities.delete(id)
    },
    removeAll () {
      calls.removeAll += 1
      entities.clear()
    },
    get values () {
      return [...entities.values()]
    }
  }

  const camera = {
    heading: 0,
    pitch: -0.62,
    positionWC: { x: 0, y: 0, z: 100 },
    changed: { addEventListener: () => () => undefined },
    positionCartographic: { height: 100 },
    getPickRay (position) {
      /* Screen pixels map to local metres: 100 px is the ENU origin, +x is
         east, +y is south. The ray hits the drag plane at the mapped point. */
      const geo = enuToLngLat(
        (position.x - PIXEL_ORIGIN) * SCREEN_SCALE,
        -(position.y - PIXEL_ORIGIN) * SCREEN_SCALE,
        origin
      )
      return {
        origin: Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, 1000),
        direction: { x: 0, y: 0, z: -1 }
      }
    }
  }

  let drillPickResult = []
  let destroyed = false

  const scene = {
    drillPick: () => drillPickResult,
    pick: () => undefined,
    pickPositionSupported: false,
    globe: {
      ellipsoid: {},
      getHeight: () => 0
    },
    screenSpaceCameraController: { enableInputs: true },
    requestRender: () => {
      calls.render += 1
    }
  }

  const canvas = createEventTarget({
    clientHeight: 100,
    clientWidth: 100,
    style: {},
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined
  })

  const viewer = {
    canvas,
    camera,
    scene,
    entities: entityCollection,
    clock: { currentTime: {} },
    isDestroyed: () => destroyed,
    destroy: () => {
      destroyed = true
    }
  }

  const abortCalls = { zdrag: 0, wp: 0, pending: 0 }
  const state = {
    missionRef: { current: mission },
    toolRef: { current: 'select' },
    selectionRef: { current: null },
    simActiveRef: { current: false },
    pickRef: { current: recorder.callbacks },
    drawAltRef: { current: 12 },
    pendingPointsRef: { current: [] },
    pendingShapeRef: { current: 'polygon' },
    hoverRef: { current: { insert: null, pendingInsert: null } },
    hoveredWaypointRef: { current: null },
    hoveredPhotoRef: { current: null },
    selectedPhotoRef: { current: null },
    showPhotoMarkersRef: { current: false },
    frustumGeomRef: { current: new Map() },
    zHeldRef: { current: false },
    zdragRef: { current: null },
    zdragInputsRef: { current: true },
    wpDragRef: { current: null },
    pendingDragRef: { current: null },
    pendingDownRef: { current: null },
    pendingClickArmRef: { current: null },
    wpDownRef: { current: null },
    selectMetaRef: { current: null },
    toolRevRef: { current: 0 },
    selRevRef: { current: 0 },
    worldTerrainTrianglesRef: { current: [] },
    /* Parent-owned restore paths, modelled with the same ref/entity effects
       mission-scene.tsx performs. Counting the delegations keeps this suite
       about the coordinator + extracted drag owners, not about re-testing the
       parent callback. */
    abortZdrag: () => {
      abortCalls.zdrag += 1
      const drag = state.zdragRef.current
      if (drag) {
        const waypoint = mission.waypoints.find((item) => item.id === drag.id)
        if (waypoint) waypointEntity.position.setValue(pointForEnu(waypoint.x, waypoint.y, waypoint.z))
        scene.screenSpaceCameraController.enableInputs = state.zdragInputsRef.current
      }
      state.zdragRef.current = null
      state.zHeldRef.current = false
    },
    abortWpDrag: () => {
      abortCalls.wp += 1
      const drag = state.wpDragRef.current
      state.wpDragRef.current = null
      if (!drag || !drag.moved) return
      waypointEntity.position.setValue(pointForEnu(drag.startX, drag.startY, drag.startZ))
    },
    abortPendingDrag: () => {
      abortCalls.pending += 1
      state.pendingDragRef.current = null
    }
  }

  const dragState = {
    activePointerId: null,
    downX: 0,
    downY: 0,
    dragged: false,
    avoidId: null,
    avoidStartY: 0,
    avoidStartHeight: 0,
    avoidPosition: null,
    cameraInputs: true
  }

  const windowTarget = createEventTarget()
  const previousWindow = global.window
  global.window = windowTarget

  const edit = createEditGestures({
    viewer,
    Cesium,
    dragState,
    canvasPosition: (position) => cartesian2At(position.x, position.y),
    canvasPositionFromClient: (clientX, clientY) => cartesian2At(clientX, clientY),
    state
  })

  let cameraCtl = null
  const installCamera = () => {
    cameraCtl = installCameraGestures({
      viewer,
      Cesium,
      isMounted: () => true,
      dragState,
      canvasPositionFromClient: (clientX, clientY) => cartesian2At(clientX, clientY),
      missionRef: state.missionRef,
      reducedRef: { current: true },
      gestureModeRef: { current: 'none' },
      setOrientation: () => undefined,
      snapFnRef: { current: () => undefined },
      orbitByRef: { current: () => undefined },
      orbitEndRef: { current: () => undefined },
      topDownRef: { current: () => undefined },
      edit
    })
    cameraCtl.install()
    return cameraCtl
  }

  return {
    edit,
    installCamera,
    viewer,
    Cesium,
    mission,
    origin,
    state,
    dragState,
    recorder,
    calls,
    entities,
    entityCollection,
    waypointEntity,
    avoidPolygon,
    avoidHandlePosition,
    canvas,
    windowTarget,
    abortCalls,
    setDrillPick (candidates) {
      drillPickResult = candidates
    },
    get handler () {
      return Cesium.handlers[0]
    },
    cleanup () {
      cameraCtl?.dispose()
      edit.dispose()
      if (previousWindow === undefined) delete global.window
      else global.window = previousWindow
    }
  }
}

function waypointCandidates () {
  return [{ id: { id: `ms-wp-${WAYPOINT_ID}` } }]
}

test('W13a arbitration: allowlist skips, avoid handles block, waypoint press holds and a sub-threshold release is a no-op', () => {
  const harness = createHarness()
  try {
    harness.setDrillPick(waypointCandidates())
    harness.edit.install()

    const handler = harness.handler
    assert.deepEqual(
      [...handler.actions.keys()],
      [
        harness.Cesium.ScreenSpaceEventType.MOUSE_MOVE,
        harness.Cesium.ScreenSpaceEventType.LEFT_DOWN,
        harness.Cesium.ScreenSpaceEventType.LEFT_UP,
        harness.Cesium.ScreenSpaceEventType.LEFT_CLICK
      ],
      'install() registers the four edit input actions in order'
    )

    /* Background-allowlisted candidates keep scanning (camera may orbit). */
    assert.equal(
      harness.edit.classifyCandidatePress(pointerAt(100, 100), 'ms-grid-x'),
      'skip'
    )
    assert.equal(
      harness.edit.classifyCandidatePress(pointerAt(100, 100), 'ms-route-len-0'),
      'skip'
    )
    assert.equal(harness.state.wpDragRef.current, null)

    /* Avoid height handles own their own drag flow. */
    assert.equal(
      harness.edit.classifyCandidatePress(pointerAt(100, 100), 'ms-avoid-height-a1'),
      'blocked'
    )
    assert.equal(harness.state.wpDragRef.current, null)
    assert.equal(harness.edit.hasActiveEditDrag(), false)

    /* Authored waypoint press claims the press and arms a pending XY drag. */
    assert.equal(
      harness.edit.classifyCandidatePress(pointerAt(100, 100), `ms-wp-${WAYPOINT_ID}`),
      'hold'
    )
    assert.equal(harness.state.wpDragRef.current?.mode, 'xy')
    assert.equal(harness.state.wpDragRef.current?.moved, false)
    assert.equal(harness.edit.isZPressActive(), false)
    assert.equal(harness.edit.hasActiveEditDrag(), true)

    /* Under the 16 px² click threshold: no preview, no commit, no drag flag. */
    harness.edit.advanceEditDrag(pointerAt(102, 102))
    assert.equal(harness.dragState.dragged, false)
    assert.equal(harness.waypointEntity.position.setCalls, 0)

    harness.edit.resolveEditPointer(pointerAt(102, 102))
    assert.equal(harness.state.wpDragRef.current, null)
    assert.equal(harness.recorder.count('onWaypointPositionChange'), 0)
    assert.equal(harness.recorder.count('onWaypointAltitudeChange'), 0)

    /* The release click is not suppressed: it selects exactly once. */
    handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_CLICK, {
      position: cartesian2At(102, 102)
    })
    assert.deepEqual(harness.recorder.names(), ['onPickWaypoint'])
    assert.deepEqual(harness.recorder.argsOf('onPickWaypoint')[0], [WAYPOINT_ID])
  } finally {
    harness.cleanup()
  }
})

test('W13a waypoint drag: previews once per move, commits exactly once, and suppresses the release click', () => {
  const harness = createHarness()
  try {
    harness.setDrillPick(waypointCandidates())
    harness.edit.install()
    const handler = harness.handler

    assert.equal(
      harness.edit.classifyCandidatePress(pointerAt(100, 100), `ms-wp-${WAYPOINT_ID}`),
      'hold'
    )
    const originalPosition = { ...harness.waypointEntity.position.current }

    /* A 40 px move crosses the 16 px² threshold and previews 40 m east. */
    harness.edit.advanceEditDrag(pointerAt(140, 100))
    assert.equal(harness.state.wpDragRef.current?.moved, true)
    assert.equal(harness.dragState.dragged, true)
    assert.equal(harness.waypointEntity.position.setCalls, 1)

    const previewed = harness.waypointEntity.position.current
    assert.ok(previewed.x > originalPosition.x, 'preview moved the entity east')

    /* Camera arbitration resolves the pointerup; the edit LEFT_UP follows. */
    harness.edit.resolveEditPointer(pointerAt(140, 100))
    handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_UP, {
      position: cartesian2At(140, 100)
    })

    assert.equal(harness.recorder.count('onWaypointPositionChange'), 1)
    const [id, x, y] = harness.recorder.argsOf('onWaypointPositionChange')[0]
    assert.equal(id, WAYPOINT_ID)
    assert.ok(Math.abs(x - 40) < 1e-6, `committed x should be 40 m, got ${x}`)
    assert.ok(Math.abs(y) < 1e-6, `committed y should be 0 m, got ${y}`)
    assert.equal(harness.recorder.count('onWaypointAltitudeChange'), 0)
    assert.equal(harness.state.wpDragRef.current, null)

    /* A second resolve cannot duplicate the commit. */
    harness.edit.resolveEditPointer(pointerAt(140, 100))
    assert.equal(harness.recorder.count('onWaypointPositionChange'), 1)

    /* The drag still owns the release click: consumed once, no selection. */
    handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_CLICK, {
      position: cartesian2At(140, 100)
    })
    assert.equal(harness.dragState.dragged, false)
    assert.equal(harness.recorder.count('onPickWaypoint'), 0)
    assert.equal(harness.recorder.count('onClearSelection'), 0)
  } finally {
    harness.cleanup()
  }
})

test('W13a pending-point drag: preview rounds to 0.1 m and commits once', () => {
  const harness = createHarness()
  try {
    harness.state.toolRef.current = 'route'
    harness.state.pendingPointsRef.current = [{ x: 0, y: 0, z: 15 }]
    harness.edit.install()

    assert.equal(
      harness.edit.classifyCandidatePress(pointerAt(100, 100), 'ms-pending-0'),
      'hold'
    )
    assert.equal(harness.state.pendingDragRef.current?.mode, 'xy')

    /* 31 px east previews the 0.1 m-rounded pending point. */
    harness.edit.advanceEditDrag(pointerAt(131, 100))
    assert.equal(harness.state.pendingDragRef.current?.moved, true)
    assert.equal(harness.state.pendingDragRef.current?.currentX, 31)

    harness.edit.resolveEditPointer(pointerAt(131, 100))
    assert.equal(harness.recorder.count('onPendingPositionChange'), 1)
    const [index, x, y] = harness.recorder.argsOf('onPendingPositionChange')[0]
    assert.equal(index, 0)
    assert.equal(x, 31)
    assert.equal(y, 0)
    assert.equal(harness.recorder.count('onPendingAltitudeChange'), 0)
    assert.equal(harness.state.pendingDragRef.current, null)
  } finally {
    harness.cleanup()
  }
})

test('W13a cancellation hooks abort previews without committing', () => {
  const harness = createHarness()
  try {
    harness.setDrillPick(waypointCandidates())
    harness.edit.install()

    const originalPosition = { ...harness.waypointEntity.position.current }
    /* Pointer-cancel path used by scene-camera-gestures.cancelCamPointer. */
    harness.edit.classifyCandidatePress(pointerAt(100, 100), `ms-wp-${WAYPOINT_ID}`)
    harness.edit.advanceEditDrag(pointerAt(140, 100))
    const previewed = harness.waypointEntity.position.current
    assert.ok(previewed.x > originalPosition.x, 'drag preview reached the entity')

    harness.edit.abortEditDrags()
    assert.equal(harness.abortCalls.wp, 1)
    assert.equal(harness.abortCalls.pending, 1)
    assert.equal(harness.edit.hasActiveEditDrag(), false)
    const restored = harness.waypointEntity.position.current
    assert.ok(Math.abs(restored.x - originalPosition.x) < 1e-12, 'preview restored to the original longitude')
    assert.ok(Math.abs(restored.y - originalPosition.y) < 1e-12, 'preview restored to the original latitude')

    /* A later pointerup sees no armed drag and cannot commit. */
    harness.edit.resolveEditPointer(pointerAt(140, 100))
    assert.equal(harness.recorder.count('onWaypointPositionChange'), 0)
    assert.equal(harness.recorder.count('onWaypointAltitudeChange'), 0)

    /* Camera arbitration calls abortForBlur after a window blur. */
    harness.edit.classifyCandidatePress(pointerAt(120, 100), `ms-wp-${WAYPOINT_ID}`)
    harness.edit.advanceEditDrag(pointerAt(160, 100))
    harness.edit.abortForBlur()
    assert.equal(harness.abortCalls.wp, 2)
    assert.equal(harness.abortCalls.pending, 2)
    assert.equal(harness.edit.hasActiveEditDrag(), false)
    harness.edit.resolveEditPointer(pointerAt(160, 100))
    assert.equal(harness.recorder.count('onWaypointPositionChange'), 0)
  } finally {
    harness.cleanup()
  }
})

test('W13a no-op Z press: altitude drag freezes camera inputs, then restores without a commit', () => {
  const harness = createHarness()
  try {
    harness.setDrillPick(waypointCandidates())
    harness.edit.install()
    const handler = harness.handler

    harness.windowTarget.dispatch('keydown', { key: 'z', ctrlKey: false, metaKey: false })
    assert.equal(harness.state.zHeldRef.current, true)

    handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_DOWN, {
      position: cartesian2At(100, 100)
    })
    assert.equal(harness.edit.isZPressActive(), true)
    assert.equal(harness.edit.hasActiveEditDrag(), true)
    assert.equal(harness.viewer.scene.screenSpaceCameraController.enableInputs, false)

    /* No pointer movement: the release restores the untouched altitude. */
    handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_UP, {
      position: cartesian2At(100, 100)
    })
    assert.equal(harness.edit.isZPressActive(), false)
    assert.equal(harness.state.zHeldRef.current, false)
    assert.equal(harness.viewer.scene.screenSpaceCameraController.enableInputs, true)
    assert.equal(harness.recorder.count('onWaypointAltitudeChange'), 0)
  } finally {
    harness.cleanup()
  }
})

test('W13b blur aborts an active Z preview, restores the original altitude, and cannot commit on late release', () => {
  const harness = createHarness()
  try {
    harness.setDrillPick(waypointCandidates())
    harness.installCamera()
    harness.edit.install()
    harness.windowTarget.dispatch('keydown', { key: 'z', ctrlKey: false, metaKey: false })
    harness.canvas.dispatch('pointerdown', pointerAt(100, 100))
    harness.handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_DOWN, { position: cartesian2At(100, 100) })
    assert.equal(harness.edit.isZPressActive(), true)
    harness.waypointEntity.position.setValue({ x: 1, y: 2, z: START_HEIGHT + 9 })

    harness.windowTarget.dispatch('blur')
    assert.equal(harness.edit.isZPressActive(), false)
    assert.equal(harness.viewer.scene.screenSpaceCameraController.enableInputs, true)
    assert.equal(harness.waypointEntity.position.current.z, START_HEIGHT)
    harness.handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_UP, { position: cartesian2At(100, 100) })
    assert.equal(harness.recorder.count('onWaypointAltitudeChange'), 0)
  } finally {
    harness.cleanup()
  }
})

test('W13b pointer-cancel aborts an active Z preview and restores camera inputs', () => {
  const harness = createHarness()
  try {
    harness.setDrillPick(waypointCandidates())
    harness.installCamera()
    harness.edit.install()
    harness.windowTarget.dispatch('keydown', { key: 'z', ctrlKey: false, metaKey: false })
    harness.canvas.dispatch('pointerdown', pointerAt(100, 100))
    harness.handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_DOWN, { position: cartesian2At(100, 100) })
    harness.waypointEntity.position.setValue({ x: 1, y: 2, z: START_HEIGHT + 9 })

    harness.canvas.dispatch('pointercancel', { pointerId: 1 })
    assert.equal(harness.edit.isZPressActive(), false)
    assert.equal(harness.viewer.scene.screenSpaceCameraController.enableInputs, true)
    assert.equal(harness.waypointEntity.position.current.z, START_HEIGHT)
    harness.handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_UP, { position: cartesian2At(100, 100) })
    assert.equal(harness.recorder.count('onWaypointAltitudeChange'), 0)
  } finally {
    harness.cleanup()
  }
})

test('W13b pointer-cancel aborts an active avoid-height preview and cannot commit on late release', () => {
  const harness = createHarness({ withAvoid: true })
  try {
    harness.setDrillPick([{ id: { id: 'ms-avoid-height-avoid1' } }])
    harness.installCamera()
    harness.edit.install()
    harness.canvas.dispatch('pointerdown', pointerAt(100, 100))
    harness.handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_DOWN, { position: cartesian2At(100, 100) })
    assert.equal(harness.dragState.avoidId, 'avoid1')
    assert.equal(harness.edit.hasActiveEditDrag(), true)
    const originalHandlePosition = { ...harness.avoidHandlePosition.current }
    harness.handler.fire(harness.Cesium.ScreenSpaceEventType.MOUSE_MOVE, { endPosition: cartesian2At(100, 90) })
    assert.equal(harness.avoidPolygon.polygon.extrudedHeight.current, 25)

    harness.canvas.dispatch('pointercancel', { pointerId: 1 })
    assert.equal(harness.dragState.avoidId, null)
    assert.equal(harness.avoidPolygon.polygon.extrudedHeight.current, 15)
    assert.equal(harness.avoidHandlePosition.current.x, originalHandlePosition.x)
    assert.equal(harness.avoidHandlePosition.current.y, originalHandlePosition.y)
    assert.equal(harness.avoidHandlePosition.current.z, originalHandlePosition.z)
    assert.equal(harness.viewer.scene.screenSpaceCameraController.enableInputs, true)
    harness.handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_UP, { position: cartesian2At(100, 90) })
    assert.equal(harness.recorder.count('onAvoidHeightChange'), 0)
  } finally {
    harness.cleanup()
  }
})

test('W13a dispose: removes every installed listener and gesture ref, and is idempotent', () => {
  const harness = createHarness()
  try {
    const handlerBefore = harness.Cesium.handlers.length
    assert.equal(harness.canvas.totalListeners(), 0)
    assert.equal(harness.windowTarget.totalListeners(), 0)

    harness.edit.install()
    assert.equal(harness.Cesium.handlers.length, handlerBefore + 1)
    const handler = harness.handler
    assert.equal(handler.actions.size, 4)
    assert.equal(harness.canvas.listenerCount('mouseleave'), 1)
    assert.equal(harness.windowTarget.listenerCount('keydown'), 1)
    assert.equal(harness.windowTarget.listenerCount('keyup'), 1)
    assert.equal(harness.windowTarget.listenerCount('blur'), 1)

    /* Seed gesture state so cleanup can be observed. */
    harness.state.hoveredPhotoRef.current = 'photo1'
    harness.state.hoverRef.current = { insert: 2, pendingInsert: 3 }
    harness.state.wpDragRef.current = { id: WAYPOINT_ID, moved: false }
    harness.state.pendingDragRef.current = { index: 0, moved: false }
    harness.state.zdragRef.current = { id: WAYPOINT_ID }
    harness.state.zHeldRef.current = true

    harness.edit.dispose()
    assert.equal(handler.destroyCount, 1)
    assert.equal(handler.isDestroyed(), true)
    assert.equal(handler.actions.size, 0)
    assert.equal(harness.canvas.listenerCount('mouseleave'), 0)
    assert.equal(harness.canvas.totalListeners(), 0)
    assert.equal(harness.windowTarget.listenerCount('keydown'), 0)
    assert.equal(harness.windowTarget.listenerCount('keyup'), 0)
    assert.equal(harness.windowTarget.listenerCount('blur'), 0)
    assert.equal(harness.windowTarget.totalListeners(), 0)
    assert.equal(harness.state.hoveredPhotoRef.current, null)
    assert.deepEqual(harness.state.hoverRef.current, { insert: null, pendingInsert: null })
    assert.equal(harness.state.wpDragRef.current, null)
    assert.equal(harness.state.pendingDragRef.current, null)
    assert.equal(harness.state.zdragRef.current, null)
    assert.equal(harness.state.zHeldRef.current, false)

    /* Second dispose is a no-op: no second destroy, no throw, no new listeners. */
    assert.doesNotThrow(() => harness.edit.dispose())
    assert.equal(handler.destroyCount, 1)
    assert.equal(harness.canvas.totalListeners(), 0)
    assert.equal(harness.windowTarget.totalListeners(), 0)
  } finally {
    harness.cleanup()
  }
})

test('W13a layer safety: hover only creates the four guide entities and gestures never remove entities', () => {
  const harness = createHarness()
  try {
    const allowedGuideIds = new Set([
      'ms-waypoint-ground-guide',
      'ms-waypoint-ground-arrow-waypoint',
      'ms-waypoint-ground-arrow-surface',
      'ms-waypoint-ground-label'
    ])
    harness.setDrillPick(waypointCandidates())
    harness.edit.install()
    const handler = harness.handler

    const entityCountBefore = harness.entities.size
    handler.fire(harness.Cesium.ScreenSpaceEventType.MOUSE_MOVE, {
      endPosition: cartesian2At(100, 100)
    })

    assert.equal(harness.calls.added.length, 4, 'hover creates the four lazy guide entities')
    for (const id of harness.calls.added) {
      assert.ok(allowedGuideIds.has(id), `hover added a non-guide entity: ${id}`)
    }
    assert.equal(harness.entities.size, entityCountBefore + 4)

    /* Repeated hover is idempotent: getById ?? add never duplicates guides. */
    handler.fire(harness.Cesium.ScreenSpaceEventType.MOUSE_MOVE, {
      endPosition: cartesian2At(100, 100)
    })
    assert.equal(harness.calls.added.length, 4)
    assert.equal(harness.entities.size, entityCountBefore + 4)

    /* Hovering empty space hides guides and toggles no other layer. */
    harness.setDrillPick([])
    handler.fire(harness.Cesium.ScreenSpaceEventType.MOUSE_MOVE, {
      endPosition: cartesian2At(300, 300)
    })
    for (const id of allowedGuideIds) {
      assert.equal(harness.entities.get(id).show, false, `${id} hidden after hover leaves`)
    }
    assert.equal(harness.calls.added.length, 4)

    /* A full press/preview/commit cycle mutates entities in place only. */
    harness.setDrillPick(waypointCandidates())
    harness.edit.classifyCandidatePress(pointerAt(100, 100), `ms-wp-${WAYPOINT_ID}`)
    harness.edit.advanceEditDrag(pointerAt(140, 100))
    harness.edit.resolveEditPointer(pointerAt(140, 100))
    handler.fire(harness.Cesium.ScreenSpaceEventType.LEFT_UP, {
      position: cartesian2At(140, 100)
    })

    assert.equal(harness.recorder.count('onWaypointPositionChange'), 1)
    assert.equal(harness.calls.added.length, 4, 'drag added no entities')
    assert.deepEqual(harness.calls.removed, [])
    assert.deepEqual(harness.calls.removedById, [])
    assert.equal(harness.calls.removeAll, 0)
    assert.equal(harness.entities.size, entityCountBefore + 4)
  } finally {
    harness.cleanup()
  }
})
