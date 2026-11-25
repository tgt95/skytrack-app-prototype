import type { Viewer } from "cesium";
import type { StudioMission } from "@/domain/mission-model";
import { missionOrigin } from "@/domain/mission-model";
import { enuToLngLat, safeColor } from "./mission-scene-helpers";

type CesiumNS = typeof import("cesium");

/** Draws imported building footprints as display-only extruded polygons. */
export function syncMapSceneLayer(
  viewer: Viewer,
  Cesium: CesiumNS,
  mission: StudioMission,
) {
  const layer = mission.mapSceneLayer;
  if (!layer) return;
  const origin = missionOrigin(mission);
  const centerX =
    (layer.center.lon - origin.lng) *
    111_320 *
    Math.cos((origin.lat * Math.PI) / 180);
  const centerY = (layer.center.lat - origin.lat) * 111_320;
  const roofColor = Cesium.Color.fromCssColorString("#f4f5f6");
  const wallColor = Cesium.Color.fromCssColorString("#dfe2e5");
  const outlineColor = Cesium.Color.fromCssColorString("#c5cacf");
  const treeTrunkColor = safeColor(Cesium, "#76563a", "--muted-foreground", 1);
  const treeCanopyColors = ["#578b48", "#689b50", "#477b43"].map((color) =>
    safeColor(Cesium, color, "--primary", 1),
  );

  if (layer.buildings.length > 0) {
    viewer.shadows = true;
    viewer.terrainShadows = Cesium.ShadowMode.RECEIVE_ONLY;
    viewer.shadowMap.softShadows = true;
    viewer.shadowMap.darkness = 0.28;
    viewer.shadowMap.size = 2048;
  }

  layer.buildings.forEach((building, buildingIndex) => {
    building.polygons.forEach((polygon, polygonIndex) => {
      const coordinates = (ring: [number, number][]) =>
        ring.map(([x, y]) => {
          const geo = enuToLngLat(centerX + x, centerY + y, origin);
          return Cesium.Cartesian3.fromDegrees(geo.lng, geo.lat, 0);
        });
      const hierarchy = new Cesium.PolygonHierarchy(
        coordinates(polygon.outer),
        polygon.holes.map(
          (hole) => new Cesium.PolygonHierarchy(coordinates(hole)),
        ),
      );
      const height = Math.min(1000, Math.max(2, building.heightM));
      const id = building.id.replace(/[^a-z0-9_-]/giu, "-").slice(0, 80);
      const buildingEntityId =
        `ms-world-map-building-${buildingIndex}-${id}-${polygonIndex}`;
      viewer.entities.add({
        id: buildingEntityId,
        name: building.name || "Imported map building",
        description: `${height.toFixed(1)} m ${building.heightLabel} building height. Display context only; vertical reference is unverified.`,
        polygon: {
          hierarchy,
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          extrudedHeight: height,
          extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          material: wallColor,
          closeTop: false,
          closeBottom: true,
          outline: false,
          shadows: Cesium.ShadowMode.ENABLED,
        },
      });
      viewer.entities.add({
        id: `${buildingEntityId}-roof`,
        name: building.name || "Imported map building roof",
        polygon: {
          hierarchy,
          height,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          material: roofColor,
          outline: true,
          outlineColor,
          outlineWidth: 1,
          shadows: Cesium.ShadowMode.ENABLED,
        },
      });
    });
  });
  layer.landmarks.forEach((landmark, index) => {
    const geo = enuToLngLat(
      centerX + landmark.xM,
      centerY + landmark.yM,
      origin,
    );
    const position = Cesium.Cartesian3.fromDegrees(
      geo.lng,
      geo.lat,
      landmark.baseElevationM,
    );
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(landmark.rotationDeg),
        0,
        0,
      ),
    );
    const brightenDarkGlass = landmark.localModelPath.endsWith(
      "/landmark-81.glb",
    );
    viewer.entities.add({
      id: `ms-world-map-landmark-${index}-${landmark.id.replace(/[^a-z0-9_-]/giu, "-").slice(0, 80)}`,
      name: landmark.name,
      description:
        landmark.attribution ??
        `${landmark.heightM.toFixed(1)} m height reference.`,
      position,
      orientation,
      model: {
        uri: landmark.localModelPath,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        scale: landmark.scale,
        minimumPixelSize: 20,
        maximumScale: 1000,
        ...(brightenDarkGlass
          ? {
              imageBasedLightingFactor: new Cesium.Cartesian2(1, 1),
              colorBlendMode: Cesium.ColorBlendMode.MIX,
              color: Cesium.Color.WHITE,
              colorBlendAmount: 0.48,
            }
          : {}),
      },
    });
  });
  (layer.trees ?? []).forEach((tree, index) => {
    const geo = enuToLngLat(centerX + tree.xM, centerY + tree.yM, origin);
    const treeHeightM = Math.max(1, Math.min(tree.heightM, 80));
    const trunkHeightM = treeHeightM * 0.28;
    const canopyHeightM = treeHeightM * 0.58;
    const trunkRadiusM = Math.max(tree.canopyRadiusM * 0.09, 0.08);
    const trunkPosition = Cesium.Cartesian3.fromDegrees(
      geo.lng,
      geo.lat,
      trunkHeightM / 2,
    );
    const canopyPosition = Cesium.Cartesian3.fromDegrees(
      geo.lng,
      geo.lat,
      trunkHeightM + canopyHeightM / 2,
    );
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      canopyPosition,
      new Cesium.HeadingPitchRoll(0, 0, 0),
    );
    const id = tree.id.replace(/[^a-z0-9_-]/giu, "-").slice(0, 80);
    viewer.entities.add({
      id: `ms-world-map-tree-trunk-${index}-${id}`,
      name: "Imported tree trunk",
      position: trunkPosition,
      orientation,
      cylinder: {
        length: trunkHeightM,
        topRadius: trunkRadiusM * 0.7,
        bottomRadius: trunkRadiusM,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        material: treeTrunkColor,
      },
    });
    viewer.entities.add({
      id: `ms-world-map-tree-canopy-${index}-${id}`,
      name: "Imported tree canopy",
      position: canopyPosition,
      orientation,
      ellipsoid: {
        radii: new Cesium.Cartesian3(
          tree.canopyRadiusM,
          tree.canopyRadiusM,
          canopyHeightM / 2,
        ),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        material: treeCanopyColors[index % treeCanopyColors.length],
      },
    });
  });
}
