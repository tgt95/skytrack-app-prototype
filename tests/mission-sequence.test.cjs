const test = require('node:test')
const assert = require('node:assert/strict')
const {
  appendMissionSequenceItem,
  emptyMission,
  getMissionRouteWaypoints,
  getMissionRoutes,
  getMissionSequence,
  normalizeMissionRoutes,
  removeMissionSequenceItem,
  reorderWaypoints,
  renumber
} = require('../src/domain/mission-model.ts')

function waypoint(id, seq, routeId) {
  return { id, x: seq, y: 0, z: 10, seq, actions: [], ...(routeId ? { routeId } : {}) }
}

function area(id) {
  return { id, label: id, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] }
}

test('legacy empty-route missions default authored points to Route 1', () => {
  const mission = {
    ...emptyMission(),
    routes: [],
    sequenceOrder: undefined,
    waypoints: [waypoint('w1', 1), waypoint('w2', 2)]
  }
  const normalized = normalizeMissionRoutes(mission)
  assert.deepEqual(getMissionRoutes(normalized), [
    { id: 'route-1', label: 'Route', targetSpeedMS: mission.targetSpeedMS }
  ])
  assert.deepEqual(normalized.waypoints.map((item) => item.routeId), ['route-1', 'route-1'])
  assert.deepEqual(getMissionSequence(normalized), [{ type: 'route', id: 'route-1' }])
  assert.deepEqual(getMissionRouteWaypoints(normalized, 'route-1').map((item) => item.id), ['w1', 'w2'])
})

test('normalization drops empty Route metadata and repairs unknown route references', () => {
  const mission = {
    ...emptyMission(),
    routes: [
      { id: 'route-1', label: 'Route', targetSpeedMS: 2 },
      { id: 'route-empty', label: 'Empty', targetSpeedMS: 2 }
    ],
    sequenceOrder: [{ type: 'route', id: 'route-1' }, { type: 'route', id: 'route-empty' }],
    waypoints: [waypoint('w1', 1, 'route-unknown')]
  }
  const normalized = normalizeMissionRoutes(mission)
  assert.deepEqual(normalized.routes.map((item) => item.id), ['route-1'])
  assert.equal(normalized.waypoints[0].routeId, 'route-1')
})

test('Area-first and Route-first sequence orders are preserved', () => {
  const mission = {
    ...emptyMission(),
    routes: [{ id: 'route-1', label: 'Route', targetSpeedMS: 2 }],
    areas: [area('area-1')],
    sequenceOrder: [{ type: 'area', id: 'area-1' }, { type: 'route', id: 'route-1' }],
    waypoints: [waypoint('w1', 1, 'route-1')]
  }
  assert.deepEqual(getMissionSequence(mission), [
    { type: 'area', id: 'area-1' },
    { type: 'route', id: 'route-1' }
  ])
  assert.deepEqual(
    getMissionSequence({
      ...mission,
      sequenceOrder: [{ type: 'route', id: 'route-1' }, { type: 'area', id: 'area-1' }]
    }),
    [{ type: 'route', id: 'route-1' }, { type: 'area', id: 'area-1' }]
  )
})

test('sequence lookup ignores duplicates and unknown ids, then appends missing blocks', () => {
  const mission = {
    ...emptyMission(),
    routes: [{ id: 'route-1', label: 'Route', targetSpeedMS: 2 }],
    areas: [area('area-1'), area('area-2')],
    sequenceOrder: [
      { type: 'area', id: 'area-1' },
      { type: 'area', id: 'area-1' },
      { type: 'route', id: 'route-1' },
      { type: 'route', id: 'missing' }
    ],
    waypoints: [waypoint('w1', 1, 'route-1')]
  }
  assert.deepEqual(getMissionSequence(mission), [
    { type: 'area', id: 'area-1' },
    { type: 'route', id: 'route-1' },
    { type: 'area', id: 'area-2' }
  ])
})

test('reorder is a no-op for missing or unchanged waypoints and renumbers moves', () => {
  const waypoints = [waypoint('w1', 1), waypoint('w2', 2), waypoint('w3', 3)]
  assert.equal(reorderWaypoints(waypoints, 'missing', 1), waypoints)
  assert.equal(reorderWaypoints(waypoints, 'w2', 1), waypoints)
  assert.deepEqual(reorderWaypoints(waypoints, 'w3', 0).map((item) => [item.id, item.seq]), [
    ['w3', 1],
    ['w1', 2],
    ['w2', 3]
  ])
  assert.deepEqual(renumber([waypoint('w1', 9)]).map((item) => item.seq), [1])
})

test('append and remove update the sequence exactly once', () => {
  const mission = {
    ...emptyMission(),
    routes: [{ id: 'route-1', label: 'Route', targetSpeedMS: 2 }],
    areas: [area('area-1')],
    sequenceOrder: [{ type: 'route', id: 'route-1' }],
    waypoints: [waypoint('w1', 1, 'route-1')]
  }
  assert.deepEqual(appendMissionSequenceItem(mission, { type: 'area', id: 'area-1' }), [
    { type: 'route', id: 'route-1' },
    { type: 'area', id: 'area-1' }
  ])
  assert.deepEqual(appendMissionSequenceItem(mission, { type: 'route', id: 'route-1' }), [
    { type: 'route', id: 'route-1' },
    { type: 'area', id: 'area-1' }
  ])
  assert.deepEqual(removeMissionSequenceItem(mission, { type: 'route', id: 'route-1' }), [
    { type: 'area', id: 'area-1' }
  ])
})
