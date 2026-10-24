/* Core Mission Studio domain types, defaults, and shared model helpers. */

export interface EnuPoint {
  x: number;
  y: number;
}

export interface EnuVec extends EnuPoint {
  z: number;
}

/** Per-mission geographic origin (latitude/longitude, degrees) anchoring the
    local ENU frame to the globe. Optional for backward compatibility: missions
    without one use `DEFAULT_MISSION_ORIGIN` (the legacy fixed mock site).
    Changing origin never mutates local x/y coordinates; only the
    ENU-to-geodetic conversion moves, so whole-mission geometry relocates as
    one unit. Never shared or mutated globally across missions. */
export interface GeoOrigin {
  lat: number;
  lng: number;
  /** Provider credit captured when this site was selected by address search. */
  attribution?: GeoAttribution;
}

export interface GeoAttribution {
  label: string;
  href: string;
}

/** Legacy fixed demo site (Redlands, California). Default origin for missions without one. */
export const DEFAULT_MISSION_ORIGIN: GeoOrigin = {
  lat: 34.0511,
  lng: -117.1645,
};

export type CameraActionKind =
  "photo" | "video-start" | "video-stop" | "lidar-scan";

export interface ReconFlightSettings {
  enabled: boolean;
  altitudeM: number;
  frontOverlapPct: number;
  sideOverlapPct: number;
  gimbalPitchDeg: number;
  flightSpeedMS: number;
  flightPattern: "single" | "double";
  terrainAwareness: boolean;
}

export const DEFAULT_RECON_FLIGHT_SETTINGS: ReconFlightSettings = {
  enabled: false,
  altitudeM: 30,
  frontOverlapPct: 50,
  sideOverlapPct: 50,
  gimbalPitchDeg: -90,
  flightSpeedMS: 8,
  flightPattern: "single",
  terrainAwareness: false,
};

/** New 2D Area scans start with Recon enabled; Route Recon remains opt-in. */
export const DEFAULT_AREA_RECON_FLIGHT_SETTINGS: ReconFlightSettings = {
  ...DEFAULT_RECON_FLIGHT_SETTINGS,
  enabled: true,
};

/** Existing Recon summary inputs. Missing sensor height becomes a square-FOV assumption. */
export const MOCK_RECON_CAMERA_PROFILE = {
  sensorWidthMm: 17.3,
  focalLengthMm: 12.3,
  resolutionWidthPx: 5280,
} as const;

export interface WaypointAction {
  id: string;
  kind: CameraActionKind;
  label: string;
  /** Camera pitch override for this action, degrees; absence inherits flight settings. */
  gimbalPitchDeg?: number;
}

export interface Waypoint extends EnuVec {
  id: string;
  seq: number;
  actions: WaypointAction[];
  /** ID of the Route block this waypoint belongs to. */
  routeId?: string;
  /** Area/avoid waypoints remain distinguishable from points authored by pilot. */
  generatedByArea?: string;
  generatedByAvoid?: string;
  /** Explicit per-point height edit that survives Area/Avoid regeneration. */
  altitudeOverrideM?: number;
}

export interface PolyZone {
  id: string;
  label: string;
  points: EnuPoint[];
  /** Authoring shape. `points` remains its sampled footprint boundary ring. */
  shape?: "polygon" | "cylinder";
  center?: EnuPoint;
  radiusM?: number;
}

export interface MissionArea extends PolyZone {
  lineSpacingM?: number;
  orientationDeg?: number;
  paddingM?: number;
  scanLines?: EnuPoint[][];
  /** Saved drawing-base altitude (m, >= 0). Footprint renders at this height.
      Absent/legacy means ground (0). Draft ruler never mutates this. */
  baseAltM?: number;
  reconnaissance?: ReconFlightSettings;
}

/** Flight height for an Area scan. Photogrammetry missions use the saved
    reconnaissance flight altitude; legacy 3D missions keep take-off behavior. */
export function getAreaFlightAltitudeM(
  area: Pick<MissionArea, "baseAltM" | "reconnaissance">,
  takeoffAltitudeM: number,
  worldType: "2D" | "3D" = "3D",
): number {
  const baseAltitudeM = Math.max(0, area.baseAltM ?? 0);
  if (worldType === "2D") {
    return (
      area.reconnaissance?.altitudeM ?? DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM
    );
  }
  return Math.max(baseAltitudeM, takeoffAltitudeM);
}

