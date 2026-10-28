import { useCallback } from "react";
import type { StudioMission } from "../../domain/mission-model";
import type { MissionWorldOption } from "./studio-dialogs";
import type { WorkspaceWorldRecord } from "../library/database/workspace-resources-store";
import { useWorldGlbAsset } from "./use-world-glb-asset";
import { useWorldGlbImport } from "../library/use-world-glb-import";

export function useStudioWorldGlb({
  mission,
  worldOptions,
  workspaceId,
  persistWorld,
  onSelectImportedWorld,
  announce,
}: {
  mission: StudioMission;
  worldOptions: MissionWorldOption[];
  workspaceId: string;
  persistWorld: (world: WorkspaceWorldRecord) => boolean;
  onSelectImportedWorld: (world: Pick<WorkspaceWorldRecord, "id" | "name">) => void;
  announce: (message: string) => void;
}) {
  const selectedAssetId = (
    worldOptions.find((world) => world.id === mission.worldId) ??
    worldOptions.find((world) => world.name === mission.world)
  )?.glbAssetId;
  const worldAsset = useWorldGlbAsset(selectedAssetId);
  const importer = useWorldGlbImport({ workspaceId, persistWorld });
  const onImportWorld = useCallback(
    async (file: File) => {
      const world = await importer.importWorld(file);
      onSelectImportedWorld(world);
      announce(`${world.name} imported and selected.`);
    },
    [announce, importer.importWorld, onSelectImportedWorld],
  );

  return {
    onImportWorld,
    sceneWorld: {
      assetId: selectedAssetId,
      blob: worldAsset.asset?.model ?? null,
      error: worldAsset.error,
      loading: worldAsset.loading,
    },
  };
}
