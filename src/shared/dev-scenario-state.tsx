import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export const DEV_SCENARIO_IDS = {
  restartToUpdate: 'restart-to-update',
} as const

type DevScenarioState = {
  enabled: boolean
  enabledScenarioIds: ReadonlySet<string>
  setScenarioEnabled: (scenarioId: string, enabled: boolean) => void
}

const DevScenarioContext = createContext<DevScenarioState | null>(null)
const EMPTY_SCENARIO_IDS: ReadonlySet<string> = new Set()

export function DevScenarioProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  const [enabledScenarioIds, setEnabledScenarioIds] =
    useState<ReadonlySet<string>>(EMPTY_SCENARIO_IDS)

  const setScenarioEnabled = useCallback(
    (scenarioId: string, isEnabled: boolean) => {
      if (!enabled) return

      setEnabledScenarioIds((currentIds) => {
        if (currentIds.has(scenarioId) === isEnabled) return currentIds

        const nextIds = new Set(currentIds)
        if (isEnabled) nextIds.add(scenarioId)
        else nextIds.delete(scenarioId)
        return nextIds
      })
    },
    [enabled],
  )

  const value = useMemo(
    () => ({ enabled, enabledScenarioIds, setScenarioEnabled }),
    [enabled, enabledScenarioIds, setScenarioEnabled],
  )

  return (
    <DevScenarioContext.Provider value={value}>
      {children}
    </DevScenarioContext.Provider>
  )
}

export function useDevScenarioEnabled(scenarioId: string): boolean {
  const state = useContext(DevScenarioContext)
  return Boolean(state?.enabled && state.enabledScenarioIds.has(scenarioId))
}

export function useDevScenarioControls(): DevScenarioState {
  const state = useContext(DevScenarioContext)
  if (state) return state

  return {
    enabled: false,
    enabledScenarioIds: EMPTY_SCENARIO_IDS,
    setScenarioEnabled: () => undefined,
  }
}
