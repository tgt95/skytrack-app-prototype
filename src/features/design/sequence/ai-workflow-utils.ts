import { uid } from "../../../domain/mission-model";
import type {
  MissionAIWorkflow,
  StudioMission,
} from "../../../domain/mission-model";

type Waypoint = StudioMission["waypoints"][number];

export function createAIWorkflowAt({
  sequenceId,
  sequenceType,
  waypoint,
  nextWaypointId,
  actionIndex,
  existingWorkflows,
}: {
  sequenceId: string;
  sequenceType: MissionAIWorkflow["sequenceType"];
  waypoint: Waypoint;
  nextWaypointId?: string;
  actionIndex: number;
  existingWorkflows: MissionAIWorkflow[];
}): MissionAIWorkflow {
  const workflowCount = existingWorkflows.filter(
    (workflow) => workflow.sequenceId === sequenceId,
  ).length;

  return {
    id: uid("ai-flow"),
    label: `AI Flow ${workflowCount + 1}`,
    sequenceType,
    sequenceId,
    startWaypointId: waypoint.id,
    stopWaypointId: nextWaypointId ?? waypoint.id,
    startAfterActionId:
      actionIndex > 0 ? (waypoint.actions[actionIndex - 1]?.id ?? null) : null,
    modelId: null,
    objectClass: "Person",
    confidenceScore: 0.5,
    ifActions: [],
    elseActions: [],
  };
}
