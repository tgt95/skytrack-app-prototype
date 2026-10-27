import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { Viewer } from "cesium";
import type { StudioMission } from "../../domain/mission-model";
import type { MapTileOrigin } from "../../shared/map-tiles";
import type { MissionWorldModelSource } from "./mission-scene-types";
import { loadWorldGlbModel, type WorldGlbSceneState } from "./load-world-glb-model";

type CesiumNS = typeof import("cesium");

export function useWorldModelScene({
  viewerRef,
  cesiumRef,
  status,
  origin,
  missionRef,
  source,
}: {
  viewerRef: { current: Viewer | null };
  cesiumRef: { current: CesiumNS | null };
  status: "loading" | "ready" | "error";
  origin: MapTileOrigin;
  missionRef: MutableRefObject<StudioMission>;
  source?: MissionWorldModelSource;
}) {
  const active = Boolean(source?.assetId);
  const originLat = origin.lat;
  const originLng = origin.lng;
  const [renderState, setRenderState] = useState<WorldGlbSceneState>("loading");
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !source?.blob) {
      if (!active) {
        setRenderState("ready");
        setRenderError(null);
      }
      return;
    }
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed() || status !== "ready") return;
    return loadWorldGlbModel({
      viewer,
      Cesium,
      origin: { lat: originLat, lng: originLng },
      blob: source.blob,
      missionRef,
      onState: (nextState, message) => {
        setRenderState(nextState);
        setRenderError(message ?? null);
      },
    });
  }, [
    active,
    cesiumRef,
    originLat,
    originLng,
    missionRef,
    source?.assetId,
    source?.blob,
    status,
    viewerRef,
  ]);

  const error = source?.error ?? renderError;
  const loading =
    active &&
    status === "ready" &&
    !error &&
    (Boolean(source?.loading) || !source?.blob || renderState === "loading");
  return { active, loading, error };
}
