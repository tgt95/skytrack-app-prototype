import { useEffect, useRef, type MutableRefObject } from "react";
import type { Viewer } from "cesium";
import type { StudioMission } from "@/domain/mission-model";
import { missionOrigin } from "@/domain/mission-model";
import { fitMission } from "./scene-fit-mission";
import type { MissionWorldModelSource } from "./mission-scene-types";
import { useWorldModelScene } from "./use-world-model-scene";

type CesiumNS = typeof import("cesium");

export function useMissionWorldModelScene({
  viewerRef,
  cesiumRef,
  status,
  mission,
  missionRef,
  fitRef,
  source,
}: {
  viewerRef: MutableRefObject<Viewer | null>;
  cesiumRef: MutableRefObject<CesiumNS | null>;
  status: "loading" | "ready" | "error";
  mission: StudioMission;
  missionRef: MutableRefObject<StudioMission>;
  fitRef: MutableRefObject<typeof fitMission>;
  source?: MissionWorldModelSource;
}) {
  /* A selected/imported 3D World GLB must not suppress the globe or imagery
     in 2D photogrammetry missions. The mission's visible World is Blank space
     there, even if its persisted record still references an old GLB asset. */
  const sceneSource =
    mission.worldType === "3D" && mission.world !== "Blank space"
      ? source
      : undefined;
  const model = useWorldModelScene({
    viewerRef,
    cesiumRef,
    status,
    origin: missionOrigin(mission),
    missionRef,
    source: sceneSource,
  });
  const worldViewRef = useRef({
    world: mission.world,
    worldType: mission.worldType,
  });

  useEffect(() => {
    const previous = worldViewRef.current;
    worldViewRef.current = {
      world: mission.world,
      worldType: mission.worldType,
    };
    if (
      previous.world === mission.world &&
      previous.worldType === mission.worldType
    ) {
      return;
    }
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed() || status !== "ready") return;
    fitRef.current(viewer, Cesium, missionRef.current);
  }, [
    cesiumRef,
    fitRef,
    mission.world,
    mission.worldType,
    missionRef,
    status,
    viewerRef,
  ]);

  return model;
}
