const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  hasSequenceDrag,
  readSequenceDragItem,
  SEQUENCE_LIST_ITEM_CLASS,
  sequenceDropPosition,
  writeSequenceDragItem
} = require('../src/features/design/sequence/sequence-drag.ts')

const MIME = 'application/x-skytrack-sequence-item'

function fakeEvent({ data, clientY = 0, height = 100, top = 0, types = [MIME] } = {}) {
  const store = data === undefined ? {} : { [MIME]: data }
  return {
    clientY,
    currentTarget: {
      getBoundingClientRect: () => ({ top, height })
    },
    dataTransfer: {
      types,
      effectAllowed: 'all',
      getData: (type) => store[type] ?? '',
      setData: (type, value) => {
        store[type] = value
      }
    }
  }
}

test('sequence drag payload round-trips waypoint and action items with move semantics', () => {
  const waypointEvent = fakeEvent()
  writeSequenceDragItem(waypointEvent, { kind: 'waypoint', id: 'w1', routeId: 'r1' })
  assert.equal(waypointEvent.dataTransfer.effectAllowed, 'move')
  assert.deepEqual(readSequenceDragItem(waypointEvent), {
    kind: 'waypoint',
    id: 'w1',
    routeId: 'r1'
  })

  const actionEvent = fakeEvent()
  writeSequenceDragItem(actionEvent, {
    kind: 'action',
    id: 'a1',
    waypointId: 'w1',
    routeId: 'r1'
  })
  assert.deepEqual(readSequenceDragItem(actionEvent), {
    kind: 'action',
    id: 'a1',
    waypointId: 'w1',
    routeId: 'r1'
  })
})

test('sequence drag helper rejects malformed and unknown payloads', () => {
  assert.equal(readSequenceDragItem(fakeEvent({ data: '{not-json' })), null)
  assert.equal(readSequenceDragItem(fakeEvent({ data: '{"kind":"route","id":"r1"}' })), null)
  assert.equal(readSequenceDragItem(fakeEvent()), null)
})

test('sequence drag detection requires the sequence MIME type', () => {
  assert.equal(hasSequenceDrag(fakeEvent()), true)
  assert.equal(hasSequenceDrag(fakeEvent({ types: ['text/plain'] })), false)
})

test('sequence drop position splits the row at its midpoint', () => {
  assert.equal(sequenceDropPosition(fakeEvent({ clientY: 49, height: 100 })), 'before')
  assert.equal(sequenceDropPosition(fakeEvent({ clientY: 50, height: 100 })), 'after')
  assert.equal(sequenceDropPosition(fakeEvent({ clientY: 60, top: 20, height: 100 })), 'before')
})

test('sequence row modules import leaf owners instead of the compatibility barrel', () => {
  const designDir = path.join(__dirname, '..', 'src', 'features', 'design')
  for (const file of [
    'sequence/waypoint-row.tsx',
    'sequence/sequence-action-controls.tsx',
    'controls/compact-axis-field.tsx',
    'sequence/route-waypoint-list.tsx',
    'sequence/route-sequence-card.tsx',
    'sequence/sequence-transfer.tsx',
    'design-panel.tsx'
  ]) {
    const source = fs.readFileSync(path.join(designDir, file), 'utf8')
    assert.equal(source.includes('"./sequence-controls"'), false, `${file} must not import the barrel`)
  }
  assert.match(SEQUENCE_LIST_ITEM_CLASS, /^relative rounded-\[0\]/)
  assert.match(SEQUENCE_LIST_ITEM_CLASS, /first:\[border-top-left-radius:var\(--radius\)\]/)
  assert.match(SEQUENCE_LIST_ITEM_CLASS, /last:\[border-bottom-right-radius:var\(--radius\)\]/)
})
