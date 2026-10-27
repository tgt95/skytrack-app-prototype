const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')

const originalLoad = Module._load
const originalTsxLoader = require.extensions['.tsx']
Module._load = function (request, parent, isMain) {
  if (request.startsWith('skytrack-ui/')) return new Proxy({}, { get: () => function Stub() {} })
  return originalLoad.call(this, request, parent, isMain)
}
require.extensions['.tsx'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: filename
  }).outputText
  module._compile(output, filename)
}

const { applyMockFailure, buildSimPlan, samplePlan, telemetryAt } = require('../src/features/simulation/simulation.ts')
const { previewPhotoCaptureAt, previewPositionAt } = require('../src/features/simulation/mission-preview.tsx')
const { computeDerivedTransfers } = require('../src/domain/transfer-planner.ts')
Module._load = originalLoad
if (originalTsxLoader) require.extensions['.tsx'] = originalTsxLoader
else delete require.extensions['.tsx']

const goldenMission = {
  id: 'golden-mission',
  name: 'Golden mission',
  world: 'Blank space',
  worldType: '3D',
  vehicle: 'Drone x500 Livox Mid 360',
  spawn: { x: 0, y: 0 },
  takeoffAltM: 10,
  targetSpeedMS: 2,
  returnHomeOnEnd: true,
  cameraSafetyCheck: true,
  routes: [{ id: 'route-1', label: 'Route 1', targetSpeedMS: 2 }],
  sequenceOrder: [{ type: 'route', id: 'route-1' }],
  waypoints: [
    { id: 'wp-1', seq: 1, x: 2, y: 0, z: 10, actions: [{ id: 'photo-1', kind: 'photo', label: 'Photo' }], routeId: 'route-1' },
    { id: 'wp-2', seq: 2, x: 6, y: 0, z: 10, actions: [], routeId: 'route-1' }
  ],
  areas: [],
  avoids: []
}

test('simulation plan, playback sample, telemetry, and injected fault match golden outputs', () => {
  const plan = buildSimPlan(goldenMission)
  assert.ok(plan)
  assert.equal(plan.duration, 17.5)
  assert.equal(plan.totalDist, 32)
  assert.equal(plan.failedAtSeq, 0)
  assert.deepEqual(plan.events.map(({ t, kind, seq, waypointId, actionKind }) => [t, kind, seq ?? null, waypointId ?? null, actionKind ?? null]), [
    [0, 'takeoff', null, null, null],
    [6, 'waypoint', 1, 'wp-1', null],
    [6, 'action', 1, 'wp-1', 'photo'],
    [9.5, 'waypoint', 2, 'wp-2', null],
    [9.5, 'rtl', null, null, null],
    [17.5, 'land', null, null, null],
    [17.5, 'complete', null, null, null]
  ])
  assert.deepEqual(samplePlan(plan, 6.5), {
    pos: { x: 2, y: 0, z: 10 }, yawDeg: 0, moving: false, targetSeq: 1, speedMS: 0
  })
  assert.deepEqual(telemetryAt(plan, goldenMission.spawn, 6.5, 'running'), {
    t: 6.5,
    pos: { x: 2, y: 0, z: 10 },
    yawDeg: 0,
    rollDeg: -3,
    pitchDeg: -1.8,
    altM: 10,
    speedMS: 0,
    batteryPct: 85.9,
    homeDistM: 2,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: false,
    targetSeq: 1
  })
  const failed = applyMockFailure(plan, 1)
  assert.equal(failed.duration, 6.5)
  assert.equal(failed.failedAtSeq, 1)
  assert.deepEqual(failed.events.filter((event) => event.kind === 'failure').map(({ t, seq }) => [t, seq]), [[6.5, 1]])
})

test('preview position and photo capture timing match golden outputs with and without photo dwell', () => {
  assert.deepEqual(previewPositionAt(goldenMission, 6.5), { x: 2, y: 0, z: 10 })
  assert.equal(previewPhotoCaptureAt(goldenMission, 6, true), 'wp-1')
  assert.equal(previewPhotoCaptureAt(goldenMission, 7.49, true), 'wp-1')
  assert.equal(previewPhotoCaptureAt(goldenMission, 7.5, true), null)
  assert.equal(previewPhotoCaptureAt(goldenMission, 6, false), null)
  assert.deepEqual(previewPositionAt(goldenMission, 6.5, false), { x: 3, y: 0, z: 10 })
})

