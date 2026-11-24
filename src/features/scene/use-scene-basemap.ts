import { useEffect } from "react";
import type { Viewer } from "cesium";
import { BASEMAPS, type MissionBasemapStyle } from "./basemaps";
import {
  OPENSTREETMAP_TILE_ATTRIBUTION,
  OPENSTREETMAP_TILE_TEMPLATE,
} from "@/shared/map-tiles";

const OSM_GLOBE_FALLBACK = "#f2efe9";

interface UseSceneBasemapParams {
  viewer: Viewer | null;
  status: "loading" | "ready" | "error";
  basemap: MissionBasemapStyle;
  worldType: "2D" | "3D" | undefined;
  world: string | undefined;
  worldModelActive: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

/** Owns imagery selection and stale async-provider cancellation for the scene. */
export function useSceneBasemap({
  viewer,
  status,
  basemap,
  worldType,
  world,
  worldModelActive,
  onLoadingChange,
}: UseSceneBasemapParams): void {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || status !== "ready") {
      onLoadingChange?.(false);
      return;
    }
    const worldModelReplacesGlobe =
      worldType === "3D" && world !== "Blank space" && worldModelActive;
    viewer.scene.globe.show = !worldModelReplacesGlobe;
    if (
      worldModelReplacesGlobe ||
      (worldType !== "2D" && world === "Blank space")
    ) {
      viewer.imageryLayers.removeAll();
      onLoadingChange?.(false);
      viewer.scene.requestRender();
      return;
    }

    let cancelled = false;
    let removeTileListener: (() => void) | undefined;
    let settleTimer: number | undefined;
    let cachedTilesTimer: number | undefined;
    const safetyTimer = window.setTimeout(
      () => onLoadingChange?.(false),
      12000,
    );
    onLoadingChange?.(true);
    /* Blank space stays imagery-free; other Worlds use one imagery layer over local terrain. */
    const useOsmTiles =
      worldType === "2D" &&
      (basemap === "openstreetmap" || basemap === "basic");
    const globe = viewer.scene.globe;
    const originalGlobeBaseColor = globe.baseColor.clone();
    const originalSceneBackgroundColor = viewer.scene.backgroundColor.clone();
    const imageryUrl = (worldType !== "2D" && basemap === "openstreetmap"
      ? BASEMAPS.basic.url
      : BASEMAPS[basemap].url).replace(/\/tile\/\{z\}\/\{y\}\/\{x\}$/, "");
    void import("cesium")
      .then(async (Cesium) => {
        const provider = useOsmTiles
          ? new Cesium.UrlTemplateImageryProvider({
              url: OPENSTREETMAP_TILE_TEMPLATE,
              credit: new Cesium.Credit(OPENSTREETMAP_TILE_ATTRIBUTION, true),
              maximumLevel: 19,
            })
          : await Cesium.ArcGisMapServerImageryProvider.fromUrl(imageryUrl, {
              enablePickFeatures: false,
            });
        if (cancelled || viewer.isDestroyed()) return;
        if (useOsmTiles) {
          /* The transparent 2D globe leaks the page background through tiles
             that are still loading during an orbit. Match the active OSM land
             color so those temporary gaps read as continuous map surface. */
          const fallbackColor = Cesium.Color.fromCssColorString(OSM_GLOBE_FALLBACK);
          globe.baseColor = fallbackColor;
          viewer.scene.backgroundColor = fallbackColor;
        }
        viewer.imageryLayers.removeAll();
        removeTileListener = globe.tileLoadProgressEvent.addEventListener(
          (pendingTiles: number) => {
            if (pendingTiles > 0) {
              onLoadingChange?.(true);
              if (settleTimer !== undefined) window.clearTimeout(settleTimer);
              return;
            }
            if (settleTimer !== undefined) window.clearTimeout(settleTimer);
            settleTimer = window.setTimeout(
              () => onLoadingChange?.(false),
              250,
            );
          },
        );
        viewer.imageryLayers.addImageryProvider(provider);
        cachedTilesTimer = window.setTimeout(() => {
          if (globe.tilesLoaded) onLoadingChange?.(false);
        }, 1500);
        viewer.scene.requestRender();
      })
      .catch(() => {
        /* Keep the last imagery or token-based globe visible when the basemap is offline. */
        onLoadingChange?.(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
      if (cachedTilesTimer !== undefined) window.clearTimeout(cachedTilesTimer);
      if (settleTimer !== undefined) window.clearTimeout(settleTimer);
      removeTileListener?.();
      onLoadingChange?.(false);
      if (!viewer.isDestroyed()) {
        globe.baseColor = originalGlobeBaseColor;
        viewer.scene.backgroundColor = originalSceneBackgroundColor;
      }
    };
  }, [viewer, status, basemap, worldType, world, worldModelActive, onLoadingChange]);
}
