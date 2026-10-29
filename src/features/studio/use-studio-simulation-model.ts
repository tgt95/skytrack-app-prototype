import { useMemo } from "react";
import { validateMission } from "../../domain/mission-model";
import {
  computeDerivedTransfers,
  validateTransfers,
} from "../../domain/transfer-planner";
import type { SceneReadiness } from "../scene/mission-scene";
import type { StudioMission } from "../../domain/mission-model";
import {
  applyMockFailure,
  buildSimPlan,
  telemetryAt,
  useSimulation,
  type SimSettings,
} from "../simulation/simulation";
import {
  formatMeasurementText,
  useMeasurementSystem,
} from "../../shared/measurement-units";

export function sceneGateReason(readiness: SceneReadiness): string | null {
  if (readiness === "loading") return "3D scene loading. Wait until ready.";
  if (readiness === "error")
    return "3D scene unavailable. Retry 3D or continue editing in Design.";
  if (readiness === "without-3d")
    return "3D is off. Retry 3D to enable Simulation.";
  return null;
}

export function useStudioSimulationModel(
  mission: StudioMission,
  sceneReadiness: SceneReadiness,
  settings: SimSettings,
) {
  const unitSystem = useMeasurementSystem();
  const issues = useMemo(
    () =>
      [...validateMission(mission), ...validateTransfers(mission)].map(
        (issue) => ({
          ...issue,
          message: formatMeasurementText(issue.message, unitSystem),
        }),
      ),
    [mission, unitSystem],
  );
  const derivedTransfers = useMemo(
    () => computeDerivedTransfers(mission),
    [mission],
  );
  const gate = useMemo(() => {
    const errors = issues.filter((issue) => issue.level === "error");
    const missionGate = {
      ok: errors.length === 0,
      reason: errors.length > 0 ? errors[0].message : null,
    };
    return {
      ok: missionGate.ok && sceneReadiness === "ready",
      reason:
        [missionGate.reason, sceneGateReason(sceneReadiness)]
          .filter(Boolean)
          .join(" ") || null,
    };
  }, [issues, sceneReadiness]);
  const basePlan = useMemo(() => buildSimPlan(mission), [mission]);
  const plan = useMemo(
    () =>
      basePlan ? applyMockFailure(basePlan, settings.mockFailureAtSeq) : null,
    [basePlan, settings.mockFailureAtSeq],
  );
  const sim = useSimulation(plan, settings);
  const totalT = useMemo(
    () =>
      plan
        ? plan.duration * Math.max(1, Math.floor(settings.runTimes) || 1)
        : 0,
    [plan, settings.runTimes],
  );
  const runT = useMemo(() => {
    if (!plan) return 0;
    const runLength = plan.duration || 1;
    return Math.max(
      0,
      Math.min(sim.simT - sim.runIndex * runLength, runLength),
    );
  }, [plan, sim.simT, sim.runIndex]);
  const telemetry = useMemo(
    () =>
      plan
        ? telemetryAt(
            plan,
            { x: mission.spawn.x, y: mission.spawn.y },
            runT,
            sim.status,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      plan,
      mission.waypoints,
      mission.areas,
      mission.spawn,
      mission.takeoffAltM,
      runT,
      sim.status,
    ],
  );

  return { issues, derivedTransfers, gate, plan, sim, totalT, telemetry };
}
