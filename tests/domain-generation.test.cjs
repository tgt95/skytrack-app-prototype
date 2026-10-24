const test = require('node:test')
const assert = require('node:assert/strict')
const { emptyMission } = require('../src/domain/mission-model.ts')
const { regenerateAreaWaypoints } = require('../src/domain/mission-generation.ts')

function fixtureMission() {
  return {
    ...emptyMission(),
    id: 'mission-fixture',
    routes: [{ id: 'route-1', label: 'Route', targetSpeedMS: 2 }],
    sequenceOrder: [
      { type: 'route', id: 'route-1' },
      { type: 'area', id: 'area-1' }
    ],
    waypoints: [{
      id: 'wp-authored',
      seq: 1,
      x: -8,
      y: -4,
      z: 22,
      routeId: 'route-1',
      actions: []
    }],
    areas: [{
      id: 'area-1',
      label: 'Area 1',
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 30 },
        { x: 0, y: 30 }
      ],
      lineSpacingM: 6,
      orientationDeg: 0,
      paddingM: 0,
      baseAltM: 0
    }]
  }
}

function idFactory() {
  const counters = new Map()
  return (prefix) => {
    const next = (counters.get(prefix) ?? 0) + 1
    counters.set(prefix, next)
    return `${prefix}-fixed-${next}`
  }
}

test('regeneration keeps authored waypoints and places generated Area points in sequence', () => {
  const source = fixtureMission()
  const result = regenerateAreaWaypoints(source, { idFactory: idFactory() })
  const generated = result.waypoints.filter((waypoint) => waypoint.generatedByArea === 'area-1')

  assert.ok(result.areas[0].scanLines.length > 0)
  assert.ok(generated.length > 0)
  assert.equal(result.waypoints[0].id, 'wp-authored')
  assert.deepEqual(
    (({ id, x, y, z, routeId, actions }) => ({ id, x, y, z, routeId, actions }))(result.waypoints[0]),
    (({ id, x, y, z, routeId, actions }) => ({ id, x, y, z, routeId, actions }))(source.waypoints[0])
  )
  assert.ok(generated.every((waypoint) => waypoint.id.startsWith('wp-fixed-')))
  assert.ok(generated.every((waypoint) => waypoint.actions.some((action) => action.kind === 'photo')))
})

test('regeneration reuses generated waypoint IDs at unchanged positions', () => {
  const first = regenerateAreaWaypoints(fixtureMission(), { idFactory: idFactory() })
  const second = regenerateAreaWaypoints(first, { idFactory: () => 'unexpected-new-id' })
  const ids = (mission) => mission.waypoints
    .filter((waypoint) => waypoint.generatedByArea === 'area-1')
    .map((waypoint) => waypoint.id)

  assert.deepEqual(ids(second), ids(first))
})
