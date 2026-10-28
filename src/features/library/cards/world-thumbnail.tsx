import { GlobeHemisphereWestIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export function WorldThumbnail({
  assetId,
  worldName,
  onPreview,
}: {
  assetId?: string;
  worldName: string;
  onPreview: () => void;
}) {
  const [preview, setPreview] = useState<{
    assetId: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!assetId) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    void import("../database/world-glb-asset-access")
      .then(({ loadWorldGlbThumbnail }) => loadWorldGlbThumbnail(assetId))
      .then((thumbnail) => {
        if (cancelled || !thumbnail) return;
        objectUrl = URL.createObjectURL(thumbnail);
        setPreview({ assetId, url: objectUrl });
      })
      .catch(() => {
        if (!cancelled) {
          setPreview((current) =>
            current?.assetId === assetId ? null : current,
          );
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  const previewUrl =
    preview && preview.assetId === assetId ? preview.url : null;
  return (
    <button
      type="button"
      className="ms-lib-thumb ms-world-thumb"
      aria-label={`Preview ${worldName} in 3D`}
      data-testid={`ms-lib-world-thumbnail-${assetId ?? worldName}`}
      onClick={onPreview}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="" aria-hidden="true" />
      ) : (
        <GlobeHemisphereWestIcon aria-hidden="true" className="w-9 h-9" />
      )}
      <span className="ms-world-thumb-action">Open 3D preview</span>
    </button>
  );
}
