import { DEV_SCENARIO_IDS } from "@/shared/dev-scenario-state";
import { DEV_SCENARIO_SLOTS } from "@/features/dev-tools/scenario-slots";
import type { DevScenarioDefinition } from "@/features/dev-tools/types";
import RestartToUpdateMajorAction from "./action";

const restartToUpdateMajorScenario = {
  id: DEV_SCENARIO_IDS.restartToUpdateMajor,
  name: "Restart to update · Major",
  description: "Require a restart to install the update and continue.",
  keywords: ["update", "restart", "required", "major"],
  slot: DEV_SCENARIO_SLOTS.libraryTopbarActions,
  action: RestartToUpdateMajorAction,
} satisfies DevScenarioDefinition;

export default restartToUpdateMajorScenario;