const round4 = (value) => {
  const rounded = Math.round(value * 1e4) / 1e4
  return Object.is(rounded, -0) ? 0 : rounded
}

const roundDeep = (value) => {
  if (typeof value === 'number') return round4(value)
  if (Array.isArray(value)) return value.map(roundDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, roundDeep(item)]))
  }
  return value
}

const planBaseline = (plan) => ({
  duration: round4(plan.duration),
  totalDist: round4(plan.totalDist),
  failedAtSeq: plan.failedAtSeq,
  legs: plan.legs.map((leg) => [
    round4(leg.ax), round4(leg.ay), round4(leg.az),
    round4(leg.bx), round4(leg.by), round4(leg.bz),
    round4(leg.len), round4(leg.t0), round4(leg.t1), round4(leg.dwell), leg.seq
  ]),
  events: plan.events.map(({ t, kind, seq, waypointId, actionKind }) => [
    round4(t), kind, seq ?? null, waypointId ?? null, actionKind ?? null
  ])
})

const telemetryAtTime = (mission, plan, time) => (
  roundDeep(telemetryAt(plan, mission.spawn, time, 'running'))
)

const firstArrival = (plan) => plan.events.find((event) => event.kind === 'waypoint').t

const startTelemetry = {
  t: 0,
  pos: { x: 0, y: 0, z: 0 },
  yawDeg: 0,
  rollDeg: 0,
  pitchDeg: -2.3,
  altM: 0,
  speedMS: 2,
  batteryPct: 100,
  homeDistM: 0,
  mode: 'AUTO · MISSION',
  signal: 'RTK Fixed',
  moving: true,
  targetSeq: null
}

const fixtureMission = (id, overrides = {}) => ({
  id,
  name: id,
  world: 'Blank space',
  worldType: '3D',
  vehicle: 'Drone x500 Livox Mid 360',
  spawn: { x: 0, y: 0 },
  takeoffAltM: 10,
  targetSpeedMS: 2,
  returnHomeOnEnd: false,
  cameraSafetyCheck: true,
  routes: [],
  sequenceOrder: [],
  waypoints: [],
  areas: [],
  avoids: [],
  ...overrides
})

const areaOnlyMission = fixtureMission('area-only', {
  sequenceOrder: [{ type: 'area', id: 'area-1' }],
  areas: [{
    id: 'area-1',
    label: 'Area 1',
    points: [{ x: 10, y: -4 }, { x: 22, y: -4 }, { x: 22, y: 4 }, { x: 10, y: 4 }],
    lineSpacingM: 4,
    scanLines: [
      [{ x: 10, y: -2 }, { x: 20, y: -2 }],
      [{ x: 20, y: 2 }, { x: 10, y: 2 }]
    ]
  }],
  waypoints: [
    { id: 'aw-1', seq: 1, x: 10, y: -2, z: 10, generatedByArea: 'area-1', actions: [{ id: 'a-photo', kind: 'photo', label: 'Photo' }] },
    { id: 'aw-2', seq: 2, x: 20, y: -2, z: 10, generatedByArea: 'area-1', actions: [{ id: 'a-lidar', kind: 'lidar-scan', label: 'LiDAR scan' }] },
    { id: 'aw-3', seq: 3, x: 20, y: 2, z: 10, generatedByArea: 'area-1', actions: [{ id: 'a-video', kind: 'video-start', label: 'Camera Start recording' }] },
    { id: 'aw-4', seq: 4, x: 10, y: 2, z: 10, generatedByArea: 'area-1', actions: [] }
  ]
})

const mixedMission = fixtureMission('mixed', {
  returnHomeOnEnd: true,
  routes: [{ id: 'route-1', label: 'Route 1', targetSpeedMS: 2 }],
  sequenceOrder: [{ type: 'route', id: 'route-1' }, { type: 'area', id: 'area-2' }],
  areas: [{
    id: 'area-2',
    label: 'Area 2',
    points: [{ x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 18 }, { x: 0, y: 18 }],
    lineSpacingM: 4,
    scanLines: [[{ x: 6, y: 12 }, { x: 6, y: 16 }]]
  }],
  waypoints: [
    { id: 'm-wp-1', seq: 1, x: 2, y: 0, z: 10, routeId: 'route-1', actions: [{ id: 'm-photo', kind: 'photo', label: 'Photo' }] },
    { id: 'm-wp-2', seq: 2, x: 8, y: 0, z: 10, routeId: 'route-1', actions: [] },
    { id: 'm-aw-1', seq: 3, x: 6, y: 12, z: 10, generatedByArea: 'area-2', actions: [{ id: 'm-lidar', kind: 'lidar-scan', label: 'LiDAR scan' }] },
    { id: 'm-aw-2', seq: 4, x: 6, y: 16, z: 10, generatedByArea: 'area-2', actions: [] }
  ]
})

