import { useEffect, type MutableRefObject } from "react";
import type { Viewer } from "cesium";
import type { StudioMission } from "@/domain/mission-model";
import type { MissionWorldModelSource } from "./mission-scene-types";
import { fitMission } from "./scene-fit-mission";
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
  onBasemapLoadingChange,
}: {
  viewerRef: MutableRefObject<Viewer | null>;
  cesiumRef: MutableRefObject<CesiumNS | null>;
  status: "loading" | "ready" | "error";
  mission: StudioMission;
  missionRef: MutableRefObject<StudioMission>;
  fitRef: MutableRefObject<typeof fitMission>;
  source?: MissionWorldModelSource;
  basemap: MissionBasemapStyle;
  onBasemapLoadingChange?: (loading: boolean) => void;
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
    onLoadingChange: onBasemapLoadingChange,
  });

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed() || status !== "ready")
      return;
    const isDarkBasemap = basemap === "dark";
    const isOsmBasemap = basemap === "basic" || basemap === "openstreetmap";
    const sceneBaseColor =
      mission.worldType === "2D" && isDarkBasemap
        ? Cesium.Color.fromCssColorString("#17191e")
        : mission.worldType === "2D" && isOsmBasemap
          ? Cesium.Color.fromCssColorString("#f2efe9")
          : mission.worldType === "2D"
            ? Cesium.Color.TRANSPARENT
            : Cesium.Color.BLACK;
    viewer.scene.globe.baseColor = sceneBaseColor;
    viewer.scene.backgroundColor = sceneBaseColor;
    viewer.scene.skyAtmosphere.show =
      mission.worldType === "2D" && !isDarkBasemap;
    if (viewer.scene.skyBox) {
      viewer.scene.skyBox.show =
        !(mission.worldType === "2D" && isDarkBasemap);
    }
    viewer.scene.skyAtmosphere.hueShift = 0;
    viewer.scene.skyAtmosphere.saturationShift = isDarkBasemap ? -0.35 : 0;
    viewer.scene.skyAtmosphere.brightnessShift = isDarkBasemap ? -0.3 : 0;
    viewer.scene.globe.showGroundAtmosphere =
      mission.worldType === "2D" && !isDarkBasemap;
    viewer.scene.requestRender();
  }, [basemap, mission.worldType, status]);

  return worldModel;
}
