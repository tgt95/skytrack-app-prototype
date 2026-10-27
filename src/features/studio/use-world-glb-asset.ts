import { useEffect, useState } from "react";
import { loadWorldGlbAsset, type WorldGlbAsset } from "../library/database/world-glb-assets";

interface LoadedWorldAsset {
  id: string | undefined;
  asset: WorldGlbAsset | null;
  error: string | null;
}

/** Loads the selected World model from browser-local IndexedDB. */
export function useWorldGlbAsset(assetId?: string) {
  const [loaded, setLoaded] = useState<LoadedWorldAsset>({
    id: undefined,
    asset: null,
    error: null,
  });

  useEffect(() => {
    if (!assetId) {
      setLoaded({ id: undefined, asset: null, error: null });
      return;
    }

    let cancelled = false;
    setLoaded({ id: assetId, asset: null, error: null });
    void loadWorldGlbAsset(assetId)
      .then((asset) => {
        if (cancelled) return;
        setLoaded({
          id: assetId,
          asset,
          error: asset ? null : "This World file is unavailable in this browser.",
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoaded({
          id: assetId,
          asset: null,
          error:
            error instanceof Error
              ? error.message
              : "This World file could not be opened from browser storage.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  const current = loaded.id === assetId;
  return {
    asset: current ? loaded.asset : null,
    error: current ? loaded.error : null,
    loading: Boolean(assetId) && (!current || (!loaded.asset && !loaded.error)),
  };
}
