import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "skytrack-ui/drawer";
import { Input } from "skytrack-ui/input";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import { useDevScenarioControls } from "../../shared/dev-scenario-state";
import { DEV_SCENARIOS } from "./scenario-registry";

function scenarioMatchesSearch(
  scenario: (typeof DEV_SCENARIOS)[number],
  query: string,
): boolean {
  const searchableText = [
    scenario.name,
    scenario.description,
    ...(scenario.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

export default function DevScenarioDrawer() {
  const [query, setQuery] = useState("");
  const { enabledScenarioIds, setScenarioEnabled } = useDevScenarioControls();
  const normalizedQuery = query.trim().toLowerCase();

  const scenarios = useMemo(
    () =>
      DEV_SCENARIOS.filter((scenario) =>
        scenarioMatchesSearch(scenario, normalizedQuery),
      ),
    [normalizedQuery],
  );

  return (
    <DrawerContent className="h-full min-h-0 overflow-hidden">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <DrawerTitle className="heading">Dev Tool</DrawerTitle>
          <DrawerDescription>
            Search and toggle test scenarios.
          </DrawerDescription>
        </div>
        <DrawerClose
          size="icon"
          variant="ghost"
          className="flex-none"
          aria-label="Close Dev Tool"
        >
          <XIcon aria-hidden="true" />
        </DrawerClose>
      </header>

      <label className="block flex-none">
        <span className="sr-only">Search scenarios</span>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search scenarios"
          startAdornment={<MagnifyingGlassIcon aria-hidden="true" />}
        />
      </label>

      <div
        className="text-(--muted-foreground) flex-none text-[0.75rem]"
        aria-live="polite"
      >
        {scenarios.length} {scenarios.length === 1 ? "scenario" : "scenarios"}
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
        role="list"
        aria-label="Scenarios"
      >
        {scenarios.map((scenario) => {
          const checked = enabledScenarioIds.has(scenario.id);

          return (
            <div
              className="flex items-center justify-between gap-4 border-b border-solid border-(--border) py-[0.875rem]"
              key={scenario.id}
              role="listitem"
              data-testid={`dev-scenario-${scenario.id}`}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-(--foreground) font-medium">
                  {scenario.name}
                </span>
                <span className="text-(--muted-foreground) text-[0.8125rem] leading-[1.4]">
                  {scenario.description}
                </span>
              </div>
              <Switch
                checked={checked}
                onCheckedChange={(nextChecked) =>
                  setScenarioEnabled(scenario.id, nextChecked)
                }
                aria-label={`${checked ? "Turn off" : "Turn on"} ${scenario.name}`}
                data-testid={`dev-scenario-toggle-${scenario.id}`}
              >
                <SwitchThumb />
              </Switch>
            </div>
          );
        })}

        {scenarios.length === 0 && (
          <p className="text-(--muted-foreground) py-4" role="status">
            No matching scenarios.
          </p>
        )}
      </div>
    </DrawerContent>
  );
}
