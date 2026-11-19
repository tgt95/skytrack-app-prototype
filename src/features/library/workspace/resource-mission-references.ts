import type { LibProject } from "@/features/library/database/store";
import type { WorkspaceDroneProfile } from "@/features/library/database/drone-store";
import type {
  WorkspaceAIModelRecord,
  WorkspaceWorldRecord,
} from "@/features/library/database/workspace-resources-store";
import { DEFAULT_WORKSPACE_ID } from "./workspace-data.ts";

export type MissionReference = { project: string; mission: string };

function missionSnapshot(missionData?: string): Record<string, unknown> | null {
  try {
    return missionData ? (JSON.parse(missionData) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function missionsInWorkspace(
  projects: LibProject[],
  workspaceId: string,
): Array<{ project: LibProject; mission: LibProject["missions"][number] }> {
  return projects
    .filter((project) => (project.workspaceId ?? DEFAULT_WORKSPACE_ID) === workspaceId)
    .flatMap((project) => project.missions.map((mission) => ({ project, mission })));
}

export function findDroneMissionReferences(
  projects: LibProject[],
  drone: WorkspaceDroneProfile | null,
): MissionReference[] {
  if (!drone) return [];
  return missionsInWorkspace(projects, drone.workspaceId).flatMap(({ project, mission }) => {
    const snapshot = missionSnapshot(mission.missionData);
    const referencedId = mission.droneId ??
      (typeof snapshot?.droneId === "string" ? snapshot.droneId : undefined);
    const referencedName = mission.vehicle ??
      (typeof snapshot?.vehicle === "string" ? snapshot.vehicle : undefined);
    const matches = referencedId === drone.id ||
      (!referencedId && Boolean(referencedName) &&
        [drone.name, ...drone.legacyLabels].includes(referencedName as string));
    return matches ? [{ project: project.name, mission: mission.name }] : [];
  });
}

export function findWorldMissionReferences(
  projects: LibProject[],
  world: WorkspaceWorldRecord | null,
): MissionReference[] {
  if (!world) return [];
  return missionsInWorkspace(projects, world.workspaceId).flatMap(({ project, mission }) => {
    const snapshot = missionSnapshot(mission.missionData);
    const referencedId = mission.worldId ??
      (typeof snapshot?.worldId === "string" ? snapshot.worldId : undefined);
    const matches = referencedId ? referencedId === world.id : mission.world === world.name;
    return matches ? [{ project: project.name, mission: mission.name }] : [];
  });
}

export function findAIModelMissionReferences(
  projects: LibProject[],
  model: WorkspaceAIModelRecord | null,
  workspaceId: string,
): MissionReference[] {
  if (!model) return [];
  return missionsInWorkspace(projects, workspaceId).flatMap(({ project, mission }) => {
    const snapshot = missionSnapshot(mission.missionData);
    const workflows = Array.isArray(snapshot?.aiWorkflows) ? snapshot.aiWorkflows : [];
    const matches = workflows.some((workflow) =>
      Boolean(workflow) && typeof workflow === "object" &&
      (workflow as Record<string, unknown>).modelId === model.id,
    );
    return matches ? [{ project: project.name, mission: mission.name }] : [];
  });
}
