import { computeDerivedTransfers } from "../../domain/transfer-planner";
import {
  getMissionRouteWaypoints,
  getMissionRoutes,
  getMissionStart,
} from "../../domain/mission-model";
import {
  droneMarkerImage,
  enuToLngLat,
  MAX_AREA_WAYPOINT_LABELS_PER_AREA,
  plusMarkerImage,
  ROUTE_DISTANCE_LABEL_DETAIL_DISTANCE_M,
  safeColor,
  themeColor,
  WAYPOINT_LABEL_DETAIL_DISTANCE_M,
} from "./mission-scene-helpers";
import type { RouteEntityContext } from "./committed-entity-context";
import { readMissionDesignPreferences } from "../../shared/mission-design-preferences";
import { formatDistance } from "../../shared/measurement-units";

/** Add Route lines, derived transfers, waypoints, labels, insert markers, and vehicle. */
export function addRouteEntities({
  viewer,
  Cesium,
  mission,
  origin,
  cssColor,
  selection,
  simActive,
  focusedPhotoWaypointId,
}: RouteEntityContext): void {
  const preferences = readMissionDesignPreferences();
  const legLabelStyle = {
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineColor: Cesium.Color.BLACK.withAlpha(0.9),
    outlineWidth: 2,
  };
  // Route polylines: render each Route independently.
  const routes = getMissionRoutes(mission);
  // The preview-capture scan overlay is owned by the preview layer: its
  // own render loop re-renders it when the captured waypoint or the
  // mission geometry changes, so this effect never deletes it.
  // T-021 AC11: every Route line begins at its first waypoint (Route 1
  // begins at waypoint 1). No synthetic spawn leg.
  routes.forEach((r) => {
    const rWaypoints = getMissionRouteWaypoints(mission, r.id);
    const pts = [...rWaypoints];
    if (pts.length >= 2) {
      const flat: number[] = [];
      for (const p of pts) {
        const g = enuToLngLat(p.x, p.y, origin);
        flat.push(g.lng, g.lat, p.z);
      }
      viewer.entities.add({
        id: `ms-route-${r.id}`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
          width: 3,
          material: cssColor("--primary", 0.95),
          arcType: Cesium.ArcType.NONE,
        },
      });
    }
  });

  // Derived planner transfers: non-editable preview between consecutive
  // routes and consecutive areas. Recomputed from current geometry.
  const transfers = computeDerivedTransfers(mission);
  for (const transfer of transfers) {
    if (transfer.points.length >= 2) {
      const flat: number[] = [];
      for (const p of transfer.points) {
        const g = enuToLngLat(p.x, p.y, origin);
        flat.push(g.lng, g.lat, p.z);
      }
      viewer.entities.add({
        id: `ms-transfer-${transfer.id}`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(flat),
          width: 2.5,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString("#a78bfa"),
            dashLength: 16,
          }),
          arcType: Cesium.ArcType.NONE,
        },
      });

      const midIdx = Math.floor(transfer.points.length / 2);
      const midA = transfer.points[Math.max(0, midIdx - 1)];
      const midB = transfer.points[midIdx];
      const mid = {
        x: (midA.x + midB.x) / 2,
        y: (midA.y + midB.y) / 2,
        z: (midA.z + midB.z) / 2,
      };
      const g = enuToLngLat(mid.x, mid.y, origin);
      viewer.entities.add({
        id: `ms-transfer-len-${transfer.id}`,
        position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
        label: {
          ...legLabelStyle,
          text: `${formatDistance(transfer.distanceM, preferences.unitSystem)} · Transfer`,
          font: "italic 600 12px sans-serif",
          fillColor: Cesium.Color.fromCssColorString("#c4b5fd"),
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

  // Home remains a distinct ground marker. Mission geometry starts at its
  // first authored waypoint or Area scan point.

  // Area scans generate a waypoint at each lane vertex; sample their sequence
  // labels so a large scan grid does not paint a number beside every marker.
  const sampledAreaWaypointIds = new Set<string>();
  for (const area of mission.areas) {
    const areaWaypoints = mission.waypoints
      .filter((waypoint) => waypoint.generatedByArea === area.id)
      .sort((a, b) => a.seq - b.seq);
    const stride = Math.max(
      1,
      Math.ceil(areaWaypoints.length / MAX_AREA_WAYPOINT_LABELS_PER_AREA),
    );
    areaWaypoints.forEach((waypoint, index) => {
      if (
        index === 0 ||
        index === areaWaypoints.length - 1 ||
        index % stride === 0
      ) {
        sampledAreaWaypointIds.add(waypoint.id);
      }
    });
  }

  // Numbered waypoints. Generated avoid-detour points use a distinct
  // destructive outline so they read as derived, not authored.
  for (const wp of mission.waypoints) {
    const g = enuToLngLat(wp.x, wp.y, origin);
    const selected = selection?.kind === "waypoint" && selection.id === wp.id;
    const isDetour = !!wp.generatedByAvoid;
    const isHiddenPhotoWaypoint =
      focusedPhotoWaypointId !== null &&
      wp.id !== focusedPhotoWaypointId &&
      wp.actions.some((action) => action.kind === "photo");
    const showWaypointLabel =
      preferences.showWaypointLabels &&
      (selected || !wp.generatedByArea || sampledAreaWaypointIds.has(wp.id));
    viewer.entities.add({
      id: `ms-wp-${wp.id}`,
      name: isDetour ? `Generated detour ${wp.seq}` : `Waypoint ${wp.seq}`,
      show: !isHiddenPhotoWaypoint,
      position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, wp.z),
      point: {
        pixelSize: selected ? 16 : 11,
        color: selected
          ? Cesium.Color.WHITE
          : isDetour
            ? cssColor("--destructive", 1)
            : cssColor("--primary", 1),
        outlineColor: selected
          ? isDetour
            ? cssColor("--destructive", 1)
            : cssColor("--primary", 1)
          : Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: showWaypointLabel
        ? {
            ...legLabelStyle,
            text: String(wp.seq),
            font: "600 12px sans-serif",
            fillColor: selected
              ? isDetour
                ? cssColor("--destructive", 1)
                : cssColor("--primary", 1)
              : Cesium.Color.WHITE,
            pixelOffset: new Cesium.Cartesian2(0, 18),
            distanceDisplayCondition: selected
              ? undefined
              : new Cesium.DistanceDisplayCondition(
                  0,
                  WAYPOINT_LABEL_DETAIL_DISTANCE_M,
                ),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }
        : undefined,
    });
    // (T-016) no hover remove badge: deletion is click-again on the
    // selected waypoint. First click selects; the point itself stays the
    // only pick target.
  }

  // Straight-segment helpers: 1-decimal length labels on every leg within a route,
  // plus a midpoint insertion marker only between adjacent authored waypoints of the same route.
  routes.forEach((r) => {
    if (!preferences.showRouteDistances) return;
    const rWaypoints = getMissionRouteWaypoints(mission, r.id);
    const routeForLabels = [...rWaypoints];
    for (let i = 1; i < routeForLabels.length; i += 1) {
      const a = routeForLabels[i - 1];
      const b = routeForLabels[i];
      const lengthM = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      const mid = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (a.z + b.z) / 2,
      };
      const g = enuToLngLat(mid.x, mid.y, origin);
      viewer.entities.add({
        id: `ms-route-len-${r.id}-${i}`,
        position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
        label: {
          ...legLabelStyle,
          text: formatDistance(lengthM, preferences.unitSystem),
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
  });

  for (let j = 1; j < mission.waypoints.length; j += 1) {
    const a = mission.waypoints[j - 1];
    const b = mission.waypoints[j];
    if (
      a.generatedByArea ||
      a.generatedByAvoid ||
      b.generatedByArea ||
      b.generatedByAvoid
    )
      continue;
    if (a.routeId && b.routeId && a.routeId !== b.routeId) continue;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    const g = enuToLngLat(mid.x, mid.y, origin);
    // 22 px billboard (constant screen size): white disc with the `+`
    // glyph baked in — an ≥16 px hit target with the affordance inside.
    const plusCss = safeColor(
      Cesium,
      themeColor("--primary"),
      "--primary",
      1,
    ).toCssColorString();
    viewer.entities.add({
      id: `ms-route-insert-${j}`,
      show: false,
      position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
      billboard: {
        image: plusMarkerImage(plusCss),
        width: 22,
        height: 22,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  }

  // Vehicle at the derived mission start (waypoint 1 / first scan point;
  // legacy spawn only when no sequence geometry exists).
  const startXy = getMissionStart(mission);
  const vg = enuToLngLat(startXy.x, startXy.y, origin);
  viewer.entities.add({
    id: "ms-vehicle",
    show: simActive,
    position: Cesium.Cartesian3.fromDegrees(
      vg.lng,
      vg.lat,
      Math.max(startXy.z, 0.5),
    ),
    billboard: {
      image: droneMarkerImage(
        safeColor(
          Cesium,
          themeColor("--warning"),
          "--warning",
          1,
        ).toCssColorString(),
      ),
      width: 38,
      height: 38,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: "Drone",
      font: "700 12px sans-serif",
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.72),
      backgroundPadding: new Cesium.Cartesian2(6, 4),
      pixelOffset: new Cesium.Cartesian2(0, -28),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}
