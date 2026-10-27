import { useEffect } from "react";
import type { Viewer } from "cesium";
import { BASEMAPS, type MissionBasemapStyle } from "./basemaps";

interface UseSceneBasemapParams {
  viewer: Viewer | null;
  status: "loading" | "ready" | "error";
  basemap: MissionBasemapStyle;
  worldType: "2D" | "3D" | undefined;
  world: string | undefined;
}

/** Owns imagery selection and stale async-provider cancellation for the scene. */
export function useSceneBasemap({
  viewer,
  status,
  basemap,
  worldType,
  world,
}: UseSceneBasemapParams): void {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || status !== "ready") return;
    if (worldType !== "2D" && world === "Blank space") {
      viewer.imageryLayers.removeAll();
      viewer.scene.requestRender();
      return;
    }

    let cancelled = false;
    /* Blank space stays imagery-free; other Worlds use one imagery layer over local terrain. */
    const imageryUrl = BASEMAPS[basemap].url.replace(
      /\/tile\/\{z\}\/\{y\}\/\{x\}$/,
      "",
    );
    void import("cesium")
      .then(async (Cesium) => {
        const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          imageryUrl,
          { enablePickFeatures: false },
        );
        if (cancelled || viewer.isDestroyed()) return;
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(provider);
        viewer.scene.requestRender();
      })
      .catch(() => {
        /* Keep the last imagery or token-based globe visible when the basemap is offline. */
      });
    return () => {
      cancelled = true;
    };
  }, [viewer, status, basemap, worldType, world]);
}
