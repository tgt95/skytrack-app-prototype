import type { Viewer } from "cesium";
import { missionOrigin, type StudioMission } from "@/domain/mission-model";
import { enuToLngLat } from "./mission-scene-helpers";

type CesiumNS = typeof import("cesium");

/** Frames all authored mission geometry in the current scene viewport. */
export function fitMission(
  viewer: Viewer,
  Cesium: CesiumNS,
  missionSnap: StudioMission,
) {
  const snapOrigin = missionOrigin(missionSnap);
  const missionPoints = [
    ...missionSnap.waypoints,
    ...missionSnap.areas.flatMap((area) => area.points),
    ...missionSnap.avoids.flatMap((zone) => zone.points),
  ];
  const pts = missionPoints.map((point) => {
    const geo = enuToLngLat(point.x, point.y, snapOrigin);
    const height = "z" in point && typeof point.z === "number" ? point.z : 0;
    return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, height);
  });

  if (pts.length === 0 && missionSnap.mapSceneLayer) {
    const layer = missionSnap.mapSceneLayer;
    const maxHeight = Math.max(
      0,
      ...layer.buildings.map((building) => building.heightM),
      ...layer.landmarks.map((landmark) => landmark.heightM),
    );
    const range = Math.max(layer.widthM * 2.5, maxHeight * 2.8, 500);
    const heading = 0.6;
    const pitch = (-55 * Math.PI) / 180;
    const cameraHeight = range;
    const groundOffset = cameraHeight / Math.tan(Math.abs(pitch));
    const centerX =
      (layer.center.lon - snapOrigin.lng) *
      111_320 *
      Math.cos((snapOrigin.lat * Math.PI) / 180);
    const centerY = (layer.center.lat - snapOrigin.lat) * 111_320;
    const cameraGeo = enuToLngLat(
      centerX - Math.sin(heading) * groundOffset,
      centerY - Math.cos(heading) * groundOffset,
      snapOrigin,
    );
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        cameraGeo.lng,
        cameraGeo.lat,
        cameraHeight,
      ),
      orientation: { heading, pitch, roll: 0 },
    });
    viewer.scene.requestRender();
    return;
  }

  if (pts.length === 0) {
    const importedTerrain = missionSnap.terrainLayer;
    const isNamedLegacyWorld =
      missionSnap.worldType !== "2D" && missionSnap.world !== "Blank space";
    const cameraOffset = isNamedLegacyWorld ? 195 : 0;
    const geo = importedTerrain
      ? { lat: importedTerrain.center.lat, lng: importedTerrain.center.lon }
      : enuToLngLat(
          missionSnap.spawn.x,
          missionSnap.spawn.y - cameraOffset,
          snapOrigin,
        );
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        geo.lng,
        geo.lat,
        isNamedLegacyWorld
          ? 280
          : importedTerrain
            ? Math.max(importedTerrain.widthM * 1.2, 120)
            : 120,
      ),
      orientation: {
        heading: 0,
        pitch:
          importedTerrain && missionSnap.worldType === "2D"
            ? -Math.PI / 2
            : isNamedLegacyWorld
              ? (-55 * Math.PI) / 180
              : -Math.PI / 3,
        roll: 0,
      },
    });
    viewer.scene.requestRender();
    return;
  }

  const sphere = Cesium.BoundingSphere.fromPoints(pts);
  const aspectRatio = Math.max(
    0.35,
    viewer.canvas.clientWidth / Math.max(viewer.canvas.clientHeight, 1),
  );
  const range = Math.max(70, (sphere.radius * 3.2) / Math.min(1, aspectRatio));
  viewer.camera.setView({
    destination: sphere.center,
    orientation: { heading: 0.6, pitch: -0.62, roll: 0 },
  });
  viewer.camera.moveBackward(range);
  viewer.scene.requestRender();
}
