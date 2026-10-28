import {
  loadBundledWorldGlbModel,
  loadBundledWorldGlbThumbnail,
} from "./bundled-world-glb-loader";
import { loadWorldGlbAssetBlob } from "./world-glb-assets";

function assetIdFor(id: string, kind: "model" | "thumbnail"): string {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new Error(`A valid World asset ID is required to load its ${kind}.`);
  }
  return id.trim();
}

/** Load only the lightweight preview image for a World card. */
export async function loadWorldGlbThumbnail(id: string): Promise<Blob | null> {
  const cleanId = assetIdFor(id, "thumbnail");
  return (
    (await loadBundledWorldGlbThumbnail(cleanId)) ??
    loadWorldGlbAssetBlob(cleanId, "thumbnail")
  );
}

/** Load only the GLB model binary when the user opens a 3D preview. */
export async function loadWorldGlbModel(id: string): Promise<Blob | null> {
  const cleanId = assetIdFor(id, "model");
  return (
    (await loadBundledWorldGlbModel(cleanId)) ??
    loadWorldGlbAssetBlob(cleanId, "model")
  );
}
