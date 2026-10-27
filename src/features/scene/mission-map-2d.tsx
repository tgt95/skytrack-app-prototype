/* mission-map-2d.tsx — Leaflet 2D basemap and editing surface for Mission Studio.
   Mission coordinates stay in the Studio's local ENU meters; conversion uses
   the mission's own geographic origin (same small-area approximation as the
   Cesium scene). Currently no live route mount renders this surface; it stays
   origin-aware so any future mount places geometry at the mission site. */

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BASEMAPS, type MissionBasemapStyle } from "./basemaps";
import {
  drawMissionMapLayers,
  enuToLatLng,
  latLngToEnu,
  type EnuPoint,
  type PendingPoint,
} from "./mission-map-2d-layers";
import {
  missionOrigin,
  type SceneSelection,
  type SceneTool,
  type StudioMission,
} from "../../domain/mission-model";

export interface MissionMap2DProps {
  mission: StudioMission;
  tool: SceneTool;
  selection: SceneSelection | null;
  pendingPoints: PendingPoint[];
  draftCursor: EnuPoint | null;
  zoneShape: "polygon" | "cylinder";
  showPhotoMarkers: boolean;
  showCameraFootprint: boolean;
  basemap: MissionBasemapStyle;
  onWaypointSelect: (id: string) => void;
  onZoneSelect: (kind: "area" | "avoid", id: string) => void;
  onDrawingPoint: (point: EnuPoint) => void;
  onDrawingHover: (point: EnuPoint | null, nearStart: boolean) => void;
  onCloseDrawing: () => void;
  onClearSelection: () => void;
}

export function MissionMap2D({
  mission,
  tool,
  selection,
  pendingPoints,
  draftCursor,
  zoneShape,
  showPhotoMarkers,
  showCameraFootprint,
  basemap,
  onWaypointSelect,
  onZoneSelect,
  onDrawingPoint,
  onDrawingHover,
  onCloseDrawing,
  onClearSelection,
}: MissionMap2DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const overlaysRef = useRef<L.LayerGroup | null>(null);
  /* Geographic anchor of the local frame: mission site, legacy default when
     absent. New drawing converts through this origin, so it stays within the
     ±2000 m local bounds around the searched site and renders under the click. */
  const origin = useMemo(() => missionOrigin(mission), [mission]);
  const originRef = useRef(origin);
  originRef.current = origin;
  const propsRef = useRef({
    tool,
    pendingPoints,
    onDrawingPoint,
    onDrawingHover,
    onCloseDrawing,
    onClearSelection,
  });
  propsRef.current = {
    tool,
    pendingPoints,
    onDrawingPoint,
    onDrawingHover,
    onCloseDrawing,
    onClearSelection,
  };
  const [tileState, setTileState] = useState<"loading" | "ready" | "offline">(
    "loading",
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;

    const initial = originRef.current;
    const map = L.map(host, {
      center: [initial.lat, initial.lng],
      zoom: 18,
      minZoom: 3,
      maxZoom: 20,
      zoomControl: false,
      doubleClickZoom: false,
      attributionControl: true,
    });
    mapRef.current = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    overlaysRef.current = L.layerGroup().addTo(map);

    const handleClick = (event: L.LeafletMouseEvent) => {
      const current = propsRef.current;
      if (current.tool !== "select")
        current.onDrawingPoint(latLngToEnu(event.latlng, originRef.current));
      else current.onClearSelection();
    };
    const handleDoubleClick = () => {
      if (propsRef.current.tool !== "select") propsRef.current.onCloseDrawing();
    };
    const handleMove = (event: L.LeafletMouseEvent) => {
      const current = propsRef.current;
      if (current.tool === "select") return;
      const mapOrigin = originRef.current;
      const point = latLngToEnu(event.latlng, mapOrigin);
      const first = current.pendingPoints[0];
      const nearStart =
        !!first &&
        current.pendingPoints.length >= 3 &&
        map
          .latLngToContainerPoint(event.latlng)
          .distanceTo(
            map.latLngToContainerPoint(enuToLatLng(first, mapOrigin)),
          ) <= 18;
      current.onDrawingHover(point, nearStart);
    };
    const handleOut = () => propsRef.current.onDrawingHover(null, false);
    map.on("click", handleClick);
    map.on("dblclick", handleDoubleClick);
    map.on("mousemove", handleMove);
    map.on("mouseout", handleOut);

    return () => {
      map.off("click", handleClick);
      map.off("dblclick", handleDoubleClick);
      map.off("mousemove", handleMove);
      map.off("mouseout", handleOut);
      map.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      overlaysRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const spec = BASEMAPS[basemap];
    setTileState("loading");
    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);
    let errors = 0;
    const layer = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      maxZoom: 20,
      maxNativeZoom: spec.maxNativeZoom,
      crossOrigin: true,
    });
    layer.on("tileload", () => setTileState("ready"));
    layer.on("tileerror", () => {
      errors += 1;
      if (errors >= 4) setTileState("offline");
    });
    layer.addTo(map);
    layer.bringToBack();
    baseLayerRef.current = layer;
    return () => {
      layer.off();
      if (map.hasLayer(layer)) map.removeLayer(layer);
    };
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    const group = overlaysRef.current;
    if (!map || !group) return;
    drawMissionMapLayers({
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
    });
  }, [
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
  ]);

  /* Mission site change (e.g. address search moves the origin): recenter the
     map on the new anchor so relocated overlays and new drawing stay in view.
     User pans never change the origin, so this only fires on site changes. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([origin.lat, origin.lng], Math.max(map.getZoom(), 15), {
      animate: false,
    });
  }, [origin.lat, origin.lng]);

  return (
    <section
      aria-label="2D mission map"
      className="relative h-full w-full min-h-[320px] overflow-hidden"
    >
      <div ref={hostRef} className="absolute inset-0 bg-[#e8ebef]" />
      {tileState !== "ready" && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-3 left-3 z-500 max-w-[280px] rounded-[5px] px-[9px] py-[6px] bg-(--card) text-(--foreground) shadow-[0_1px_5px_#0003] [font:12px/1.4_system-ui]"
        >
          {tileState === "offline"
            ? "Basemap unavailable. Check the network connection."
            : "Loading basemap…"}
        </div>
      )}
    </section>
  );
}
