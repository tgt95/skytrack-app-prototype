const test = require('node:test')
const assert = require('node:assert/strict')
const {
  checkRepository,
  dependencyViolations,
  lineBudgetViolations
} = require('../scripts/architecture-guardrails.cjs')

test('current repository passes AST dependency and size guardrails', () => {
  const { violations } = checkRepository()
  assert.deepEqual(violations, [])
})

test('dependency guard accepts pure domain and shared UI/helper-to-domain imports', () => {
  assert.deepEqual(dependencyViolations('src/domain/example.ts', "import { point } from './mission-types'\n"), [])
  assert.deepEqual(dependencyViolations('src/shared/example.tsx', "import { type StudioMission } from '../domain/mission-model'\nimport React from 'react'\nimport { Button } from 'skytrack-ui/button'\n"), [])
  assert.deepEqual(dependencyViolations('src/ui/components/example.tsx', "import { type StudioMission } from '../../domain/mission-model'\nimport React from 'react'\n"), [])
})

test('dependency guard rejects domain framework/feature imports and shared feature imports', () => {
  assert.equal(dependencyViolations('src/domain/example.ts', "import React from 'react'\n").length, 1)
  assert.equal(dependencyViolations('src/domain/example.ts', "import { feature } from '../features/studio/feature'\n").length, 1)
  assert.equal(dependencyViolations('src/shared/example.ts', "export { feature } from '../features/studio/feature'\n").length, 1)
  assert.equal(dependencyViolations('src/shared/example.ts', "const feature = import('src/features/studio/feature')\n").length, 1)
  assert.equal(dependencyViolations('src/ui/components/example.tsx', "export { feature } from '../../features/studio/feature'\n").length, 1)
})

test('file-size guard blocks new crossings and growth, and requires stale exceptions to be removed', () => {
  const config = {
    targets: { uiComponent: 400, domainAndHook: 450, imperativeScene: 500, persistence: 500 },
    exceptions: [{ path: 'src/features/scene/cohesive.ts', maxLines: 510, why: 'One cohesive scene lifecycle.' }]
  }
  assert.deepEqual(lineBudgetViolations({
    'src/features/design/field.tsx': 400,
    'src/features/scene/cohesive.ts': 510
  }, config), [])
  assert.match(lineBudgetViolations({ 'src/features/design/new.tsx': 401 }, config)[0], /exceeds uiComponent target 400/)
  assert.match(lineBudgetViolations({ 'src/features/scene/cohesive.ts': 511 }, config)[0], /exceeds its reviewed ceiling 510/)
  assert.match(lineBudgetViolations({ 'src/features/scene/cohesive.ts': 500 }, config)[0], /stale size exception/)
})
