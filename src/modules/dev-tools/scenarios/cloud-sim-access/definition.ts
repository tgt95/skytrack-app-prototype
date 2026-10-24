import { DEV_SCENARIO_IDS } from "../../../../shared/dev-scenario-state";
import type { DevScenarioDefinition } from "../../types";

const cloudSimAccessScenario = {
  id: DEV_SCENARIO_IDS.cloudSimAccessNotGranted,
  name: "Cloud SIM access not granted",
  description: "Disable Cloud and explain that access is required.",
  keywords: ["cloud", "sim", "access", "permission", "environment"],
} satisfies DevScenarioDefinition;

export default cloudSimAccessScenario;
