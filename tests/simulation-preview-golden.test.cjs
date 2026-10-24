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

const { applyMockFailure, buildSimPlan, samplePlan, telemetryAt } = require('../src/modules/simulation/simulation.ts')
const { previewPhotoCaptureAt, previewPositionAt } = require('../src/modules/simulation/mission-preview.tsx')
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
