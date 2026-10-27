import L from "leaflet";
import {
  enuToLngLat,
  getMissionRoutes,
  lngLatToEnu,
  projectMockReconFootprintToGround,
  type GeoOrigin,
  type SceneSelection,
  type SceneTool,
  type StudioMission,
} from "../../domain/mission-model";

type EnuPoint = { x: number; y: number };
export type { EnuPoint };
export type PendingPoint = EnuPoint & { z?: number };

const ROUTE_COLORS = ["#7357ff", "#1677ff", "#00a876", "#f08a24"];
const AREA_COLOR = "#00b777";
const AVOID_COLOR = "#e5484d";

/* Leaflet keeps its [lat, lng] tuple adapter; the domain conversion stays the
   single owner of the formula and returns { lng, lat }. */
export function enuToLatLng(point: EnuPoint, origin: GeoOrigin): L.LatLngTuple {
  const geo = enuToLngLat(point.x, point.y, origin);
  return [geo.lat, geo.lng];
}

export function latLngToEnu(point: L.LatLng, origin: GeoOrigin): EnuPoint {
  return lngLatToEnu(point.lng, point.lat, origin);
}

function equalSelection(
  a: SceneSelection | null,
  kind: SceneSelection["kind"],
  id: string,
): boolean {
  return a?.kind === kind && a.id === id;
}

