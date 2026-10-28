import { bundledWorldAssetById } from "./bundled-world-assets";
import type { WorldGlbAsset } from "./world-glb-asset-types";

type PrepareWorldGlbAsset = (file: File, id: string) => Promise<WorldGlbAsset>;

const bundledAssetLoads = new Map<string, Promise<WorldGlbAsset>>();
const bundledModelLoads = new Map<string, Promise<File>>();
const bundledThumbnailLoads = new Map<string, Promise<Blob>>();

async function fetchBundledFile(id: string): Promise<File | null> {
  const asset = bundledWorldAssetById(id);
  if (!asset) return null;
  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(
      `Bundled World file "${asset.fileName}" could not be loaded (${response.status}).`,
    );
  }
  return new File([await response.blob()], asset.fileName, {
    type: "model/gltf-binary",
  });
}

export async function loadBundledWorldGlbModel(
  id: string,
): Promise<File | null> {
  const asset = bundledWorldAssetById(id);
  if (!asset) return null;
  const loading = bundledModelLoads.get(id);
  if (loading) return loading;

  const request = fetchBundledFile(id).then((file) => {
    if (!file) {
      throw new Error(`Bundled World model "${asset.fileName}" was not found.`);
    }
    return file;
  });
  bundledModelLoads.set(id, request);
  try {
    return await request;
  } finally {
    if (bundledModelLoads.get(id) === request) {
      bundledModelLoads.delete(id);
    }
  }
}

export async function loadBundledWorldGlbThumbnail(
  id: string,
): Promise<Blob | null> {
  const asset = bundledWorldAssetById(id);
  if (!asset) return null;
  const loading = bundledThumbnailLoads.get(id);
  if (loading) return loading;

  const request = fetch(asset.previewUrl).then((response) => {
    if (!response.ok) {
      throw new Error(
        `Bundled World preview for "${asset.fileName}" could not be loaded (${response.status}).`,
      );
    }
    return response.blob();
  });
  bundledThumbnailLoads.set(id, request);
  try {
    return await request;
  } finally {
    if (bundledThumbnailLoads.get(id) === request) {
      bundledThumbnailLoads.delete(id);
    }
  }
}

export async function loadBundledWorldGlbAsset(
  id: string,
  prepareWorldGlbAsset: PrepareWorldGlbAsset,
): Promise<WorldGlbAsset | null> {
  const bundledAsset = bundledWorldAssetById(id);
  if (!bundledAsset) return null;

  const loading = bundledAssetLoads.get(id);
  if (loading) return loading;

  const request = (async () => {
    const file = await loadBundledWorldGlbModel(id);
    if (!file) {
      throw new Error(
        `Bundled World model "${bundledAsset.fileName}" was not found.`,
      );
    }
    const thumbnail = await loadBundledWorldGlbThumbnail(id);
    if (thumbnail) {
      const { WORLD_GLB_THUMBNAIL_VERSION } =
        await import("./world-glb-preview.ts");
      return {
        id,
        fileName: bundledAsset.fileName,
        fileSize: file.size,
        model: file,
        thumbnail,
        thumbnailVersion: WORLD_GLB_THUMBNAIL_VERSION,
      };
    }
    return prepareWorldGlbAsset(file, id);
  })();
  bundledAssetLoads.set(id, request);
  try {
    return await request;
  } finally {
    if (bundledAssetLoads.get(id) === request) {
      bundledAssetLoads.delete(id);
    }
  }
}
