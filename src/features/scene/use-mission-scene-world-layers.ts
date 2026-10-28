import { useEffect, type MutableRefObject } from "react";
import type { Viewer } from "cesium";
import type { StudioMission } from "../../domain/mission-model";
import { safeColor, themeColor } from "./mission-scene-helpers";
import type { MissionWorldModelSource } from "./mission-scene-types";
import { fitMission } from "./scene-camera-gestures";
import { useMissionWorldModelScene } from "./use-mission-world-model-scene";
import { useSceneBasemap } from "./use-scene-basemap";
import type { MissionBasemapStyle } from "./basemaps";

type CesiumNS = typeof import("cesium");

/** Composes the mission's 3D World model, imagery basemap, and scene background. */
export function useMissionSceneWorldLayers({
  viewerRef,
  cesiumRef,
  status,
  mission,
  missionRef,
  fitRef,
  source,
  basemap,
}: {
  viewerRef: MutableRefObject<Viewer | null>;
  cesiumRef: MutableRefObject<CesiumNS | null>;
  status: "loading" | "ready" | "error";
  mission: StudioMission;
  missionRef: MutableRefObject<StudioMission>;
  fitRef: MutableRefObject<typeof fitMission>;
  source?: MissionWorldModelSource;
  basemap: MissionBasemapStyle;
}) {
  const worldModel = useMissionWorldModelScene({
    viewerRef,
    cesiumRef,
    status,
    mission,
    missionRef,
    fitRef,
    source,
  });

  useSceneBasemap({
    viewer: viewerRef.current,
    status,
    basemap,
    worldType: mission.worldType,
    world: mission.world,
    worldModelActive: worldModel.active,
  });

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed() || status !== "ready")
      return;
    const sceneBaseColor =
      mission.worldType === "2D"
        ? safeColor(Cesium, themeColor("--muted"), "--muted", 1)
        : Cesium.Color.BLACK;
    viewer.scene.globe.baseColor = sceneBaseColor;
    viewer.scene.backgroundColor = sceneBaseColor;
    viewer.scene.requestRender();
  }, [mission.worldType, status]);

  return worldModel;
}
