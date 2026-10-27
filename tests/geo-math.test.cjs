const test = require('node:test')
const assert = require('node:assert/strict')
const {
  DEFAULT_MISSION_ORIGIN,
  enuToLngLat,
  lngLatToEnu,
  missionOrigin,
  polygonAreaM2
} = require('../src/domain/mission-model.ts')
const {
  enuToLngLat: sceneEnuToLngLat,
  lngLatToEnu: sceneLngLatToEnu
} = require('../src/features/scene/mission-scene-helpers.ts')

test('polygonAreaM2 keeps the shoelace contract', () => {
  assert.equal(polygonAreaM2([]), 0)
  assert.equal(polygonAreaM2([{ x: 0, y: 0 }, { x: 10, y: 0 }]), 0)
  const rectangle = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 5 },
    { x: 0, y: 5 }
  ]
  assert.equal(polygonAreaM2(rectangle), 50)
  assert.equal(polygonAreaM2([...rectangle].reverse()), 50)
  assert.equal(
    polygonAreaM2([
      { x: -12.5, y: -8 },
      { x: 7.5, y: -8 },
      { x: 7.5, y: 2 },
      { x: -12.5, y: 2 }
    ]),
    200
  )
})

test('ENU/geographic conversion keeps origin defaults, shape, and round trips', () => {
  const defaultOrigin = missionOrigin({})
  assert.deepEqual(defaultOrigin, DEFAULT_MISSION_ORIGIN)
  for (const origin of [defaultOrigin, { lat: 51.5, lng: -0.12 }, { lat: -33.86, lng: 151.2 }]) {
    for (const [x, y] of [[0, 0], [120.25, -340.5], [-87.75, 41.5]]) {
      const geo = enuToLngLat(x, y, origin)
      assert.deepEqual(Object.keys(geo), ['lng', 'lat'])
      const back = lngLatToEnu(geo.lng, geo.lat, origin)
      assert.ok(Math.abs(back.x - x) < 1e-6, `x ${back.x} != ${x}`)
      assert.ok(Math.abs(back.y - y) < 1e-6, `y ${back.y} != ${y}`)
    }
  }
})

test('scene helper compatibility exports resolve the domain conversion', () => {
  const origin = { lat: 34.0511, lng: -117.1645 }
  assert.deepEqual(sceneEnuToLngLat(12, -34, origin), enuToLngLat(12, -34, origin))
  const geo = enuToLngLat(12, -34, origin)
  assert.deepEqual(sceneLngLatToEnu(geo.lng, geo.lat, origin), lngLatToEnu(geo.lng, geo.lat, origin))
})