const blockedMission = fixtureMission('blocked', {
  routes: [{ id: 'route-1', label: 'Route 1', targetSpeedMS: 2 }],
  sequenceOrder: [{ type: 'route', id: 'route-1' }, { type: 'area', id: 'area-3' }],
  areas: [{
    id: 'area-3',
    label: 'Area 3',
    points: [{ x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 18 }, { x: 0, y: 18 }],
    lineSpacingM: 4,
    scanLines: [[{ x: 6, y: 12 }, { x: 6, y: 16 }]]
  }],
  waypoints: [
    { id: 'b-wp-1', seq: 1, x: 2, y: 0, z: 10, routeId: 'route-1', actions: [] },
    { id: 'b-wp-2', seq: 2, x: 8, y: 0, z: 10, routeId: 'route-1', actions: [] },
    { id: 'b-aw-1', seq: 3, x: 6, y: 12, z: 10, generatedByArea: 'area-3', actions: [] }
  ],
  avoids: [{
    id: 'avoid-1',
    label: 'Blocking tower',
    type: 'obstacle',
    points: [{ x: 4, y: 8 }, { x: 8, y: 8 }, { x: 8, y: 14 }, { x: 4, y: 14 }],
    heightM: 30,
    baseAltM: 0
  }]
})

test('area-only simulation and return-home landing match golden plan data', () => {
  const plan = buildSimPlan(areaOnlyMission)
  assert.ok(plan)
  assert.deepEqual(planBaseline(plan), {
    duration: 30.599,
    totalDist: 54.198,
    failedAtSeq: 0,
    legs: [
      [0, 0, 0, 0, 0, 10, 10, 0, 5, 0, null],
      [0, 0, 10, 10, -2, 10, 10.198, 5, 10.099, 0, null],
      [10, -2, 10, 10, -2, 10, 0, 10.099, 10.099, 1.5, 1],
      [10, -2, 10, 20, -2, 10, 10, 11.599, 16.599, 2, 2],
      [20, -2, 10, 20, 2, 10, 4, 18.599, 20.599, 0, 3],
      [20, 2, 10, 10, 2, 10, 10, 20.599, 25.599, 0, 4],
      [10, 2, 10, 10, 2, 0, 10, 25.599, 30.599, 0, null]
    ],
    events: [
      [0, 'takeoff', null, null, null],
      [10.099, 'waypoint', 1, 'aw-1', null],
      [10.099, 'action', 1, 'aw-1', 'photo'],
      [16.599, 'waypoint', 2, 'aw-2', null],
      [16.599, 'action', 2, 'aw-2', 'lidar-scan'],
      [20.599, 'waypoint', 3, 'aw-3', null],
      [20.599, 'action', 3, 'aw-3', 'video-start'],
      [25.599, 'waypoint', 4, 'aw-4', null],
      [30.599, 'land', null, null, null],
      [30.599, 'complete', null, null, null]
    ]
  })
  assert.deepEqual(telemetryAtTime(areaOnlyMission, plan, 0), startTelemetry)
  assert.deepEqual(telemetryAtTime(areaOnlyMission, plan, firstArrival(plan)), {
    t: 10.099,
    pos: { x: 10, y: -2, z: 10 },
    yawDeg: 101.3,
    rollDeg: 2.1,
    pitchDeg: -4.5,
    altM: 10,
    speedMS: 2,
    batteryPct: 87.5,
    homeDistM: 10.2,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })
  assert.deepEqual(telemetryAtTime(areaOnlyMission, plan, plan.duration), {
    t: 30.599,
    pos: { x: 10, y: 2, z: 0 },
    yawDeg: 0,
    rollDeg: 1.6,
    pitchDeg: -5.1,
    altM: 0,
    speedMS: 2,
    batteryPct: 62,
    homeDistM: 10.2,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })

  const returnHomeMission = { ...areaOnlyMission, returnHomeOnEnd: true }
  const returnHomePlan = buildSimPlan(returnHomeMission)
  assert.ok(returnHomePlan)
  assert.deepEqual(planBaseline(returnHomePlan), {
    duration: 35.698,
    totalDist: 64.3961,
    failedAtSeq: 0,
    legs: [
      [0, 0, 0, 0, 0, 10, 10, 0, 5, 0, null],
      [0, 0, 10, 10, -2, 10, 10.198, 5, 10.099, 0, null],
      [10, -2, 10, 10, -2, 10, 0, 10.099, 10.099, 1.5, 1],
      [10, -2, 10, 20, -2, 10, 10, 11.599, 16.599, 2, 2],
      [20, -2, 10, 20, 2, 10, 4, 18.599, 20.599, 0, 3],
      [20, 2, 10, 10, 2, 10, 10, 20.599, 25.599, 0, 4],
      [10, 2, 10, 0, 0, 10, 10.198, 25.599, 30.698, 0, null],
      [0, 0, 10, 0, 0, 0, 10, 30.698, 35.698, 0, null]
    ],
    events: [
      [0, 'takeoff', null, null, null],
      [10.099, 'waypoint', 1, 'aw-1', null],
      [10.099, 'action', 1, 'aw-1', 'photo'],
      [16.599, 'waypoint', 2, 'aw-2', null],
      [16.599, 'action', 2, 'aw-2', 'lidar-scan'],
      [20.599, 'waypoint', 3, 'aw-3', null],
      [20.599, 'action', 3, 'aw-3', 'video-start'],
      [25.599, 'waypoint', 4, 'aw-4', null],
      [25.599, 'rtl', null, null, null],
      [35.698, 'land', null, null, null],
      [35.698, 'complete', null, null, null]
    ]
  })
  assert.deepEqual(telemetryAtTime(returnHomeMission, returnHomePlan, returnHomePlan.duration), {
    t: 35.698,
    pos: { x: 0, y: 0, z: 0 },
    yawDeg: 0,
    rollDeg: -0.4,
    pitchDeg: -4,
    altM: 0,
    speedMS: 2,
    batteryPct: 62,
    homeDistM: 0,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })
})

