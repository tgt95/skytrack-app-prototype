import { useCallback, useRef } from "react";
import {
  deleteWorldGlbAsset,
  prepareWorldGlbAsset,
  saveWorldGlbAsset,
} from "./database/world-glb-assets";
import type { WorkspaceWorldRecord } from "./database/workspace-resources-store";

export type ImportedWorldDetails = Pick<
  WorkspaceWorldRecord,
  | "location"
  | "status"
  | "sourceType"
  | "sourceMissionId"
  | "sourceMissionLabel"
  | "sourceFlightReference"
  | "reconstructionReference"
  | "note"
>;

interface UseWorldGlbImportOptions {
  workspaceId: string;
  persistWorld: (
    world: WorkspaceWorldRecord,
    mode: "create" | "edit",
  ) => boolean;
}

export interface WorldGlbReplacementResult {
  world: WorkspaceWorldRecord;
  cleanupWarning: string | null;
}

/** Validates and stores one local GLB, then registers its selectable World. */
export function useWorldGlbImport({
  workspaceId,
  persistWorld,
}: UseWorldGlbImportOptions) {
  const importingRef = useRef(false);

  const importWorld = useCallback(
    async (
      file: File,
      requestedName?: string,
      details?: ImportedWorldDetails,
    ): Promise<WorkspaceWorldRecord> => {
      if (importingRef.current)
        throw new Error("A World is already being imported.");
      const assetId = `world-glb-${crypto.randomUUID()}`;
      const name =
        requestedName?.trim() || file.name.replace(/\.glb$/iu, "").trim();
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
          location: details?.location ?? "",
          status: details?.status ?? "Draft",
          sourceType: details?.sourceType ?? "none",
          sourceMissionId: details?.sourceMissionId ?? "",
          sourceMissionLabel: details?.sourceMissionLabel ?? "",
          sourceFlightReference: details?.sourceFlightReference ?? "",
          reconstructionReference: details?.reconstructionReference ?? "",
          note: details ? details.note : "Imported 3D World",
          glbAssetId: asset.id,
          glbFileName: asset.fileName,
          glbFileSize: asset.fileSize,
        };

        if (!persistWorld(world, "create")) {
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

  const replaceWorldFile = useCallback(
    async (
      world: WorkspaceWorldRecord,
      file: File,
    ): Promise<WorldGlbReplacementResult> => {
      if (importingRef.current)
        throw new Error("A World file is already being imported.");
      if (world.workspaceId !== workspaceId) {
        throw new Error("This World belongs to a different Workspace.");
      }

      const previousAssetId = world.glbAssetId;
      const assetId = `world-glb-${crypto.randomUUID()}`;
      importingRef.current = true;
      let assetSaved = false;
      try {
        const asset = await prepareWorldGlbAsset(file, assetId);
        await saveWorldGlbAsset(asset);
        assetSaved = true;

        const updatedWorld: WorkspaceWorldRecord = {
          ...world,
          glbAssetId: asset.id,
          glbFileName: asset.fileName,
          glbFileSize: asset.fileSize,
        };

        if (!persistWorld(updatedWorld, "edit")) {
          throw new Error(
            "The World could not be updated in this browser. Check browser storage and try again.",
          );
        }

        let cleanupWarning: string | null = null;
        if (previousAssetId && previousAssetId !== asset.id) {
          try {
            await deleteWorldGlbAsset(previousAssetId);
          } catch {
            cleanupWarning =
              "World file was replaced, but the previous GLB could not be cleared from this browser.";
          }
        }

        return { world: updatedWorld, cleanupWarning };
      } catch (error) {
        if (assetSaved) {
          try {
            await deleteWorldGlbAsset(assetId);
          } catch {
            throw new Error(
              `${error instanceof Error ? error.message : "The World file could not be replaced."} Temporary GLB data could not be cleared from this browser.`,
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

  return { importWorld, replaceWorldFile };
}
