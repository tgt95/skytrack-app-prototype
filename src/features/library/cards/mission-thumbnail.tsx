import { useEffect, useState } from "react";
import missionThumbnailSvg from "../../../assets/img-empty-thumbnail-4_3.svg?raw";
import { loadWorldGlbAsset } from "../database/world-glb-assets";

const thumbnailSvg = missionThumbnailSvg.replace(
  "<svg ",
  '<svg class="w-full h-full block rounded-[inherit]" ',
);

export default function MissionThumbnail({
  worldAssetId,
}: {
  worldAssetId?: string;
}) {
  const [preview, setPreview] = useState<
    { assetId: string; url: string } | null
  >(null);

  useEffect(() => {
    if (!worldAssetId) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    void loadWorldGlbAsset(worldAssetId)
      .then((asset) => {
        if (cancelled || !asset) return;
        objectUrl = URL.createObjectURL(asset.thumbnail);
        setPreview({ assetId: worldAssetId, url: objectUrl });
      })
      .catch(() => {
        if (!cancelled) {
          setPreview((current) =>
            current?.assetId === worldAssetId ? null : current,
          );
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [worldAssetId]);

  const previewUrl =
    preview && preview.assetId === worldAssetId ? preview.url : null;
  if (previewUrl) {
    return (
      <span className="absolute inset-0 block overflow-hidden rounded-[inherit]">
        <img
          src={previewUrl}
          alt=""
          aria-hidden="true"
          className="block size-full object-cover"
          data-testid="ms-lib-glb-thumbnail"
        />
      </span>
    );
  }

  return (
    <span
      className="block w-full h-full rounded-[inherit]"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: thumbnailSvg }}
    />
  );
}