test('mixed Route/Area transfer sequence matches golden plan data with return home', () => {
  const plan = buildSimPlan(mixedMission)
  assert.ok(plan)
  assert.deepEqual(planBaseline(plan), {
    duration: 34.1268,
    totalDist: 61.2535,
    failedAtSeq: 0,
    legs: [
      [0, 0, 0, 0, 0, 10, 10, 0, 5, 0, null],
      [0, 0, 10, 2, 0, 10, 2, 5, 6, 0, null],
      [2, 0, 10, 2, 0, 10, 0, 6, 6, 1.5, 1],
      [2, 0, 10, 8, 0, 10, 6, 7.5, 10.5, 0, 2],
      [8, 0, 10, 6, 12, 10, 12.1655, 10.5, 16.5828, 0, null],
      [6, 12, 10, 6, 12, 10, 0, 16.5828, 16.5828, 2, 3],
      [6, 12, 10, 6, 16, 10, 4, 18.5828, 20.5828, 0, 4],
      [6, 16, 10, 0, 0, 10, 17.088, 20.5828, 29.1268, 0, null],
      [0, 0, 10, 0, 0, 0, 10, 29.1268, 34.1268, 0, null]
    ],
    events: [
      [0, 'takeoff', null, null, null],
      [6, 'waypoint', 1, 'm-wp-1', null],
      [6, 'action', 1, 'm-wp-1', 'photo'],
      [10.5, 'waypoint', 2, 'm-wp-2', null],
      [10.5, 'info', null, null, null],
      [16.5828, 'waypoint', 3, 'm-aw-1', null],
      [16.5828, 'action', 3, 'm-aw-1', 'lidar-scan'],
      [20.5828, 'waypoint', 4, 'm-aw-2', null],
      [20.5828, 'rtl', null, null, null],
      [34.1268, 'land', null, null, null],
      [34.1268, 'complete', null, null, null]
    ]
  })
  assert.deepEqual(telemetryAtTime(mixedMission, plan, 0), startTelemetry)
  assert.deepEqual(telemetryAtTime(mixedMission, plan, firstArrival(plan)), {
    t: 6,
    pos: { x: 2, y: 0, z: 10 },
    yawDeg: 90,
    rollDeg: -2.6,
    pitchDeg: -5.5,
    altM: 10,
    speedMS: 2,
    batteryPct: 93.3,
    homeDistM: 2,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })
  assert.deepEqual(telemetryAtTime(mixedMission, plan, plan.duration), {
    t: 34.1268,
    pos: { x: 0, y: 0, z: 0 },
    yawDeg: 0,
    rollDeg: -2.8,
    pitchDeg: -5.4,
    altM: 0,
    speedMS: 2,
    batteryPct: 62,
    homeDistM: 0,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })

  const noReturnMission = { ...mixedMission, returnHomeOnEnd: false }
  const noReturnPlan = buildSimPlan(noReturnMission)
  assert.ok(noReturnPlan)
  assert.deepEqual(planBaseline(noReturnPlan), {
    duration: 25.5828,
    totalDist: 44.1655,
    failedAtSeq: 0,
    legs: [
      [0, 0, 0, 0, 0, 10, 10, 0, 5, 0, null],
      [0, 0, 10, 2, 0, 10, 2, 5, 6, 0, null],
      [2, 0, 10, 2, 0, 10, 0, 6, 6, 1.5, 1],
      [2, 0, 10, 8, 0, 10, 6, 7.5, 10.5, 0, 2],
      [8, 0, 10, 6, 12, 10, 12.1655, 10.5, 16.5828, 0, null],
      [6, 12, 10, 6, 12, 10, 0, 16.5828, 16.5828, 2, 3],
      [6, 12, 10, 6, 16, 10, 4, 18.5828, 20.5828, 0, 4],
      [6, 16, 10, 6, 16, 0, 10, 20.5828, 25.5828, 0, null]
    ],
    events: [
      [0, 'takeoff', null, null, null],
      [6, 'waypoint', 1, 'm-wp-1', null],
      [6, 'action', 1, 'm-wp-1', 'photo'],
      [10.5, 'waypoint', 2, 'm-wp-2', null],
      [10.5, 'info', null, null, null],
      [16.5828, 'waypoint', 3, 'm-aw-1', null],
      [16.5828, 'action', 3, 'm-aw-1', 'lidar-scan'],
      [20.5828, 'waypoint', 4, 'm-aw-2', null],
      [25.5828, 'land', null, null, null],
      [25.5828, 'complete', null, null, null]
    ]
  })
  assert.deepEqual(telemetryAtTime(noReturnMission, noReturnPlan, noReturnPlan.duration), {
    t: 25.5828,
    pos: { x: 6, y: 16, z: 0 },
    yawDeg: 0,
    rollDeg: -2.4,
    pitchDeg: -2.1,
    altM: 0,
    speedMS: 2,
    batteryPct: 62,
    homeDistM: 17.1,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })
})

