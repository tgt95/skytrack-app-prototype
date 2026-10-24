const test = require('node:test')
const assert = require('node:assert/strict')
const {
  SCENE_ENTITY_LAYERS,
  removeSceneEntitiesInLayer,
  sceneEntityIdsInLayer,
  sceneEntityLayer
} = require('../src/modules/scene/scene-entity-ownership.ts')

test('mission entity IDs map to their declared scene layer', () => {
  assert.deepEqual(SCENE_ENTITY_LAYERS, [
    'committed', 'draft', 'capture', 'preview', 'guide', 'search'
  ])

  const expected = [
    ['ms-home-point', 'committed'],
    ['ms-grid-x', 'committed'],
    ['ms-area-a1', 'committed'],
    ['ms-avoid-a1', 'committed'],
    ['ms-route-r1', 'committed'],
    ['ms-transfer-t1', 'committed'],
    ['ms-wp-wp1', 'committed'],
    ['ms-vehicle', 'committed'],
    ['ms-draw-plane', 'draft'],
    ['ms-pending-point', 'draft'],
    ['ms-photo-rays-wp1', 'capture'],
    ['ms-camera-footprint-wp1', 'capture'],
    ['ms-preview-scan-ray-0', 'preview'],
    ['ms-waypoint-ground-guide', 'guide'],
    ['ms-search-result', 'search']
  ]

  for (const [id, layer] of expected) assert.equal(sceneEntityLayer(id), layer, id)
  assert.equal(sceneEntityLayer('ms-unregistered-layer-entity'), null)
  assert.equal(sceneEntityLayer('unrelated-widget'), null)
})

test('replacing one layer removes only its entities and snapshots the collection', () => {
  const entities = [
    { id: 'ms-wp-wp1' },
    { id: 'ms-route-r1' },
    { id: 'ms-pending-point' },
    { id: 'ms-photo-rays-wp1' },
    { id: 'ms-search-result' },
    { id: 'unrelated-widget' }
  ]
  const collection = {
    get values() { return entities },
    remove(entity) {
      const index = entities.indexOf(entity)
      if (index < 0) return false
      entities.splice(index, 1)
      return true
    }
  }

  assert.deepEqual(removeSceneEntitiesInLayer(collection, 'committed'), ['ms-wp-wp1', 'ms-route-r1'])
  assert.deepEqual(sceneEntityIdsInLayer(entities.map(({ id }) => id), 'draft'), ['ms-pending-point'])
  assert.deepEqual(entities.map(({ id }) => id), [
    'ms-pending-point', 'ms-photo-rays-wp1', 'ms-search-result', 'unrelated-widget'
  ])
})
