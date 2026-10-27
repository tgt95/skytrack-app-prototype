import { useCallback, useRef } from "react";
import {
  deleteWorldGlbAsset,
  prepareWorldGlbAsset,
  saveWorldGlbAsset,
} from "../library/database/world-glb-assets";
import type { WorkspaceWorldRecord } from "../library/database/workspace-resources-store";

interface UseWorldGlbImportOptions {
  workspaceId: string;
  persistWorld: (world: WorkspaceWorldRecord) => boolean;
}

/** Validates and stores one local GLB, then registers its selectable World. */
export function useWorldGlbImport({
  workspaceId,
  persistWorld,
}: UseWorldGlbImportOptions) {
  const importingRef = useRef(false);

  const importWorld = useCallback(
    async (file: File): Promise<WorkspaceWorldRecord> => {
      if (importingRef.current)
        throw new Error("A World is already being imported.");
      const assetId = `world-glb-${crypto.randomUUID()}`;
      const name = file.name.replace(/\.glb$/iu, "").trim();
      if (!name) throw new Error("The GLB file needs a name.");

      importingRef.current = true;
      let assetSaved = false;
      try {
        const asset = await prepareWorldGlbAsset(file, assetId);
        await saveWorldGlbAsset(asset);
        assetSaved = true;

        const world: WorkspaceWorldRecord = {
          id: assetId,
          workspaceId,
          name,
          location: "",
          status: "Draft",
          sourceType: "none",
          sourceMissionId: "",
          sourceMissionLabel: "",
          sourceFlightReference: "",
          reconstructionReference: "",
          note: "Imported 3D World",
          glbAssetId: asset.id,
          glbFileName: asset.fileName,
          glbFileSize: asset.fileSize,
        };

        if (!persistWorld(world)) {
          throw new Error(
            "World details could not be saved in this browser. Check browser storage and try again.",
          );
        }
        return world;
      } catch (error) {
        if (assetSaved) {
          try {
            await deleteWorldGlbAsset(assetId);
          } catch {
            throw new Error(
              `${error instanceof Error ? error.message : "The World could not be imported."} Temporary GLB data could not be cleared from this browser.`,
            );
          }
        }
        throw error;
      } finally {
        importingRef.current = false;
      }
    },
    [persistWorld, workspaceId],
  );

  return { importWorld };
}
