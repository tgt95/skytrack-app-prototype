import acresUseltonUrl from "./worlds/55_acres_uselton_rd_shelbyville_tn_real_estate.glb?url";
import railroadUrl from "./worlds/750_railroad_ave_shelbyville_tn_real_estate.glb?url";
import leevilleUrl from "./worlds/roofing_assessment_leeville_pike.glb?url";
import acresUseltonPreviewUrl from "./worlds/previews/55-acres-uselton-rd.png?url";
import railroadPreviewUrl from "./worlds/previews/750-railroad-ave.png?url";
import leevillePreviewUrl from "./worlds/previews/leeville-pike.png?url";

export interface BundledWorldAsset {
  id: string;
  name: string;
  location: string;
  fileName: string;
  fileSize: number;
  url: string;
  previewUrl: string;
}

/** World models shipped with this prototype; binaries stay as app assets. */
export const BUNDLED_WORLD_ASSETS: BundledWorldAsset[] = [
  {
    id: "bundled-world-750-railroad-ave",
    name: "750 Railroad Ave",
    location: "Shelbyville, TN",
    fileName: "750_railroad_ave_shelbyville_tn_real_estate.glb",
    fileSize: 31_570_816,
    url: railroadUrl,
    previewUrl: railroadPreviewUrl,
  },
  {
    id: "bundled-world-leeville-pike-roof-assessment",
    name: "Leeville Pike roof assessment",
    location: "Leeville Pike",
    fileName: "roofing_assessment_leeville_pike.glb",
    fileSize: 38_941_644,
    url: leevilleUrl,
    previewUrl: leevillePreviewUrl,
  },
  {
    id: "bundled-world-55-acres-uselton-rd",
    name: "55 Acres · Uselton Rd",
    location: "Shelbyville, TN",
    fileName: "55_acres_uselton_rd_shelbyville_tn_real_estate.glb",
    fileSize: 36_325_844,
    url: acresUseltonUrl,
    previewUrl: acresUseltonPreviewUrl,
  },
];

const assetsById = new Map(
  BUNDLED_WORLD_ASSETS.map((asset) => [asset.id, asset]),
);

export function bundledWorldAssetById(
  id: string,
): BundledWorldAsset | undefined {
  return assetsById.get(id);
}
