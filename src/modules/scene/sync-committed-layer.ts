import type { Viewer } from "cesium";
import { computeDerivedTransfers } from "../../domain/transfer-planner";
import {
  generateAreaScan,
  generateAreaTraversal,
  getAreaFlightAltitudeM,
  getMissionEnd,
  getMissionRouteWaypoints,
  getMissionRoutes,
  getMissionStart,
  missionOrigin,
  type SceneSelection,
  type StudioMission,
} from "../../domain/mission-model";
import {
  droneMarkerImage,
  enuToLngLat,
  plusMarkerImage,
  safeColor,
  themeColor,
  type SceneToken,
} from "./mission-scene-helpers";
import { removeSceneEntitiesInLayer } from "./scene-entity-ownership";
import {
  syncWorldTerrain,
  type WorldTerrainTriangle,
} from "./sync-world-terrain";

type CesiumNS = typeof import("cesium");

interface SyncCommittedMissionEntitiesParams {
  viewer: Viewer;
  Cesium: CesiumNS;
  mission: StudioMission;
  selection: SceneSelection | null;
  simActive: boolean;
  showAreaSurface: boolean;
  focusedPhotoWaypointId: string | null;
}

/** Rebuilds the committed mission layer only; draft, capture, preview, guide, and search layers survive. */
export function syncCommittedMissionEntities({
  viewer,
  Cesium,
  mission,
  selection,
  simActive,
  showAreaSurface,
  focusedPhotoWaypointId,
}: SyncCommittedMissionEntitiesParams): WorldTerrainTriangle[] {
  removeSceneEntitiesInLayer(viewer.entities, "committed");
  const cssColor = (
    varName: SceneToken,
    alpha: number,
  ): import("cesium").Color =>
    safeColor(Cesium, themeColor(varName), varName, alpha);
  let worldTerrainTriangles: WorldTerrainTriangle[] = [];
  const home = mission.spawn;
  const homeGeo = enuToLngLat(home.x, home.y, missionOrigin(mission));
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
      const geo = enuToLngLat(point.x, point.y, missionOrigin(mission));
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
      const geo = enuToLngLat(point.x, point.y, missionOrigin(mission));
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

  worldTerrainTriangles = syncWorldTerrain(viewer, Cesium, mission);

  // Sample Facade context block removed (F007): grid, route, Areas,
  // Avoid zones and markers below are the only scene objects.

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
      const g = enuToLngLat(p.x, p.y, missionOrigin(mission));
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
        const g = enuToLngLat(p.x, p.y, missionOrigin(mission));
        return [g.lng, g.lat, heightM];
      });
      const first = ring[0];
      const firstGeo = enuToLngLat(first.x, first.y, missionOrigin(mission));
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
    if (traversal.length >= 2) {
      const flat: number[] = [];
      for (let pointIndex = 0; pointIndex < traversal.length; pointIndex += 1) {
        const p = traversal[pointIndex];
        const g = enuToLngLat(p.x, p.y, missionOrigin(mission));
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
      for (let i = 1; i < traversal.length; i += 1) {
        const a = traversal[i - 1];
        const b = traversal[i];
        const lengthM = Math.hypot(b.x - a.x, b.y - a.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const g = enuToLngLat(mid.x, mid.y, missionOrigin(mission));
        const labelAlt =
          ((areaWaypoints[i - 1]?.z ?? laneAlt) +
            (areaWaypoints[i]?.z ?? laneAlt)) /
          2;
        viewer.entities.add({
          id: `ms-area-len-${area.id}-${i}`,
          position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, labelAlt),
          label: {
            text: `${lengthM.toFixed(1)} m`,
            font: "11px sans-serif",
            fillColor: Cesium.Color.WHITE,
            pixelOffset: new Cesium.Cartesian2(0, -14),
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
    const g = enuToLngLat(center.x, center.y, missionOrigin(mission));
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
        const g = enuToLngLat(p.x, p.y, missionOrigin(mission));
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
        const g = enuToLngLat(p.x, p.y, missionOrigin(mission));
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
      const g = enuToLngLat(mid.x, mid.y, missionOrigin(mission));
      viewer.entities.add({
        id: `ms-transfer-len-${transfer.id}`,
        position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
        label: {
          text: `${transfer.distanceM.toFixed(1)} m · Transfer`,
          font: "italic 11px sans-serif",
          fillColor: Cesium.Color.fromCssColorString("#c4b5fd"),
          pixelOffset: new Cesium.Cartesian2(0, -14),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }
  }

  // Home remains a distinct ground marker. Mission geometry starts at its
  // first authored waypoint or Area scan point.

  // Numbered waypoints. Generated avoid-detour points use a distinct
  // destructive outline so they read as derived, not authored.
  for (const wp of mission.waypoints) {
    const g = enuToLngLat(wp.x, wp.y, missionOrigin(mission));
    const selected = selection?.kind === "waypoint" && selection.id === wp.id;
    const isDetour = !!wp.generatedByAvoid;
    const isHiddenPhotoWaypoint =
      focusedPhotoWaypointId !== null &&
      wp.id !== focusedPhotoWaypointId &&
      wp.actions.some((action) => action.kind === "photo");
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
      label: {
        text: String(wp.seq),
        font: "600 11px sans-serif",
        fillColor: selected
          ? isDetour
            ? cssColor("--destructive", 1)
            : cssColor("--primary", 1)
          : Cesium.Color.WHITE,
        pixelOffset: new Cesium.Cartesian2(0, 18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    // (T-016) no hover remove badge: deletion is click-again on the
    // selected waypoint. First click selects; the point itself stays the
    // only pick target.
  }

  // Straight-segment helpers: 1-decimal length labels on every leg within a route,
  // plus a midpoint insertion marker only between adjacent authored waypoints of the same route.
  routes.forEach((r) => {
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
      const g = enuToLngLat(mid.x, mid.y, missionOrigin(mission));
      viewer.entities.add({
        id: `ms-route-len-${r.id}-${i}`,
        position: Cesium.Cartesian3.fromDegrees(g.lng, g.lat, mid.z),
        label: {
          text: `${lengthM.toFixed(1)} m`,
          font: "11px sans-serif",
          fillColor: Cesium.Color.WHITE,
          pixelOffset: new Cesium.Cartesian2(0, -14),
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
    const g = enuToLngLat(mid.x, mid.y, missionOrigin(mission));
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
  const vg = enuToLngLat(startXy.x, startXy.y, missionOrigin(mission));
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

  return worldTerrainTriangles;
}