test('transfer blocked by Avoid produces no simulation plan', () => {
  const transfers = computeDerivedTransfers(blockedMission)
  assert.equal(transfers.length, 1)
  assert.equal(transfers[0].blockedByAvoidId, 'avoid-1')
  assert.match(transfers[0].errorMessage, /Avoid volume/)
  assert.equal(buildSimPlan(blockedMission), null)
})

test('photo-dwell bypass shortens Area and mixed plan timing without moving legs', () => {
  const areaPlan = buildSimPlan(areaOnlyMission, { includePhotoCaptureDwell: false })
  assert.ok(areaPlan)
  assert.deepEqual(planBaseline(areaPlan), {
    duration: 29.099,
    totalDist: 54.198,
    failedAtSeq: 0,
    legs: [
      [0, 0, 0, 0, 0, 10, 10, 0, 5, 0, null],
      [0, 0, 10, 10, -2, 10, 10.198, 5, 10.099, 0, null],
      [10, -2, 10, 10, -2, 10, 0, 10.099, 10.099, 0, 1],
      [10, -2, 10, 20, -2, 10, 10, 10.099, 15.099, 2, 2],
      [20, -2, 10, 20, 2, 10, 4, 17.099, 19.099, 0, 3],
      [20, 2, 10, 10, 2, 10, 10, 19.099, 24.099, 0, 4],
      [10, 2, 10, 10, 2, 0, 10, 24.099, 29.099, 0, null]
    ],
    events: [
      [0, 'takeoff', null, null, null],
      [10.099, 'waypoint', 1, 'aw-1', null],
      [10.099, 'action', 1, 'aw-1', 'photo'],
      [15.099, 'waypoint', 2, 'aw-2', null],
      [15.099, 'action', 2, 'aw-2', 'lidar-scan'],
      [19.099, 'waypoint', 3, 'aw-3', null],
      [19.099, 'action', 3, 'aw-3', 'video-start'],
      [24.099, 'waypoint', 4, 'aw-4', null],
      [29.099, 'land', null, null, null],
      [29.099, 'complete', null, null, null]
    ]
  })
  assert.deepEqual(telemetryAtTime(areaOnlyMission, areaPlan, 0), startTelemetry)
  assert.deepEqual(telemetryAtTime(areaOnlyMission, areaPlan, firstArrival(areaPlan)), {
    t: 10.099,
    pos: { x: 10, y: -2, z: 10 },
    yawDeg: 101.3,
    rollDeg: 2.1,
    pitchDeg: -4.5,
    altM: 10,
    speedMS: 2,
    batteryPct: 86.8,
    homeDistM: 10.2,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })
  assert.deepEqual(telemetryAtTime(areaOnlyMission, areaPlan, areaPlan.duration), {
    t: 29.099,
    pos: { x: 10, y: 2, z: 0 },
    yawDeg: 0,
    rollDeg: 3,
    pitchDeg: -3.7,
    altM: 0,
    speedMS: 2,
    batteryPct: 62,
    homeDistM: 10.2,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })

  const mixedPlan = buildSimPlan(mixedMission, { includePhotoCaptureDwell: false })
  assert.ok(mixedPlan)
  assert.deepEqual(planBaseline(mixedPlan), {
    duration: 32.6268,
    totalDist: 61.2535,
    failedAtSeq: 0,
    legs: [
      [0, 0, 0, 0, 0, 10, 10, 0, 5, 0, null],
      [0, 0, 10, 2, 0, 10, 2, 5, 6, 0, null],
      [2, 0, 10, 2, 0, 10, 0, 6, 6, 0, 1],
      [2, 0, 10, 8, 0, 10, 6, 6, 9, 0, 2],
      [8, 0, 10, 6, 12, 10, 12.1655, 9, 15.0828, 0, null],
      [6, 12, 10, 6, 12, 10, 0, 15.0828, 15.0828, 2, 3],
      [6, 12, 10, 6, 16, 10, 4, 17.0828, 19.0828, 0, 4],
      [6, 16, 10, 0, 0, 10, 17.088, 19.0828, 27.6268, 0, null],
      [0, 0, 10, 0, 0, 0, 10, 27.6268, 32.6268, 0, null]
    ],
    events: [
      [0, 'takeoff', null, null, null],
      [6, 'waypoint', 1, 'm-wp-1', null],
      [6, 'action', 1, 'm-wp-1', 'photo'],
      [9, 'waypoint', 2, 'm-wp-2', null],
      [9, 'info', null, null, null],
      [15.0828, 'waypoint', 3, 'm-aw-1', null],
      [15.0828, 'action', 3, 'm-aw-1', 'lidar-scan'],
      [19.0828, 'waypoint', 4, 'm-aw-2', null],
      [19.0828, 'rtl', null, null, null],
      [32.6268, 'land', null, null, null],
      [32.6268, 'complete', null, null, null]
    ]
  })
  assert.deepEqual(telemetryAtTime(mixedMission, mixedPlan, 0), startTelemetry)
  assert.deepEqual(telemetryAtTime(mixedMission, mixedPlan, firstArrival(mixedPlan)), {
    t: 6,
    pos: { x: 2, y: 0, z: 10 },
    yawDeg: 90,
    rollDeg: -2.6,
    pitchDeg: -5.5,
    altM: 10,
    speedMS: 2,
    batteryPct: 93,
    homeDistM: 2,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })
  assert.deepEqual(telemetryAtTime(mixedMission, mixedPlan, mixedPlan.duration), {
    t: 32.6268,
    pos: { x: 0, y: 0, z: 0 },
    yawDeg: 0,
    rollDeg: -2.2,
    pitchDeg: -6,
    altM: 0,
    speedMS: 2,
    batteryPct: 62,
    homeDistM: 0,
    mode: 'AUTO · MISSION',
    signal: 'RTK Fixed',
    moving: true,
    targetSeq: null
  })
})
