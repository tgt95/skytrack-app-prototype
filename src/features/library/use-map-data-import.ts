import { useCallback, useRef } from "react";
import {
  mapDataFileSummary,
  type MapDataFileRecord,
} from "@/features/map-data/map-data";
import type { WorkspaceMapDatasetRecord } from "./database/workspace-resources-store";
import {
  deleteMapDataAsset,
  saveMapDataAsset,
} from "./database/world-map-data-store";

export function useMapDataImport({
  workspaceId,
  persistMapDataset,
}: {
  workspaceId: string;
  persistMapDataset: (dataset: WorkspaceMapDatasetRecord) => boolean;
}) {
  const importingRef = useRef(false);
  const importDataset = useCallback(
    async (name: string, files: MapDataFileRecord[]) => {
      if (importingRef.current)
        throw new Error("Map data is already being imported.");
      const cleanName = name.trim();
      if (!cleanName) throw new Error("Enter a map dataset name.");
      if (files.length === 0) throw new Error("Select at least one map layer.");
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > 50_000_000) {
        throw new Error("Selected map data exceeds the 50 MB total limit.");
      }

      importingRef.current = true;
      const id = `map-dataset-${crypto.randomUUID()}`;
      let assetSaved = false;
      try {
        const summary = mapDataFileSummary(files);
        await saveMapDataAsset({ id, files });
        assetSaved = true;
        const dataset: WorkspaceMapDatasetRecord = {
          id,
          workspaceId,
          name: cleanName,
          status: "Draft",
          mapDataAssetId: id,
          mapDataFileCount: files.length,
          mapDataFeatureCount: summary.featureCount,
          mapDataHasTerrain: summary.terrainAvailable,
        };
        if (!persistMapDataset(dataset)) {
          throw new Error(
            "Map dataset could not be saved in this browser. Check browser storage and try again.",
          );
        }
        return dataset;
      } catch (error) {
        if (assetSaved) {
          await deleteMapDataAsset(id).catch(() => undefined);
        }
        throw error;
      } finally {
        importingRef.current = false;
      }
    },
    [persistMapDataset, workspaceId],
  );

  return { importDataset };
}
