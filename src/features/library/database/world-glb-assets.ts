/**
 * World 3D GLB Asset Model and Native IndexedDB Persistence Store.
 *
 * Implements asset preparation, validation, 4:3 PNG thumbnail generation,
 * and isolated IndexedDB storage for SkyTrack Mission Studio custom 3D terrain/mesh worlds.
 */
import { bundledWorldAssetById } from "./bundled-world-assets";
import { loadBundledWorldGlbAsset } from "./bundled-world-glb-loader";
import { readAndValidateWorldGlbFile } from "./world-glb-validation";
import type { WorldGlbAsset } from "./world-glb-asset-types";

export type { WorldGlbAsset } from "./world-glb-asset-types";

import { WORLD_GLB_STORE_NAME, withWorldGlbStore } from "./world-glb-database";
export {
  closeWorldGlbDatabase,
  WORLD_GLB_DB_NAME,
  WORLD_GLB_DB_VERSION,
  WORLD_GLB_STORE_NAME,
} from "./world-glb-database";

function isBlobLike(value: unknown): value is Blob {
  return (
    value instanceof Blob ||
    (typeof value === "object" &&
      value !== null &&
      "size" in value &&
      typeof (value as Blob).slice === "function")
  );
}

async function loadStoredWorldGlbBlob(
  id: string,
  key: "model" | "thumbnail",
): Promise<Blob | null> {
  const result = await withWorldGlbStore<Record<string, unknown> | null>(
    "readonly",
    (store) =>
      new Promise<Record<string, unknown> | null>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () =>
          resolve(
            (request.result as Record<string, unknown> | undefined) ?? null,
          );
        request.onerror = () =>
          reject(
            new Error(
              `Failed to load GLB asset "${id}" from store "${WORLD_GLB_STORE_NAME}": ${request.error?.message || "Unknown request error"}`,
            ),
          );
      }),
  );
  if (!result) return null;
  const blob = result[key];
  if (!isBlobLike(blob)) {
    throw new Error(
      `Persisted World asset "${id}" has an invalid ${key} Blob.`,
    );
  }
  return blob;
}

export { loadStoredWorldGlbBlob as loadWorldGlbAssetBlob };

/**
 * Validates a user-supplied GLB file, parses it to generate a 4:3 PNG thumbnail,
 * and packages the asset metadata into a WorldGlbAsset structure ready for persistence.
 *
 * Dynamically imports the thumbnail renderer module to prevent Three.js and GLTFLoader
 * from being bundled into initial app startup.
 *
 * @param file The input File object selected by the user
 * @param id The stable caller-provided asset identifier
 * @returns Promise resolving to the validated WorldGlbAsset
 */
export async function prepareWorldGlbAsset(
  file: File,
  id: string,
): Promise<WorldGlbAsset> {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new Error("A valid non-empty asset ID must be provided.");
  }

  const { fileName: normalizedFileName, buffer } =
    await readAndValidateWorldGlbFile(file);

  // Dynamically import world-glb-preview so Three.js & GLTFLoader are only loaded on demand
  const { renderGlbThumbnail, WORLD_GLB_THUMBNAIL_VERSION } =
    await import("./world-glb-preview.ts");

  const thumbnail = await renderGlbThumbnail(buffer);

  // Preserve model as a Blob with standard gltf-binary MIME type
  const modelBlob =
    file.type === "model/gltf-binary"
      ? file
      : new Blob([buffer], { type: "model/gltf-binary" });

  return {
    id: id.trim(),
    fileName: normalizedFileName,
    fileSize: file.size,
    model: modelBlob,
    thumbnail,
    thumbnailVersion: WORLD_GLB_THUMBNAIL_VERSION,
  };
}

/**
 * Persists a WorldGlbAsset into native IndexedDB.
 *
 * @param asset The WorldGlbAsset to store
 */
