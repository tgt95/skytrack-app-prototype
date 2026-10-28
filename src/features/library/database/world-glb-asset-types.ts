export interface WorldGlbAsset {
  /** Stable unique asset ID provided by caller. */
  id: string;
  /** Original file name (e.g. "terrain-valley.glb"). */
  fileName: string;
  /** Size of the original GLB binary in bytes. */
  fileSize: number;
  /** The 3D model binary payload stored as a Blob. */
  model: Blob;
  /** Rendered 4:3 PNG preview thumbnail stored as a Blob. */
  thumbnail: Blob;
  /** Preview renderer version used to create the stored thumbnail. */
  thumbnailVersion?: number;
}
