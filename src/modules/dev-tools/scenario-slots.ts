import type { DevScenarioSlotId } from './types'

export const DEV_SCENARIO_SLOTS = {
  libraryTopbarActions: 'library.topbar.actions',
} as const satisfies Record<string, DevScenarioSlotId>