export interface AvoidZone extends PolyZone {
  heightM?: number;
  clearanceM?: number;
  /** Saved base altitude (m, >= 0). heightM extrudes upward from this base.
      Absent/legacy means ground (0). */
  baseAltM?: number;
  /** Avoid category: Obstacle or People / Privacy */
  type?: "obstacle" | "privacy";
}

export interface MissionRouteMeta {
  id: string;
  label: string;
  targetSpeedMS?: number;
  reconnaissance?: ReconFlightSettings;
}

export interface MissionSequenceItem {
  type: "route" | "area";
  id: string;
}

export interface StudioMission {
  id: string;
  name: string;
  world: string;
  /** Mission authoring mode selected in Create Mission. Legacy missions default to 3D. */
  worldType?: "2D" | "3D";
  /** Stable link to a workspace 3D World; legacy missions keep only the label. */
  worldId?: string;
  vehicle: string;
  /** Stable link to a workspace Drone profile; absent on legacy snapshots. */
  droneId?: string;
  spawn: EnuPoint;
  takeoffAltM: number;
  targetSpeedMS: number;
  returnHomeOnEnd: boolean;
  cameraSafetyCheck: boolean;
  /** Global avoidance behavior (Figma 607:18957 “Safety options”). Optional:
      absent means obstacle avoidance; flows through snapshots/undo as part of
      the mission object. */
  safetyMode?: SafetyMode;
  routes?: MissionRouteMeta[];
  /** User-created Route/Area block order. Missing means legacy Route-first order. */
  sequenceOrder?: MissionSequenceItem[];
  waypoints: Waypoint[];
  areas: MissionArea[];
  avoids: AvoidZone[];
  /** Geographic anchor of the local ENU frame. Absent means
      `DEFAULT_MISSION_ORIGIN` (legacy missions). Local x/y stay unchanged
      when this moves; only geodetic placement moves. */
  origin?: GeoOrigin;
}

export type SafetyMode = "obstacle" | "privacy" | "off";

export const SAFETY_OPTIONS: { value: SafetyMode; label: string }[] = [
  { value: "obstacle", label: "Obstacle avoidance" },
  { value: "privacy", label: "People / Privacy" },
  { value: "off", label: "Off" },
];

export function safetyModeOf(mission: StudioMission): SafetyMode {
  return mission.safetyMode ?? "obstacle";
}

export interface VehicleSpec {
  id: string;
  label: string;
  supportsVideo: boolean;
  supportsLidar: boolean;
  note: string;
}

export const WORLDS = [
  "Blank space",
  "Courtyard block",
  "Rooftop pad",
  "Rolling hills",
  "Mountain ridge",
] as const;

export const VEHICLES: VehicleSpec[] = [
  {
    id: "x500-livox",
    label: "Drone x500 Livox Mid 360",
    supportsVideo: false,
    supportsLidar: true,
    note: "LiDAR mapping rig — photo + LiDAR scan only, no video recording.",
  },
  {
    id: "mavic-3e",
    label: "DJI Mavic 3E",
    supportsVideo: true,
    supportsLidar: false,
    note: "Mechanical-shutter camera — photo + video, no LiDAR.",
  },
  {
    id: "generic-quad",
    label: "Generic Quad X4",
    supportsVideo: true,
    supportsLidar: true,
    note: "Reference airframe — supports photo, video, and LiDAR capture.",
  },
];

export function vehicleSpecOf(label: string): VehicleSpec | undefined {
  return VEHICLES.find((v) => v.label === label);
}

export type SceneTool = "select" | "home" | "area" | "route" | "avoid";

export interface SceneSelection {
  kind: "waypoint" | "area" | "avoid" | "spawn";
  id: string;
}

export interface ValidationIssue {
  id: string;
  level: "error" | "warning";
  message: string;
  target?: SceneSelection;
}

