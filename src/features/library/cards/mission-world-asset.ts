import type { LibMission } from "../database/store";
import type { WorkspaceWorldRecord } from "../database/workspace-resources-store";

/** Resolve a Mission's selected GLB when its worldId is a record or asset ID. */
export function resolveMissionWorldAssetId(
  mission: Pick<LibMission, "world" | "worldId">,
  worlds: readonly WorkspaceWorldRecord[],
): string | undefined {
  const world = mission.worldId
    ? (worlds.find((candidate) => candidate.id === mission.worldId) ??
      worlds.find((candidate) => candidate.glbAssetId === mission.worldId))
    : worlds.find((candidate) => candidate.name === mission.world);

  return world?.glbAssetId;
}
