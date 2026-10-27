const test = require('node:test')
const assert = require('node:assert/strict')
const { emptyMission, snapshotOf } = require('../src/domain/mission-model.ts')
const {
  emptyStudioMissionDocument,
  isMissionDocumentDirty,
  studioMissionReducer
} = require('../src/features/studio/mission-document.ts')

test('commit, undo, redo, and save keep mission snapshots and dirty state consistent', () => {
  const base = emptyMission()
  const baseSnapshot = snapshotOf(base)
  let document = { ...emptyStudioMissionDocument(), mission: base, savedSnap: baseSnapshot }
  const edited = { ...base, name: 'Edited mission' }

  document = studioMissionReducer(document, { type: 'commit', next: edited })
  assert.deepEqual(document.past, [baseSnapshot])
  assert.equal(isMissionDocumentDirty(document), true)

  const committed = document
  document = studioMissionReducer(document, { type: 'commit', next: edited })
  assert.equal(document, committed, 'identical commit must not create history')

  document = studioMissionReducer(document, { type: 'undo', restored: base })
  assert.equal(document.mission.name, base.name)
  assert.equal(document.future[0], snapshotOf(edited))
  assert.equal(isMissionDocumentDirty(document), false)

  document = studioMissionReducer(document, { type: 'redo', restored: edited })
  assert.equal(document.mission.name, edited.name)
  assert.equal(isMissionDocumentDirty(document), true)

  document = studioMissionReducer(document, { type: 'markSaved', saved: edited })
  assert.equal(isMissionDocumentDirty(document), false)
  assert.equal(document.past.length, 1)
})

test('preview commit stores the pre-preview snapshot as the undo entry', () => {
  const base = emptyMission()
  const baseSnapshot = snapshotOf(base)
  let document = { ...emptyStudioMissionDocument(), mission: base, savedSnap: baseSnapshot }
  document = studioMissionReducer(document, { type: 'set', next: { ...base, name: 'Preview' } })
  const finalMission = { ...base, name: 'Final' }
  document = studioMissionReducer(document, {
    type: 'commit',
    next: finalMission,
    from: baseSnapshot
  })

  assert.equal(document.mission.name, 'Final')
  assert.deepEqual(document.past, [baseSnapshot])
})

test('Library and mission routes round-trip encoded identifiers under a base path', () => {
  const { missionStudioRoutePath, parseMissionStudioRoute } = require('../src/features/library/router.ts')
  const projectRoute = { kind: 'library', section: 'projects', projectId: 'team space/alpha' }
  const missionRoute = { kind: 'mission', missionId: 'mission / 1' }

  for (const route of [projectRoute, missionRoute]) {
    const path = missionStudioRoutePath(route, '/prototype/')
    assert.deepEqual(parseMissionStudioRoute(path, '/prototype/'), route)
  }
  assert.deepEqual(parseMissionStudioRoute('/wrong-base/projects/a', '/prototype/'), {
    kind: 'not-found', pathname: '/wrong-base/projects/a'
  })
})