let uidCounter = 0;
export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}`;
}

export function renumber(waypoints: Waypoint[]): Waypoint[] {
  return waypoints.map((w, i) => ({ ...w, seq: i + 1 }));
}

/** Move waypoint `id` to final 0-based position `toIndex`, preserving ids,
    coordinates, actions and Area/Avoid provenance. Returns a renumbered list;
    the caller recomputes order-dependent detours once and commits through the
    existing undo/redo history. No-op (same array contents) when id is missing
    or already at `toIndex`. */
export function reorderWaypoints(
  waypoints: Waypoint[],
  id: string,
  toIndex: number,
): Waypoint[] {
  const from = waypoints.findIndex((w) => w.id === id);
  if (from < 0) return waypoints;
  const at = Math.max(0, Math.min(toIndex, waypoints.length - 1));
  if (from === at) return waypoints;
  const list = [...waypoints];
  const [moved] = list.splice(from, 1);
  list.splice(at, 0, moved);
  return renumber(list);
}

/** Rebuild nested Recon settings from supported fields so old snapshots cannot
    keep exporting removed or unknown options such as `gridAngleDeg`. */
export function canonicalizeReconSettings<
  T extends { reconnaissance?: ReconFlightSettings },
>(item: T): T {
  const canonical = { ...item };
  const reconnaissance = reconSettingsFrom(item.reconnaissance);
  if (reconnaissance) canonical.reconnaissance = reconnaissance;
  else delete canonical.reconnaissance;
  return canonical;
}

/** Normalize mission routes: ensures each authored waypoint is attributed
    to a valid Route block, defaulting legacy single-route waypoints to Route 1. */
export function normalizeMissionRoutes(mission: StudioMission): StudioMission {
  const authored = mission.waypoints.filter(
    (w) => !w.generatedByArea && !w.generatedByAvoid,
  );
  let routes = mission.routes
    ? mission.routes.map(canonicalizeReconSettings)
    : [];
  if (routes.length === 0) {
    if (authored.length > 0) {
      routes = [
        { id: "route-1", label: "Route", targetSpeedMS: mission.targetSpeedMS },
      ];
    }
  }
  const validRouteIds = new Set(routes.map((r) => r.id));
  const defaultRouteId = routes[0]?.id ?? "route-1";
  const waypoints = mission.waypoints.map((w) => {
    if (w.generatedByArea || w.generatedByAvoid) return w;
    if (!w.routeId || !validRouteIds.has(w.routeId)) {
      return { ...w, routeId: defaultRouteId };
    }
    return w;
  });
  // Route metadata is a sequence block only while it owns authored geometry.
  // Old snapshots and hand-edited Code JSON can otherwise keep an empty Route
  // in the Design pane even though transfer planning and Preview omit it.
  routes = routes.filter((route, routeIndex) =>
    waypoints.some(
      (waypoint) =>
        !waypoint.generatedByArea &&
        !waypoint.generatedByAvoid &&
        (waypoint.routeId === route.id ||
          (!waypoint.routeId && routeIndex === 0)),
    ),
  );
  const activeRouteIds = new Set(routes.map((route) => route.id));
  const activeAreaIds = new Set((mission.areas ?? []).map((area) => area.id));
  const sequenceOrder = Array.isArray(mission.sequenceOrder)
    ? mission.sequenceOrder.filter((item) =>
        item?.type === "route"
          ? activeRouteIds.has(item.id)
          : item?.type === "area" && activeAreaIds.has(item.id),
      )
    : mission.sequenceOrder;
  const areas = (mission.areas ?? []).map(canonicalizeReconSettings);
  return { ...mission, routes, areas, waypoints, sequenceOrder };
}

export function getMissionRoutes(mission: StudioMission): MissionRouteMeta[] {
  if (mission.routes && mission.routes.length > 0) return mission.routes;
  const authored = mission.waypoints.filter(
    (w) => !w.generatedByArea && !w.generatedByAvoid,
  );
  if (authored.length > 0) {
    return [
      { id: "route-1", label: "Route", targetSpeedMS: mission.targetSpeedMS },
    ];
  }
  return [];
}

/** Return authored waypoints for one Route in the same order shown by `seq`.
    Code snapshots can preserve array order while waypoint sequence changes. */
export function getMissionRouteWaypoints(
  mission: StudioMission,
  routeId: string,
): Waypoint[] {
  const routes = getMissionRoutes(mission);
  const routeIndex = routes.findIndex((route) => route.id === routeId);
  if (routeIndex < 0) return [];
  return mission.waypoints
    .filter(
      (waypoint) =>
        !waypoint.generatedByArea &&
        !waypoint.generatedByAvoid &&
        (waypoint.routeId === routeId ||
          (!waypoint.routeId && routeIndex === 0)),
    )
    .sort((a, b) => a.seq - b.seq);
}

/** Return the mission's Route/Area block order. Legacy missions without the
    field retain their historical Route-first ordering. Missing references in
    newer snapshots are appended using that same stable fallback order. */
export function getMissionSequence(
  mission: StudioMission,
): MissionSequenceItem[] {
  const fallback: MissionSequenceItem[] = [
    ...getMissionRoutes(mission).map((route) => ({
      type: "route" as const,
      id: route.id,
    })),
    ...(mission.areas ?? []).map((area) => ({
      type: "area" as const,
      id: area.id,
    })),
  ];
  if (
    !Array.isArray(mission.sequenceOrder) ||
    mission.sequenceOrder.length === 0
  )
    return fallback;

  const valid = new Set<string>();
  for (const route of getMissionRoutes(mission)) valid.add(`route:${route.id}`);
  for (const area of mission.areas ?? []) valid.add(`area:${area.id}`);

  const ordered: MissionSequenceItem[] = [];
  const seen = new Set<string>();
  for (const item of mission.sequenceOrder) {
    if (
      (item?.type !== "route" && item?.type !== "area") ||
      typeof item.id !== "string"
    )
      continue;
    const key = `${item.type}:${item.id}`;
    if (!valid.has(key) || seen.has(key)) continue;
    seen.add(key);
    ordered.push({ type: item.type, id: item.id });
  }
  for (const item of fallback) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(item);
  }
  return ordered;
}

/** Append a newly created Route/Area to the saved block order exactly once. */
export function appendMissionSequenceItem(
  mission: StudioMission,
  item: MissionSequenceItem,
): MissionSequenceItem[] {
  const order = getMissionSequence(mission);
  return order.some((entry) => entry.type === item.type && entry.id === item.id)
    ? order
    : [...order, item];
}

/** Remove a deleted Route/Area from the explicit sequence. */
export function removeMissionSequenceItem(
  mission: StudioMission,
  item: MissionSequenceItem,
): MissionSequenceItem[] {
  return getMissionSequence(mission).filter(
    (entry) => !(entry.type === item.type && entry.id === item.id),
  );
}

export function emptyMission(): StudioMission {
  return {
    id: uid("mission"),
    name: "Untitled mission",
    world: WORLDS[0],
    worldType: "3D",
    vehicle: VEHICLES[0].label,
    spawn: { x: 0, y: -18 },
    takeoffAltM: 12,
    targetSpeedMS: 2,
    returnHomeOnEnd: true,
    cameraSafetyCheck: true,
    routes: [],
    waypoints: [],
    areas: [],
    avoids: [],
  };
}

export function actionLabel(kind: CameraActionKind): string {
  switch (kind) {
    case "photo":
      return "Photo capture";
    case "video-start":
      return "Camera Start recording";
    case "video-stop":
      return "Camera Stop recording";
    case "lidar-scan":
      return "LiDAR scan";
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
export function reconSettingsFrom(
  value: unknown,
  enabledFallback = DEFAULT_RECON_FLIGHT_SETTINGS.enabled,
): ReconFlightSettings | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const raw = value as Partial<ReconFlightSettings>;
  const bounded = (
    candidate: unknown,
    fallback: number,
    min: number,
    max: number,
  ) =>
    typeof candidate === "number" && Number.isFinite(candidate)
      ? Math.min(max, Math.max(min, candidate))
      : fallback;
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : enabledFallback,
    altitudeM: bounded(
      raw.altitudeM,
      DEFAULT_RECON_FLIGHT_SETTINGS.altitudeM,
      2,
      500,
    ),
    frontOverlapPct: bounded(
      raw.frontOverlapPct,
      DEFAULT_RECON_FLIGHT_SETTINGS.frontOverlapPct,
      0,
      95,
    ),
    sideOverlapPct: bounded(
      raw.sideOverlapPct,
      DEFAULT_RECON_FLIGHT_SETTINGS.sideOverlapPct,
      0,
      95,
    ),
    gimbalPitchDeg: bounded(
      raw.gimbalPitchDeg,
      DEFAULT_RECON_FLIGHT_SETTINGS.gimbalPitchDeg,
      -90,
      0,
    ),
    flightSpeedMS: bounded(
      raw.flightSpeedMS,
      DEFAULT_RECON_FLIGHT_SETTINGS.flightSpeedMS,
      0.5,
      20,
    ),
    flightPattern: raw.flightPattern === "double" ? "double" : "single",
    terrainAwareness:
      typeof raw.terrainAwareness === "boolean"
        ? raw.terrainAwareness
        : DEFAULT_RECON_FLIGHT_SETTINGS.terrainAwareness,
  };
}
