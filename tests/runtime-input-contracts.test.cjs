const test = require('node:test')
const assert = require('node:assert/strict')
const { emptyMission, missionFromSnapshot, snapshotOf } = require('../src/domain/mission-model.ts')

function withLocalStorage(storage, run) {
  const previousLocalStorage = global.localStorage
  const previousWindow = global.window
  global.localStorage = storage
  global.window = { localStorage: storage }
  try {
    return run()
  } finally {
    if (previousLocalStorage === undefined) delete global.localStorage
    else global.localStorage = previousLocalStorage
    if (previousWindow === undefined) delete global.window
    else global.window = previousWindow
  }
}

function memoryStorage(initial = new Map()) {
  return {
    values: initial,
    getItem(key) { return this.values.get(key) ?? null },
    setItem(key, value) { this.values.set(key, String(value)) },
    removeItem(key) { this.values.delete(key) }
  }
}

test('current mission snapshots round-trip and legacy snapshots hydrate omitted optional fields', () => {
  const current = emptyMission()
  const roundTrip = missionFromSnapshot(snapshotOf(current))
  assert.equal(snapshotOf(roundTrip), snapshotOf(current))

  const legacy = { ...current }
  delete legacy.worldType
  delete legacy.origin
  delete legacy.routes
  delete legacy.sequenceOrder
  delete legacy.areas
  delete legacy.avoids
  const restored = missionFromSnapshot(JSON.stringify(legacy))

  assert.equal(restored.worldType, undefined)
  assert.equal(restored.origin, undefined)
  assert.deepEqual(restored.routes, [])
  assert.deepEqual(restored.areas, [])
  assert.deepEqual(restored.avoids, [])
})

test('mission snapshots reject malformed roots, coordinate arrays, and actions', () => {
  assert.throws(() => missionFromSnapshot('null'), /invalid shape/)
  const base = emptyMission()
  assert.throws(() => missionFromSnapshot(JSON.stringify({ ...base, waypoints: [{ id: 'bad', x: '1', y: 2, z: 3, seq: 1, actions: [] }] })), /invalid shape/)
  assert.throws(() => missionFromSnapshot(JSON.stringify({ ...base, waypoints: [{ id: 'bad', x: 1, y: 2, z: 3, seq: 1, actions: [{ id: 'a', label: 'A', kind: 'unknown' }] }] })), /invalid shape/)
  assert.throws(() => missionFromSnapshot(JSON.stringify({ ...base, areas: [{ id: 'bad', label: 'Bad area', points: [{ x: 0, y: 'NaN' }] }] })), /invalid shape/)
  assert.throws(() => missionFromSnapshot(JSON.stringify({ ...base, sequenceOrder: [{ type: 'unknown', id: 'route-1' }] })), /invalid shape/)
})

test('Library load accepts legacy metadata and rejects invalid metadata and DB versions', () => {
  const { DB_KEY, DB_VERSION, loadProjects } = require('../src/features/library/database/store.ts')
  const legacy = {
    version: DB_VERSION,
    projects: [{ id: 'legacy-project', name: 'Legacy project', missions: [{
      id: 'legacy-mission', name: 'Legacy mission', editedAgo: 'Yesterday',
      starred: false, shared: false, viewOnly: false,
      missionData: JSON.stringify({ id: 'legacy-mission', world: 'Blank space', vehicle: 'Legacy drone' })
    }] }]
  }

  withLocalStorage(memoryStorage(new Map([[DB_KEY, JSON.stringify(legacy)]])), () => {
    const loaded = loadProjects()
    assert.equal(loaded[0].id, 'legacy-project')
    assert.equal(loaded[0].workspaceId, 'tuan-workspace')
    assert.equal(loaded[0].missions[0].world, 'Blank space')
    assert.equal(loaded[0].missions[0].vehicle, 'Legacy drone')
  })

  const invalid = structuredClone(legacy)
  invalid.projects[0].missions[0].worldType = 'satellite'
  withLocalStorage(memoryStorage(new Map([[DB_KEY, JSON.stringify(invalid)]])), () => {
    assert.notEqual(loadProjects()[0].id, 'legacy-project')
  })

  withLocalStorage(memoryStorage(new Map([[DB_KEY, JSON.stringify({ ...legacy, version: DB_VERSION + 1 })]])), () => {
    assert.notEqual(loadProjects()[0].id, 'legacy-project')
  })
})

test('Library storage failures fall back to seed data and return false on save', () => {
  const { loadProjects, saveProjects } = require('../src/features/library/database/store.ts')
  const failingStorage = {
    getItem() { throw new Error('storage unavailable') },
    setItem() { throw new Error('storage unavailable') },
    removeItem() { throw new Error('storage unavailable') }
  }
  withLocalStorage(failingStorage, () => {
    assert.ok(loadProjects().length > 0)
    assert.equal(saveProjects([]), false)
  })
})

test('cloned snapshots keep payload while remapping identity and rejecting malformed JSON', () => {
  const { cloneMissionSnapshotIdentity } = require('../src/features/library/database/store.ts')
  const source = JSON.stringify({ id: 'old-id', name: 'Old name', world: 'Blank space', waypoints: [] })
  const cloned = JSON.parse(cloneMissionSnapshotIdentity(source, 'new-id', 'Copy'))
  assert.deepEqual(cloned, { id: 'new-id', name: 'Copy', world: 'Blank space', waypoints: [] })
  assert.equal(cloneMissionSnapshotIdentity('not-json', 'new-id', 'Copy'), undefined)
  assert.equal(cloneMissionSnapshotIdentity('[]', 'new-id', 'Copy'), undefined)
})
