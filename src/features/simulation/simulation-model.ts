/* simulation-model.ts — compatibility barrel for the deterministic simulation model.
   Contracts live in simulation-types.ts, plan construction in simulation-plan.ts,
   and sampling/telemetry in simulation-sampling.ts. */

export {
  DEFAULT_SIM_SETTINGS,
  SIM_RUN_TIMES_MAX,
  SIM_RUN_TIMES_MIN,
  clampRunTimes,
} from "./simulation-types";
export type {
  SimEventItem,
  SimEventKind,
  SimLogLine,
  SimPlan,
  SimSettings,
  SimStatus,
  Telemetry,
} from "./simulation-types";
export { applyMockFailure, buildSimPlan } from "./simulation-plan";
export { samplePlan, telemetryAt } from "./simulation-sampling";
