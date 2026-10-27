const test = require('node:test')
const assert = require('node:assert/strict')
const { resolveEscapeCaptureAction } = require('../src/features/studio/use-mission-keyboard.ts')

test('Escape cancels an active edit drag before an unfinished drawing', () => {
  assert.equal(resolveEscapeCaptureAction({
    typing: false,
    overlayOpen: false,
    hasActiveEditDrag: true,
    drawingActive: true
  }), 'cancel-edit')
})

test('Escape keeps typing and overlay interaction ahead of edit and drawing cancellation', () => {
  assert.equal(resolveEscapeCaptureAction({
    typing: true,
    overlayOpen: false,
    hasActiveEditDrag: true,
    drawingActive: true
  }), 'continue')
  assert.equal(resolveEscapeCaptureAction({
    typing: false,
    overlayOpen: true,
    hasActiveEditDrag: true,
    drawingActive: true
  }), 'continue')
})
