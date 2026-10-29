import {
  generateAreaScan,
  generateAreaTraversal,
  getAreaFlightAltitudeM,
} from "../../domain/mission-model";
import {
  enuToLngLat,
  MAX_AREA_DISTANCE_LABELS_PER_AREA,
  ROUTE_DISTANCE_LABEL_DETAIL_DISTANCE_M,
} from "./mission-scene-helpers";
import type { AreaEntityContext } from "./committed-entity-context";
import { readMissionDesignPreferences } from "../../shared/mission-design-preferences";

/** Add Area/Avoid boundaries, scan lanes, and selected Avoid height handles. */
export function addAreaAndAvoidEntities({
  viewer,
  Cesium,
  mission,
  origin,
  cssColor,
  selection,
  showAreaSurface,
}: AreaEntityContext): void {
  const preferences = readMissionDesignPreferences();
  const areaLabelStyle = {
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineColor: Cesium.Color.BLACK.withAlpha(0.9),
    outlineWidth: 2,
  };
  const zoneEntity = (
    kind: "area" | "avoid",
    id: string,
    label: string,
    ring: { x: number; y: number }[],
    extrudeM?: number,
    baseM?: number,
  ) => {
    if (ring.length < 3) return;
    const deg = ring.flatMap((p) => {
      const g = enuToLngLat(p.x, p.y, origin);
      return [g.lng, g.lat];
    });
    const isAvoid = kind === "avoid";
    const selected = selection?.kind === kind && selection.id === id;
    const height = Math.max(0, extrudeM ?? 0);
    // Footprints render at their saved base altitude (legacy 0 keeps the
    // previous 0.15 m mock-floor look). Avoid prisms extrude upward from
    // the base; height 0 still renders a flat footprint.
    const base = Math.max(0, baseM ?? 0);
    viewer.entities.add({
      id: `ms-${kind}-${id}`,
      name: label,
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(deg),
        height: base > 0 ? base : 0.15,
        // Height 0 means zero height: render a flat footprint, never a
        // positive-volume prism. Saved height stays clamped >= 0.
        extrudedHeight: isAvoid && height > 0 ? base + height : undefined,
        material: isAvoid
          ? cssColor("--destructive", selected ? 0.4 : 0.22)
          : cssColor("--primary", selected ? 0.32 : 0.16),
        outline: false,
      },
    });
    const ringHeights = (heightM: number) => {
      const flat = ring.flatMap((p) => {
        const g = enuToLngLat(p.x, p.y, origin);
        return [g.lng, g.lat, heightM];
      });
      const first = ring[0];
      const firstGeo = enuToLngLat(first.x, first.y, origin);
      flat.push(firstGeo.lng, firstGeo.lat, heightM);
      return Cesium.Cartesian3.fromDegreesArrayHeights(flat);
    };
    const outlineColor = isAvoid
      ? cssColor("--destructive", 1)
      : cssColor("--primary", 1);
    viewer.entities.add({
      id: `ms-${kind}-outline-${id}`,
      polyline: {
        positions: ringHeights(base > 0 ? base : 0.15),
        width: selected ? 3 : 1.5,
        material: outlineColor,
        depthFailMaterial: new Cesium.PolylineDashMaterialProperty({
          color: outlineColor,
        }),
        arcType: Cesium.ArcType.NONE,
      },
    });
    if (isAvoid && height > 0) {
      viewer.entities.add({
        id: `ms-${kind}-top-outline-${id}`,
        polyline: {
          positions: ringHeights(base + height),
          width: selected ? 3 : 1.5,
          material: outlineColor,
          depthFailMaterial: new Cesium.PolylineDashMaterialProperty({
            color: outlineColor,
          }),
          arcType: Cesium.ArcType.NONE,
        },
      });
    }
  };
  for (const area of mission.areas) {
    // In 2D photogrammetry, keep the Area plane with its scan route. Rendering
    // the boundary at the drawing/launch altitude while scan lanes and photo
    // points sit at Recon altitude makes them appear detached in oblique view.
    const areaRenderAltitude =
      mission.worldType === "2D"
        ? getAreaFlightAltitudeM(area, mission.takeoffAltM, "2D")
        : (area.baseAltM ?? 0);
    if (mission.worldType !== "2D" || showAreaSurface) {
      zoneEntity(
        "area",
        area.id,
        area.label,
        area.points,
        undefined,
        areaRenderAltitude,
      );
    }
  }
  for (const avoid of mission.avoids)
    zoneEntity(
      "avoid",
      avoid.id,
      avoid.label,
      avoid.points,
      avoid.heightM ?? 15,
      avoid.baseAltM ?? 0,
    );

  // Area scan lanes: straight serpentine segments clipped inside the polygon.
  // Photogrammetry lanes share reconnaissance altitude with generated points.
  for (const area of mission.areas) {
    const stored = area.scanLines;
    const lanes = stored && stored.length > 0 ? stored : generateAreaScan(area);
    const areaWaypoints = mission.waypoints
      .filter((waypoint) => waypoint.generatedByArea === area.id)
      .sort((a, b) => a.seq - b.seq);
    const laneAlt =
      areaWaypoints[0]?.z ??
      getAreaFlightAltitudeM(
        area,
        mission.takeoffAltM,
        mission.worldType ?? "3D",
      );
    const traversal = generateAreaTraversal(area, lanes);
    if (preferences.showAreaScanLanes && traversal.length >= 2) {
      const flat: number[] = [];
      for (let pointIndex = 0; pointIndex < traversal.length; pointIndex += 1) {
        const p = traversal[pointIndex];
        const g = enuToLngLat(p.x, p.y, origin);
        flat.push(g.lng, g.lat, areaWaypoints[pointIndex]?.z ?? laneAlt);
      }
      viewer.entities.add({
        id: `ms-area-scan-${area.id}`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
          width: 2,
          material: cssColor("--primary", 0.7),
          depthFailMaterial: new Cesium.PolylineDashMaterialProperty({
            color: cssColor("--primary", 0.7),
          }),
          arcType: Cesium.ArcType.NONE,
        },
      });
      // Area flight-path leg labels: one-decimal distances between
      // consecutive traversal points (restores the generated-leg labels
      // lost when route labels narrowed to authored-only). Traversal
      // vertices only — never the polygon boundary ring.
      // Sample dense scan traversals instead of placing a distance on every leg.
      const distanceLabelStride = Math.max(
        1,
        Math.ceil((traversal.length - 1) / MAX_AREA_DISTANCE_LABELS_PER_AREA),
      );
      for (
        let i = 1;
        preferences.showRouteDistances && i < traversal.length;
        i += 1
      ) {
        if ((i - 1) % distanceLabelStride !== 0 && i !== traversal.length - 1) {
          continue;
        }
        const a = traversal[i - 1];
        const b = traversal[i];
        const lengthM = Math.hypot(b.x - a.x, b.y - a.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const g = enuToLngLat(mid.x, mid.y, origin);
        const labelAlt =
          ((areaWaypoints[i - 1]?.z ?? laneAlt) +
            (areaWaypoints[i]?.z ?? laneAlt)) /
          2;
        viewer.entities.add({
          id: `ms-area-len-${area.id}-${i}`,
          position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, labelAlt),
          label: {
            ...areaLabelStyle,
            text: `${lengthM.toFixed(1)} m`,
            font: "600 12px sans-serif",
            fillColor: Cesium.Color.WHITE,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              0,
              ROUTE_DISTANCE_LABEL_DETAIL_DISTANCE_M,
            ),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    }
  }

  // Avoid vertical Z affordance: ground-center line + top drag handle.
  // The handle floats at a visual minimum so a zero-height volume stays
  // grabbable; the label always shows the saved height (>= 0). Line and
  // handle rise with the saved base altitude; drag edits height only.
  for (const avoid of mission.avoids) {
    if (avoid.points.length < 3) continue;
    const center = avoid.points.reduce(
      (acc, p) => ({
        x: acc.x + p.x / avoid.points.length,
        y: acc.y + p.y / avoid.points.length,
      }),
      { x: 0, y: 0 },
    );
    const g = enuToLngLat(center.x, center.y, origin);
    const base = Math.max(0, avoid.baseAltM ?? 0);
    const height = Math.max(0, avoid.heightM ?? 15);
    const visualTop = Math.max(height, 2);
    const selected = selection?.kind === "avoid" && selection.id === avoid.id;
    viewer.entities.add({
      id: `ms-avoid-z-${avoid.id}`,
      show: selected,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          g.lng,
          g.lat,
          base + 0.2,
          g.lng,
          g.lat,
          base + Math.max(visualTop, 0.2),
        ]),
        width: 2,
        material: cssColor("--destructive", 0.9),
        arcType: Cesium.ArcType.NONE,
      },
    });
    viewer.entities.add({
      id: `ms-avoid-height-${avoid.id}`,
      show: selected,
      position: Cesium.Cartesian3.fromDegrees(
        g.lng,
        g.lat,
        base + Math.max(visualTop, 0.4),
      ),
      point: {
        pixelSize: 14,
        color: cssColor("--destructive", 1),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `${height.toFixed(1)} m`,
        font: "600 11px sans-serif",
        fillColor: Cesium.Color.WHITE,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }
}
