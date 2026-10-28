const test = require('node:test')
const assert = require('node:assert/strict')
const {
  clampSnapRuler,
  RULER_MAX,
  RULER_MIN,
  RULER_STEP
} = require('../src/features/design/drawing/drawing-altitude-utils.ts')

test('drawing altitude ruler keeps bounds, half-meter step, and non-finite fallback', () => {
  assert.equal(RULER_MIN, 0)
  assert.equal(RULER_MAX, 500)
  assert.equal(RULER_STEP, 0.5)
  assert.equal(clampSnapRuler(-10), 0)
  assert.equal(clampSnapRuler(501), 500)
  assert.equal(clampSnapRuler(12.24), 12)
  assert.equal(clampSnapRuler(12.26), 12.5)
  assert.equal(clampSnapRuler(Number.NaN), 2)
  assert.equal(clampSnapRuler(Number.POSITIVE_INFINITY), 2)
})
