import type { Model, Viewer } from "cesium";
import type { MutableRefObject } from "react";
import type { MapTileOrigin } from "../../shared/map-tiles";
import { missionOrigin, type StudioMission } from "../../domain/mission-model";
import { enuToLngLat } from "./mission-scene-helpers";

type CesiumNS = typeof import("cesium");
export type WorldGlbSceneState = "loading" | "ready" | "error";

/** Adds one browser-local GLB primitive at the mission ENU origin. */
export function loadWorldGlbModel({
  viewer,
  Cesium,
  origin,
  blob,
  missionRef,
  onState,
}: {
  viewer: Viewer;
  Cesium: CesiumNS;
  origin: MapTileOrigin;
  blob: Blob;
  missionRef: MutableRefObject<StudioMission>;
  onState: (state: WorldGlbSceneState, message?: string) => void;
}): () => void {
  let cancelled = false;
  let primitive: Model | null = null;
  let removeReadyListener: (() => void) | null = null;
  let urlRevoked = false;
  const url = URL.createObjectURL(blob);
  const anchor = Cesium.Cartesian3.fromDegrees(origin.lng, origin.lat, 0);
  const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(anchor);
  const revokeUrl = () => {
    if (urlRevoked) return;
    URL.revokeObjectURL(url);
    urlRevoked = true;
  };
  const fail = () => {
    removeReadyListener?.();
    removeReadyListener = null;
    revokeUrl();
    if (primitive && !viewer.isDestroyed()) {
      viewer.scene.primitives.remove(primitive);
      primitive = null;
      viewer.scene.requestRender();
    }
    if (!cancelled) {
      onState("error", "This GLB could not be loaded in the 3D scene.");
    }
  };

  onState("loading");
  void Cesium.Model.fromGltfAsync({ url, modelMatrix })
    .then((model) => {
      if (cancelled || viewer.isDestroyed()) {
        if (!model.isDestroyed()) model.destroy();
        revokeUrl();
        return;
      }
      primitive = viewer.scene.primitives.add(model);
      const fitLoadedModel = () => {
        removeReadyListener?.();
        removeReadyListener = null;
        if (cancelled || viewer.isDestroyed() || !model.ready) return;
        try {
          const mission = missionRef.current;
          const missionOriginValue = missionOrigin(mission);
          const missionPoints = [
            mission.spawn,
            ...mission.waypoints,
            ...mission.areas.flatMap((area) => area.points),
            ...mission.avoids.flatMap((zone) => zone.points),
          ].map((point) => {
            const geo = enuToLngLat(point.x, point.y, missionOriginValue);
            return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, 0);
          });
          const geometrySphere = Cesium.BoundingSphere.fromPoints(missionPoints);
          const sceneSphere = Cesium.BoundingSphere.union(
            model.boundingSphere,
            geometrySphere,
          );
          viewer.camera.viewBoundingSphere(
            sceneSphere,
            new Cesium.HeadingPitchRange(
              0.6,
              -0.62,
              Math.max(8, sceneSphere.radius * 1.6),
            ),
          );
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
          viewer.scene.requestRender();
          onState("ready");
          revokeUrl();
        } catch {
          fail();
        }
      };
      if (model.ready) fitLoadedModel();
      else removeReadyListener = model.readyEvent.addEventListener(fitLoadedModel);
      viewer.scene.requestRender();
    })
    .catch(() => {
      fail();
    });

  return () => {
    cancelled = true;
    removeReadyListener?.();
    removeReadyListener = null;
    revokeUrl();
    if (!primitive || viewer.isDestroyed()) return;
    viewer.scene.primitives.remove(primitive);
    primitive = null;
    viewer.scene.requestRender();
  };
}
