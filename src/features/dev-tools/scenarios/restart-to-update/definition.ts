import { DEV_SCENARIO_IDS } from "@/shared/dev-scenario-state";
import { DEV_SCENARIO_SLOTS } from "@/features/dev-tools/scenario-slots";
import type { DevScenarioDefinition } from "@/features/dev-tools/types";
import RestartToUpdateAction from "./action";

const restartToUpdateScenario = {
  id: DEV_SCENARIO_IDS.restartToUpdate,
  name: "Restart to update",
  description: "Show the restart action in the Library top bar.",
  keywords: ["update", "restart", "button"],
  slot: DEV_SCENARIO_SLOTS.libraryTopbarActions,
  action: RestartToUpdateAction,
} satisfies DevScenarioDefinition;

export default restartToUpdateScenario;