function pointDistance(a: EnuPoint, b: EnuPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function waypointForwardDirection(
  orderedPoints: readonly EnuPoint[],
  index: number,
): EnuPoint {
  const current = orderedPoints[index];
  const next = orderedPoints[index + 1];
  const prior = orderedPoints[index - 1];
  const dx = next ? next.x - current.x : prior ? current.x - prior.x : 0;
  const dy = next ? next.y - current.y : prior ? current.y - prior.y : 1;
  const length = Math.hypot(dx, dy);
  return length > 0.001 ? { x: dx / length, y: dy / length } : { x: 0, y: 1 };
}

function waypointIcon(
  seq: number,
  selected: boolean,
  photo: boolean,
): L.DivIcon {
  const color = selected ? "#ffffff" : photo ? "#6b4eff" : "#20242d";
  const text = selected ? "#6b4eff" : "#ffffff";
  return L.divIcon({
    className: "ms-map-waypoint-icon",
    html: `<span role="img" aria-label="Waypoint ${seq}${photo ? ", photo capture" : ""}" class="flex size-[26px] items-center justify-center rounded-full border-2 border-solid border-white bg-(--ms-waypoint-marker-bg) text-(--ms-waypoint-marker-fg) text-[12px] leading-none font-bold font-[system-ui] shadow-[0_1px_5px_#0008]" style="--ms-waypoint-marker-bg:${color};--ms-waypoint-marker-fg:${text}">${seq}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    tooltipAnchor: [0, -14],
  });
}

function draftMarkerIcon(index: number): L.DivIcon {
  return L.divIcon({
    className: "ms-map-draft-icon",
    html: `<span role="img" aria-label="Draft point ${index + 1}" class="block size-3 rounded-full border-2 border-solid border-white bg-[#7357ff] shadow-[0_1px_4px_#0008]"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export interface MissionMap2DLayerOptions {
  map: L.Map;
  group: L.LayerGroup;
  mission: StudioMission;
  origin: GeoOrigin;
  tool: SceneTool;
  selection: SceneSelection | null;
  pendingPoints: PendingPoint[];
  draftCursor: EnuPoint | null;
  zoneShape: "polygon" | "cylinder";
  showPhotoMarkers: boolean;
  showCameraFootprint: boolean;
  onWaypointSelect: (id: string) => void;
  onZoneSelect: (kind: "area" | "avoid", id: string) => void;
}

export function drawMissionMapLayers({
  map,
  group,
  mission,
  origin,
  tool,
  selection,
  pendingPoints,
  draftCursor,
  zoneShape,
  showPhotoMarkers,
  showCameraFootprint,
  onWaypointSelect,
  onZoneSelect,
}: MissionMap2DLayerOptions): void {
  group.clearLayers();

  L.circleMarker(enuToLatLng(mission.spawn, origin), {
    radius: 8,
    color: "#ffffff",
    weight: 2,
    fillColor: "#6246ea",
    fillOpacity: 1,
    interactive: false,
  })
    .bindTooltip("Drone Home point")
    .addTo(group);

  const routes = getMissionRoutes(mission);
  const firstMissionPoint = mission.waypoints[0];
  if (firstMissionPoint) {
    L.polyline(
      [
        enuToLatLng(mission.spawn, origin),
        enuToLatLng(firstMissionPoint, origin),
      ],
      {
        color: "#6246ea",
        weight: 2,
        dashArray: "6 5",
        opacity: 0.8,
        interactive: false,
      },
    )
      .bindTooltip("Home to mission start")
      .addTo(group);
  }
  routes.forEach((route, routeIndex) => {
    const points = mission.waypoints
      .filter(
        (waypoint) =>
          !waypoint.generatedByArea &&
          !waypoint.generatedByAvoid &&
          (waypoint.routeId ?? routes[0]?.id) === route.id,
      )
      .sort((a, b) => a.seq - b.seq);
    const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
    if (points.length > 1) {
      L.polyline(
        points.map((point) => enuToLatLng(point, origin)),
        { color, weight: 4, opacity: 0.92, bubblingMouseEvents: false },
      )
        .bindTooltip(`${route.label} · ${points.length} waypoints`)
        .addTo(group);
    }
    points.forEach((waypoint, waypointIndex) => {
      const captures = waypoint.actions.some(
        (action) => action.kind === "photo",
      );
      const marker = L.marker(enuToLatLng(waypoint, origin), {
        icon: waypointIcon(
          waypoint.seq,
          equalSelection(selection, "waypoint", waypoint.id),
          showPhotoMarkers && captures,
        ),
        keyboard: true,
        title: `Waypoint ${waypoint.seq}${captures ? ", photo capture" : ""}`,
        bubblingMouseEvents: false,
      });
      marker.bindTooltip(
        `Waypoint ${waypoint.seq}${captures ? " · Photo capture" : ""}`,
      );
      marker.on("click keypress", () => onWaypointSelect(waypoint.id));
      marker.addTo(group);
      if (showCameraFootprint && captures) {
        const pitchDeg =
          waypoint.actions.find((action) => action.kind === "photo")
            ?.gimbalPitchDeg ??
          route.reconnaissance?.gimbalPitchDeg ??
          -65;
        const footprint = projectMockReconFootprintToGround(
          waypoint,
          waypointForwardDirection(points, waypointIndex),
          pitchDeg,
        );
        if (footprint)
          L.polygon(
            footprint.map((point) => enuToLatLng(point, origin)),
            {
              color: equalSelection(selection, "waypoint", waypoint.id)
                ? "#ff6b35"
                : color,
              weight: 1.5,
              opacity: 0.9,
              fillColor: color,
              fillOpacity: 0.08,
              interactive: false,
            },
          )
            .bindTooltip("Camera field of view · flat reference ground")
            .addTo(group);
      }
    });
  });

  mission.areas.forEach((area) => {
    const selected = equalSelection(selection, "area", area.id);
    const polygon = L.polygon(
      area.points.map((point) => enuToLatLng(point, origin)),
      {
        color: selected ? "#ff6b35" : AREA_COLOR,
        weight: selected ? 3 : 2,
        opacity: 0.95,
        fillColor: AREA_COLOR,
        fillOpacity: 0.12,
        bubblingMouseEvents: false,
      },
    );
    polygon.bindTooltip(area.label || "Area");
    polygon.on("click", () => onZoneSelect("area", area.id));
    polygon.addTo(group);

    // Area-generated waypoints are authored flight geometry too: show their
    // ordered traversal over the AOI so the 2D map previews the actual scan.
    const scanWaypoints = mission.waypoints
      .filter((waypoint) => waypoint.generatedByArea === area.id)
      .sort((a, b) => a.seq - b.seq);
    const scanPath =
      scanWaypoints.length > 1
        ? scanWaypoints
        : (area.scanLines ?? []).flat().map((point, index) => ({
            ...point,
            z: area.reconnaissance?.altitudeM ?? 0,
            seq: index,
            actions: [],
          }));
    const meterPixels = map
      .latLngToLayerPoint(enuToLatLng({ x: 1, y: 0 }, origin))
      .distanceTo(map.latLngToLayerPoint(enuToLatLng({ x: 0, y: 0 }, origin)));
    const laneSpacingPixels = Math.max(
      0.75,
      (area.lineSpacingM ?? 6) * meterPixels,
    );
    const scanStroke = Math.max(0.75, Math.min(2.25, laneSpacingPixels * 0.42));
    if (scanPath.length > 1) {
      const scanLine = L.polyline(
        scanPath.map((point) => enuToLatLng(point, origin)),
        {
          color: selected ? "#ff6b35" : AREA_COLOR,
          weight: scanStroke,
          opacity: 0.92,
          bubblingMouseEvents: false,
        },
      );
      scanLine.bindTooltip(
        `${area.label || "Area"} · ${scanWaypoints.length || scanPath.length} scan waypoints`,
      );
      scanLine.on("click", () => onZoneSelect("area", area.id));
      scanLine.addTo(group);
    }

    scanWaypoints.forEach((waypoint, waypointIndex) => {
      const captures = waypoint.actions.some(
        (action) => action.kind === "photo",
      );
      if (!captures) return;
      if (showPhotoMarkers) {
        L.circleMarker(enuToLatLng(waypoint, origin), {
          radius: Math.max(1.25, Math.min(3, laneSpacingPixels * 0.42)),
          color: "#ffffff",
          weight: 1,
          fillColor: selected ? "#ff6b35" : "#6246ea",
          fillOpacity: 1,
          interactive: false,
        }).addTo(group);
      }
      if (showCameraFootprint) {
        const pitchDeg =
          waypoint.actions.find((action) => action.kind === "photo")
            ?.gimbalPitchDeg ??
          area.reconnaissance?.gimbalPitchDeg ??
          -65;
        const footprint = projectMockReconFootprintToGround(
          waypoint,
          waypointForwardDirection(scanWaypoints, waypointIndex),
          pitchDeg,
        );
        if (footprint)
          L.polygon(
            footprint.map((point) => enuToLatLng(point, origin)),
            {
              color: selected ? "#ff6b35" : AREA_COLOR,
              weight: 1,
              opacity: 0.45,
              fillColor: AREA_COLOR,
              fillOpacity: 0.035,
              interactive: false,
            },
          )
            .bindTooltip("Camera field of view · flat reference ground")
            .addTo(group);
      }
    });
  });

  mission.avoids.forEach((avoid) => {
    const selected = equalSelection(selection, "avoid", avoid.id);
    const polygon = L.polygon(
      avoid.points.map((point) => enuToLatLng(point, origin)),
      {
        color: selected ? "#ff6b35" : AVOID_COLOR,
        weight: selected ? 3 : 2,
        opacity: 0.95,
        fillColor: AVOID_COLOR,
        fillOpacity: 0.2,
        dashArray: "5 4",
        bubblingMouseEvents: false,
      },
    );
    polygon.bindTooltip(avoid.label || "Avoid zone");
    polygon.on("click", () => onZoneSelect("avoid", avoid.id));
    polygon.addTo(group);
  });

  const pending = pendingPoints.map((point) => enuToLatLng(point, origin));
  if (tool === "route") {
    const routeDraft = [...pending];
    if (draftCursor) routeDraft.push(enuToLatLng(draftCursor, origin));
    if (routeDraft.length > 1) {
      L.polyline(routeDraft, {
        color: "#7357ff",
        weight: 3,
        dashArray: "7 5",
        opacity: 0.95,
        interactive: false,
      }).addTo(group);
    }
  } else if (
    (tool === "area" || tool === "avoid") &&
    zoneShape === "cylinder" &&
    pendingPoints.length > 0
  ) {
    const center = pendingPoints[0];
    const radius = draftCursor ? pointDistance(center, draftCursor) : 0;
    if (radius > 0) {
      L.circle(enuToLatLng(center, origin), {
        radius,
        color: tool === "area" ? AREA_COLOR : AVOID_COLOR,
        weight: 2,
        dashArray: "6 5",
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(group);
    }
  } else if ((tool === "area" || tool === "avoid") && pending.length > 0) {
    const draft = [...pending];
    if (draftCursor) draft.push(enuToLatLng(draftCursor, origin));
    if (draft.length > 1) {
      const color = tool === "area" ? AREA_COLOR : AVOID_COLOR;
      L.polyline(draft, {
        color,
        weight: 2,
        dashArray: "6 5",
        interactive: false,
      }).addTo(group);
      if (draft.length >= 3)
        L.polygon(draft, {
          color,
          weight: 1,
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(group);
    }
  }
  if (tool !== "select") {
    pendingPoints.forEach((point, index) => {
      L.marker(enuToLatLng(point, origin), {
        icon: draftMarkerIcon(index),
        keyboard: false,
        interactive: false,
      }).addTo(group);
    });
  }
}
