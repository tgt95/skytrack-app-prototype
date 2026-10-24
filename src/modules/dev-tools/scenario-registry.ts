import restartToUpdateScenario from './scenarios/restart-to-update/definition'
import type { DevScenarioDefinition } from './types'

function registerScenarios(
  scenarios: readonly DevScenarioDefinition[],
): readonly DevScenarioDefinition[] {
  const ids = new Set<string>()

  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) {
      throw new Error(`Duplicate Dev Tool scenario ID: ${scenario.id}`)
    }
    ids.add(scenario.id)
  }

  return Object.freeze([...scenarios])
}

export const DEV_SCENARIOS = registerScenarios([restartToUpdateScenario])
