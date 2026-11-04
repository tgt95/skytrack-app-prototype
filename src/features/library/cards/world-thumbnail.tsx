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
      className="ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-(--muted-foreground) bg-(--background) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) ms-world-thumb relative w-full p-0 border-0 border-b border-b-border bg-[#454b59] text-(--muted-foreground) cursor-pointer focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-[-2px] [&_img]:block [&_img]:size-full [&_img]:object-cover"
      aria-label={`Preview ${worldName} in 3D`}
      data-testid={`ms-lib-world-thumbnail-${assetId ?? worldName}`}
      onClick={onPreview}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="" aria-hidden="true" />
      ) : (
        <GlobeHemisphereWestIcon aria-hidden="true" className="w-9 h-9" />
      )}
      <span className="ms-world-thumb-action absolute right-2 bottom-2 rounded-(--radius) border border-border bg-(--background) px-2 py-1 text-xs text-foreground opacity-0 [transition:opacity_120ms_ease] [@media(hover:none)]:opacity-100 [.ms-world-thumb:hover_&]:opacity-100 [.ms-world-thumb:focus-visible_&]:opacity-100">Open 3D preview</span>
    </button>
  );
}
