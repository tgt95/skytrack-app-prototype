import { useDevScenarioControls } from '../../shared/dev-scenario-state'
import { DEV_SCENARIOS } from './scenario-registry'
import type { DevScenarioSlotId } from './types'

export default function DevScenarioSlot({
  name,
  onAnnounce,
}: {
  name: DevScenarioSlotId
  onAnnounce: (message: string) => void
}) {
  const { enabledScenarioIds } = useDevScenarioControls()

  return DEV_SCENARIOS.map((scenario) => {
    if (
      scenario.slot !== name ||
      !enabledScenarioIds.has(scenario.id) ||
      !scenario.action
    ) {
      return null
    }

    const ScenarioAction = scenario.action
    return <ScenarioAction key={scenario.id} onAnnounce={onAnnounce} />
  })
}
