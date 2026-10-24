import { useMemo, useState } from 'react'
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from 'skytrack-ui/drawer'
import { Input } from 'skytrack-ui/input'
import { Switch, SwitchThumb } from 'skytrack-ui/switch'
import { useDevScenarioControls } from '../../shared/dev-scenario-state'
import { DEV_SCENARIOS } from './scenario-registry'

function scenarioMatchesSearch(
  scenario: (typeof DEV_SCENARIOS)[number],
  query: string,
): boolean {
  const searchableText = [
    scenario.name,
    scenario.description,
    ...(scenario.keywords ?? []),
  ]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(query)
}

export default function DevScenarioDrawer() {
  const [query, setQuery] = useState('')
  const { enabledScenarioIds, setScenarioEnabled } = useDevScenarioControls()
  const normalizedQuery = query.trim().toLowerCase()

  const scenarios = useMemo(
    () =>
      DEV_SCENARIOS.filter((scenario) =>
        scenarioMatchesSearch(scenario, normalizedQuery),
      ),
    [normalizedQuery],
  )

  return (
    <DrawerContent className="ms-dev-tool-content">
      <header className="ms-dev-tool-header">
        <div className="ms-dev-tool-heading">
          <DrawerTitle>Dev Tool</DrawerTitle>
          <DrawerDescription>
            Search and toggle test scenarios.
          </DrawerDescription>
        </div>
        <DrawerClose
          size="icon"
          variant="ghost"
          className="ms-dev-tool-close"
          aria-label="Close Dev Tool"
        >
          <XIcon aria-hidden="true" />
        </DrawerClose>
      </header>

      <label className="ms-dev-tool-search">
        <span className="sr-only">Search scenarios</span>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search scenarios"
          startAdornment={<MagnifyingGlassIcon aria-hidden="true" />}
        />
      </label>

      <div className="ms-dev-tool-list-heading" aria-live="polite">
        {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarios'}
      </div>

      <div className="ms-dev-tool-list" role="list" aria-label="Scenarios">
        {scenarios.map((scenario) => {
          const checked = enabledScenarioIds.has(scenario.id)

          return (
            <div
              className="ms-dev-scenario-row"
              key={scenario.id}
              role="listitem"
              data-testid={`dev-scenario-${scenario.id}`}
            >
              <div className="ms-dev-scenario-copy">
                <span className="ms-dev-scenario-name">{scenario.name}</span>
                <span className="ms-dev-scenario-description">
                  {scenario.description}
                </span>
              </div>
              <Switch
                checked={checked}
                onCheckedChange={(nextChecked) =>
                  setScenarioEnabled(scenario.id, nextChecked)
                }
                aria-label={`${checked ? 'Turn off' : 'Turn on'} ${scenario.name}`}
                data-testid={`dev-scenario-toggle-${scenario.id}`}
              >
                <SwitchThumb />
              </Switch>
            </div>
          )
        })}

        {scenarios.length === 0 && (
          <p className="ms-dev-tool-empty" role="status">
            No matching scenarios.
          </p>
        )}
      </div>
    </DrawerContent>
  )
}