export async function saveWorldGlbAsset(asset: WorldGlbAsset): Promise<void> {
  if (!asset || typeof asset !== "object") {
    throw new Error(
      "A valid WorldGlbAsset object must be provided to saveWorldGlbAsset.",
    );
  }
  if (
    !asset.id ||
    typeof asset.id !== "string" ||
    asset.id.trim().length === 0
  ) {
    throw new Error('WorldGlbAsset must contain a non-empty string "id".');
  }
  if (!asset.fileName || typeof asset.fileName !== "string") {
    throw new Error('WorldGlbAsset must contain a valid string "fileName".');
  }
  if (typeof asset.fileSize !== "number" || asset.fileSize < 0) {
    throw new Error(
      'WorldGlbAsset must contain a valid non-negative number "fileSize".',
    );
  }
  if (!asset.model || !(asset.model instanceof Blob)) {
    throw new Error('WorldGlbAsset must contain a valid Blob for "model".');
  }
  if (!asset.thumbnail || !(asset.thumbnail instanceof Blob)) {
    throw new Error('WorldGlbAsset must contain a valid Blob for "thumbnail".');
  }

  const record: WorldGlbAsset = {
    id: asset.id.trim(),
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    model: asset.model,
    thumbnail: asset.thumbnail,
    thumbnailVersion: asset.thumbnailVersion,
  };

  await withWorldGlbStore("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      let request: IDBRequest;
      try {
        request = store.put(record);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reject(
          new Error(
            `Failed to put asset "${record.id}" into IndexedDB: ${message}`,
          ),
        );
      }

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to save GLB asset "${record.id}" to store "${WORLD_GLB_STORE_NAME}": ${request.error?.message || "Unknown request error"}`,
          ),
        );
      };
    });
  });
}

/**
 * Loads a WorldGlbAsset from native IndexedDB by ID.
 * Returns null if no record exists for the given ID.
 *
 * @param id The unique asset identifier
 * @returns Promise resolving to WorldGlbAsset or null
 */
export async function loadWorldGlbAsset(
  id: string,
): Promise<WorldGlbAsset | null> {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new Error(
      "A valid non-empty asset ID must be provided to loadWorldGlbAsset.",
    );
  }

  const cleanId = id.trim();
  const bundledAsset = await loadBundledWorldGlbAsset(
    cleanId,
    prepareWorldGlbAsset,
  );
  if (bundledAsset) return bundledAsset;

  const asset = await withWorldGlbStore("readonly", (store) => {
    return new Promise<WorldGlbAsset | null>((resolve, reject) => {
      let request: IDBRequest;
      try {
        request = store.get(cleanId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reject(
          new Error(
            `Failed to request asset "${cleanId}" from IndexedDB: ${message}`,
          ),
        );
      }

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        if (
          typeof result.id === "string" &&
          typeof result.fileName === "string" &&
          typeof result.fileSize === "number" &&
          isBlobLike(result.model) &&
          isBlobLike(result.thumbnail)
        ) {
          resolve({
            id: result.id,
            fileName: result.fileName,
            fileSize: result.fileSize,
            model: result.model,
            thumbnail: result.thumbnail,
            thumbnailVersion: result.thumbnailVersion,
          });
        } else {
          reject(
            new Error(
              `Persisted record for asset "${cleanId}" in IndexedDB is corrupted or has an invalid structure.`,
            ),
          );
        }
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to load GLB asset "${cleanId}" from store "${WORLD_GLB_STORE_NAME}": ${request.error?.message || "Unknown request error"}`,
          ),
        );
      };
    });
  });

  if (!asset) return null;
  const { WORLD_GLB_THUMBNAIL_VERSION } =
    await import("./world-glb-preview.ts");
  if ((asset.thumbnailVersion ?? 0) >= WORLD_GLB_THUMBNAIL_VERSION)
    return asset;

  try {
    const { renderGlbThumbnail } = await import("./world-glb-preview.ts");
    const thumbnail = await renderGlbThumbnail(await asset.model.arrayBuffer());
    const refreshedAsset = {
      ...asset,
      thumbnail,
      thumbnailVersion: WORLD_GLB_THUMBNAIL_VERSION,
    };
    await saveWorldGlbAsset(refreshedAsset);
    return refreshedAsset;
  } catch {
    // Keep the existing thumbnail if this browser cannot regenerate it.
    return asset;
  }
}

/**
 * Deletes a WorldGlbAsset from native IndexedDB by ID.
 *
 * @param id The unique asset identifier
 */
export async function deleteWorldGlbAsset(id: string): Promise<void> {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new Error(
      "A valid non-empty asset ID must be provided to deleteWorldGlbAsset.",
    );
  }

  const cleanId = id.trim();
  if (bundledWorldAssetById(cleanId)) return;

  await withWorldGlbStore("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      let request: IDBRequest;
      try {
        request = store.delete(cleanId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reject(
          new Error(
            `Failed to issue delete request for asset "${cleanId}": ${message}`,
          ),
        );
      }

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to delete GLB asset "${cleanId}" from store "${WORLD_GLB_STORE_NAME}": ${request.error?.message || "Unknown request error"}`,
          ),
        );
      };
    });
  });
}
