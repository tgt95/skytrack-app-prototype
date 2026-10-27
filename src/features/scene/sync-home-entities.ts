import { getMissionEnd, getMissionStart } from "../../domain/mission-model";
import { enuToLngLat } from "./mission-scene-helpers";
import type { CommittedEntityContext } from "./committed-entity-context";

/** Add the Home point and its departure/return connectors. */
export function addHomeConnectorEntities({
  viewer,
  Cesium,
  mission,
  origin,
  cssColor,
}: CommittedEntityContext): void {
  const home = mission.spawn;
  const homeGeo = enuToLngLat(home.x, home.y, origin);
  viewer.entities.add({
    id: "ms-home-point",
    name: "Drone Home point",
    position: Cesium.Cartesian3.fromDegrees(homeGeo.lng, homeGeo.lat, 0.8),
    point: {
      pixelSize: 18,
      color: cssColor("--primary", 1),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: "HOME",
      font: "700 11px sans-serif",
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: cssColor("--primary", 0.9),
      backgroundPadding: new Cesium.Cartesian2(7, 4),
      pixelOffset: new Cesium.Cartesian2(0, -25),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  const homeGround = { x: home.x, y: home.y, z: 0.8 };
  const homeLaunch = {
    x: home.x,
    y: home.y,
    z: Math.max(0.8, mission.takeoffAltM),
  };
  const missionStart = getMissionStart(mission);
  const departurePoints = [homeGround, homeLaunch, missionStart].flatMap(
    (point) => {
      const geo = enuToLngLat(point.x, point.y, origin);
      return [geo.lng, geo.lat, point.z];
    },
  );
  viewer.entities.add({
    id: "ms-home-departure",
    name: "Home to mission start",
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(departurePoints),
      width: 2.5,
      material: new Cesium.PolylineDashMaterialProperty({
        color: cssColor("--primary", 0.72),
        dashLength: 12,
      }),
      arcType: Cesium.ArcType.NONE,
    },
  });
  const lastMissionPoint = getMissionEnd(mission);
  if (mission.returnHomeOnEnd && lastMissionPoint) {
    const homeReturn = [
      { x: lastMissionPoint.x, y: lastMissionPoint.y, z: lastMissionPoint.z },
      { x: home.x, y: home.y, z: lastMissionPoint.z },
      homeGround,
    ].flatMap((point) => {
      const geo = enuToLngLat(point.x, point.y, origin);
      return [geo.lng, geo.lat, point.z];
    });
    viewer.entities.add({
      id: "ms-home-return",
      name: "Mission end to Home",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(homeReturn),
        width: 2.5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: cssColor("--primary", 0.72),
          dashLength: 12,
        }),
        arcType: Cesium.ArcType.NONE,
      },
    });
  }
}
