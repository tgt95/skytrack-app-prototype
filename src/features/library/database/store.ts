/* modules/library/database/store.ts — local JSON-backed repository for the Mission Library.
   No backend in this prototype. How it works:
   - Seeds live in `src/features/library/database/seeds/*.json` — edit them directly to change the
     demo data. They are bundled at build time.
   - Every mutation is auto-persisted to `localStorage` (JSON, same shape),
     so edits/starred/created items survive reloads.
   - "Export JSON" downloads the current state; copy it back into the seed
     files to promote runtime edits into seeds.
   - Clear the `skytrack-library-db-v1` localStorage key (or wipe site data)
     to fall back to seeds. */

import projectsSeed from "./seeds/projects.json";
import leevilleMissionSeed from "./seeds/missions/leeville-pike-flight.json";
import satoriniMissionSeed from "./seeds/missions/satorini-island-reconnaissance.json";
import bitexcoMissionSeed from "./seeds/missions/bitexco-reconnaissance.json";
import thanhAnMissionSeed from "./seeds/missions/thanh-an-dau-tieng.json";
import santoriniMapSceneSeed from "./seeds/map-data/santorini-map-scene.json";
import santoriniTerrainSeed from "./seeds/map-data/santorini-terrain.json";
import bitexcoMapSceneSeed from "./seeds/map-data/bitexco-map-scene.json";
import bitexcoTerrainSeed from "./seeds/map-data/bitexco-terrain.json";
import thanhAnMapSceneSeed from "./seeds/map-data/thanh-an-dau-tieng-map-scene.json";
import thanhAnTerrainSeed from "./seeds/map-data/thanh-an-dau-tieng-terrain.json";
import { ensureSeededMission } from "./ensure-seeded-mission";
import templatesSeed from "./seeds/templates.json";
import { getWorkspace } from "@/features/library/workspace/workspace-data.ts";
import { STORAGE_KEYS, STORAGE_VERSIONS } from "@/shared/storage-keys";
import type { MissionBasemapStyle } from "@/shared/map-tiles";
import type {
  MissionMapSceneLayer,
  MissionTerrainLayer,
} from "@/domain/mission-model";

export interface LibMission {
  id: string;
  name: string;
  updatedAt: string | null;
  starred: boolean;
  shared: boolean;
  viewOnly: boolean;
  sharedWith?: string[];
  sharedRoles?: Record<string, SharedMissionRole>;
  world?: string;
  worldType?: "2D" | "3D";
  worldId?: string;
  vehicle?: string;
  droneId?: string;
  /** Saved with the mission so reopening restores its map presentation. */
  basemapStyle?: MissionBasemapStyle;
  /** Canonical Studio mission snapshot saved locally by the Design Save action. */
  missionData?: string;
  /** Imported elevation grid used to shape the globe in its coverage area. */
  terrainLayer?: MissionTerrainLayer;
  mapSceneLayer?: MissionMapSceneLayer;
}

export type SharedMissionRole = "view-only" | "editor";

export interface LibProject {
  id: string;
  name: string;
  workspaceId?: string;
  missions: LibMission[];
}

export interface LibTemplate {
  id: string;
  title: string;
  desc: string;
  byline: string;
}

export const DB_KEY = STORAGE_KEYS.libraryDatabase;
export const DB_VERSION = STORAGE_VERSIONS.libraryDatabase;
export const SATORINI_SAMPLE_MISSION_ID = "m-local-mv909q3g-101";
export const BITEXCO_SAMPLE_MISSION_ID = "m-local-mwv1r10q-101";
const SAMPLE_SHARED_USERS = ["alex.chen@example.com", "sam.rivera@example.com"];

interface DatabaseShape {
  version: number;
  projects: LibProject[];
}

type LegacyLibMission = Omit<LibMission, "updatedAt"> & { editedAgo: string };
type LegacyLibProject = Omit<LibProject, "missions"> & {
  missions: LegacyLibMission[];
};

interface LegacyDatabaseShape {
  version: 1;
  projects: LegacyLibProject[];
}

function isMissionFields(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const m = value;
  return (
    typeof m.id === "string" &&
    typeof m.name === "string" &&
    typeof m.starred === "boolean" &&
    typeof m.shared === "boolean" &&
    typeof m.viewOnly === "boolean" &&
    (m.sharedWith === undefined ||
      (Array.isArray(m.sharedWith) &&
        m.sharedWith.every((email) => typeof email === "string"))) &&
    (m.sharedRoles === undefined ||
      (isRecord(m.sharedRoles) &&
        Object.values(m.sharedRoles).every(
          (role) => role === "view-only" || role === "editor",
        ))) &&
    (m.world === undefined || typeof m.world === "string") &&
    (m.worldType === undefined ||
      m.worldType === "2D" ||
      m.worldType === "3D") &&
    (m.vehicle === undefined || typeof m.vehicle === "string") &&
    (m.droneId === undefined ||
      (typeof m.droneId === "string" && m.droneId.length <= 128)) &&
    (m.worldId === undefined ||
      (typeof m.worldId === "string" && m.worldId.length <= 128)) &&
    (m.basemapStyle === undefined ||
      (typeof m.basemapStyle === "string" &&
        [
          "satellite",
          "openstreetmap",
          "basic",
          "light",
          "dark",
          "daybreak",
          "overcast",
        ].includes(m.basemapStyle))) &&
    (m.missionData === undefined || typeof m.missionData === "string") &&
    (m.terrainLayer === undefined || isMissionTerrainLayer(m.terrainLayer)) &&
    (m.mapSceneLayer === undefined || isMissionMapSceneLayer(m.mapSceneLayer))
  );
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isMission(value: unknown): value is LibMission {
  return (
    isMissionFields(value) &&
    (value.updatedAt === null || isValidTimestamp(value.updatedAt))
  );
}

function isLegacyMission(value: unknown): value is LegacyLibMission {
  return isMissionFields(value) && typeof value.editedAgo === "string";
}

function isMissionMapSceneLayer(value: unknown): value is MissionMapSceneLayer {
  if (!value || typeof value !== "object") return false;
  const layer = value as Partial<MissionMapSceneLayer>;
  const isFinitePoint = (point: unknown) =>
    Array.isArray(point) &&
    point.length === 2 &&
    point.every((entry) => typeof entry === "number" && Number.isFinite(entry));
  const isRing = (ring: unknown) =>
    Array.isArray(ring) && ring.length >= 4 && ring.every(isFinitePoint);
  return (
    typeof layer.sourceFileName === "string" &&
    (layer.coordinateFrame === undefined ||
      layer.coordinateFrame === "mission-enu") &&
    typeof layer.center?.lat === "number" &&
    Number.isFinite(layer.center.lat) &&
    typeof layer.center?.lon === "number" &&
    Number.isFinite(layer.center.lon) &&
    Math.abs(layer.center.lat) <= 90 &&
    Math.abs(layer.center.lon) <= 180 &&
    Array.isArray(layer.bbox) &&
    layer.bbox.length === 4 &&
    layer.bbox.every(
      (entry) => typeof entry === "number" && Number.isFinite(entry),
    ) &&
    typeof layer.widthM === "number" &&
    Number.isFinite(layer.widthM) &&
    layer.widthM > 0 &&
    typeof layer.horizontalReference === "string" &&
    layer.verticalReference === "unverified" &&
    Array.isArray(layer.buildings) &&
    layer.buildings.length <= 5000 &&
    Array.isArray(layer.landmarks) &&
    layer.landmarks.length <= 100 &&
    (layer.trees === undefined ||
      (Array.isArray(layer.trees) &&
        layer.trees.length <= 2000 &&
        layer.trees.every(
          (tree) =>
            typeof tree.id === "string" &&
            [tree.xM, tree.yM, tree.heightM, tree.canopyRadiusM].every(
              (entry) => typeof entry === "number" && Number.isFinite(entry),
            ) &&
            tree.heightM > 0 &&
            tree.heightM <= 80 &&
            tree.canopyRadiusM > 0 &&
            tree.canopyRadiusM <= 20,
        ))) &&
    (layer.buildings.length > 0 ||
      layer.landmarks.length > 0 ||
      (layer.trees?.length ?? 0) > 0) &&
    layer.buildings.every(
      (building) =>
        typeof building.id === "string" &&
        typeof building.name === "string" &&
        typeof building.heightM === "number" &&
        Number.isFinite(building.heightM) &&
        building.heightM > 0 &&
        ["verified", "estimated", "review", "unknown"].includes(
          building.heightLabel,
        ) &&
        Array.isArray(building.polygons) &&
        building.polygons.length > 0 &&
        building.polygons.every(
          (polygon) =>
            isRing(polygon.outer) &&
            Array.isArray(polygon.holes) &&
            polygon.holes.every(isRing),
        ),
    ) &&
    layer.landmarks.every(
      (landmark) =>
        typeof landmark.id === "string" &&
        typeof landmark.name === "string" &&
        [
          "bitexco.glb",
          "cau-rong.glb",
          "chua-mot-cot.glb",
          "dinh-doc-lap.glb",
          "landmark-81.glb",
          "nha-tho-duc-ba.glb",
          "thap-rua.glb",
        ].some(
          (file) =>
            landmark.localModelPath === `/demo-assets/mapspace/models/${file}`,
        ) &&
        [
          landmark.xM,
          landmark.yM,
          landmark.baseElevationM,
          landmark.rotationDeg,
          landmark.scale,
          landmark.heightM,
        ].every(
          (entry) => typeof entry === "number" && Number.isFinite(entry),
        ) &&
        landmark.scale > 0 &&
        landmark.heightM > 0 &&
        (landmark.attribution === undefined ||
          typeof landmark.attribution === "string"),
    )
  );
}

function isMissionTerrainLayer(value: unknown): value is MissionTerrainLayer {
  if (!value || typeof value !== "object") return false;
  const terrain = value as Partial<MissionTerrainLayer>;
  return (
    typeof terrain.sourceFileName === "string" &&
    typeof terrain.center?.lat === "number" &&
    Number.isFinite(terrain.center.lat) &&
    typeof terrain.center?.lon === "number" &&
    Number.isFinite(terrain.center.lon) &&
    Array.isArray(terrain.bbox) &&
    terrain.bbox.length === 4 &&
    terrain.bbox.every(
      (item) => typeof item === "number" && Number.isFinite(item),
    ) &&
    typeof terrain.widthM === "number" &&
    Number.isFinite(terrain.widthM) &&
    terrain.widthM > 0 &&
    typeof terrain.gridSize === "number" &&
    Number.isInteger(terrain.gridSize) &&
    terrain.gridSize >= 2 &&
    terrain.gridSize <= 512 &&
    Array.isArray(terrain.elevationsM) &&
    terrain.elevationsM.length === terrain.gridSize * terrain.gridSize &&
    terrain.elevationsM.every(
      (item) => typeof item === "number" && Number.isFinite(item),
    ) &&
    typeof terrain.baseElevationM === "number" &&
    Number.isFinite(terrain.baseElevationM) &&
    typeof terrain.horizontalReference === "string" &&
    typeof terrain.verticalReference === "string" &&
    terrain.verticalReference.trim().length > 0 &&
    terrain.verticalReference.length <= 160
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProject(value: unknown): value is LibProject {
  const p = value as Partial<LibProject>;
  return (
    typeof p === "object" &&
    p !== null &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    (p.workspaceId === undefined || typeof p.workspaceId === "string") &&
    Array.isArray(p.missions) &&
    p.missions.every(isMission)
  );
}

function isDatabase(value: unknown): value is DatabaseShape {
  return (
    isRecord(value) &&
    value.version === DB_VERSION &&
    Array.isArray(value.projects) &&
    value.projects.every(isProject)
  );
}

function isLegacyProject(value: unknown): value is LegacyLibProject {
  const project = value as Partial<LegacyLibProject>;
  return (
    typeof project === "object" &&
    project !== null &&
    typeof project.id === "string" &&
    typeof project.name === "string" &&
    (project.workspaceId === undefined ||
      typeof project.workspaceId === "string") &&
    Array.isArray(project.missions) &&
    project.missions.every(isLegacyMission)
  );
}

function isLegacyDatabase(value: unknown): value is LegacyDatabaseShape {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.projects) &&
    value.projects.every(isLegacyProject)
  );
}

function migrateLegacyProjects(projects: LegacyLibProject[]): LibProject[] {
  return projects.map((project) => ({
    ...project,
    missions: project.missions.map((legacyMission) => {
      const { editedAgo, ...mission } = legacyMission;
      void editedAgo;
      return { ...mission, updatedAt: null };
    }),
  }));
}

function parseSnapshotMetadata(
  raw: string | undefined,
): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function seedProjects(): LibProject[] {
  if (!Array.isArray(projectsSeed) || !projectsSeed.every(isProject)) return [];

  return (projectsSeed as LibProject[]).map((project) => ({
    ...project,
    missions: project.missions.map((mission) =>
      mission.id === "m-local-mww4lv4v-101"
        ? {
            ...mission,
            missionData: JSON.stringify(thanhAnMissionSeed),
            mapSceneLayer:
              thanhAnMapSceneSeed as unknown as MissionMapSceneLayer,
            terrainLayer: thanhAnTerrainSeed as MissionTerrainLayer,
          }
        : mission.id === "m-local-mwgqzezc-101"
          ? {
              ...mission,
              missionData: JSON.stringify(leevilleMissionSeed),
            }
          : mission.id === SATORINI_SAMPLE_MISSION_ID
            ? {
                ...mission,
                missionData: JSON.stringify(satoriniMissionSeed),
                mapSceneLayer:
                  santoriniMapSceneSeed as unknown as MissionMapSceneLayer,
                terrainLayer: santoriniTerrainSeed as MissionTerrainLayer,
              }
            : mission.id === BITEXCO_SAMPLE_MISSION_ID
              ? {
                  ...mission,
                  missionData: JSON.stringify(bitexcoMissionSeed),
                  mapSceneLayer:
                    bitexcoMapSceneSeed as unknown as MissionMapSceneLayer,
                  terrainLayer: bitexcoTerrainSeed as MissionTerrainLayer,
                }
              : mission,
    ),
  }));
}

function alignSatoriniSeedMission(projects: LibProject[]): LibProject[] {
  const record = findMissionRecord(projects, SATORINI_SAMPLE_MISSION_ID);
  if (!record?.mission.missionData || !record.mission.mapSceneLayer)
    return projects;

  try {
    const snapshot: unknown = JSON.parse(record.mission.missionData);
    if (!isRecord(snapshot) || !isRecord(snapshot.origin)) return projects;
    const origin = snapshot.origin;
    const alreadyAtSample =
      Math.abs(Number(origin.lat) - record.mission.mapSceneLayer.center.lat) <
        0.000001 &&
      Math.abs(Number(origin.lng) - record.mission.mapSceneLayer.center.lon) <
        0.000001;
    if (alreadyAtSample) return projects;
    const hasLegacySeedOrigin =
      Math.abs(Number(origin.lat) - 36.4071112) < 0.000001 &&
      Math.abs(Number(origin.lng) - 25.4566637) < 0.000001;
    if (!hasLegacySeedOrigin) return projects;

    const center = Array.isArray(snapshot.areas)
      ? snapshot.areas.find(isRecord)?.center
      : null;
    if (
      !isRecord(center) ||
      typeof center.x !== "number" ||
      typeof center.y !== "number"
    )
      return projects;
    const offsetX = center.x;
    const offsetY = center.y;
    const shiftCoordinates = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(shiftCoordinates);
        return;
      }
      if (!isRecord(value)) return;
      if (typeof value.x === "number" && typeof value.y === "number") {
        value.x = Math.round((value.x - offsetX) * 1000) / 1000;
        value.y = Math.round((value.y - offsetY) * 1000) / 1000;
      }
      Object.values(value).forEach(shiftCoordinates);
    };
    shiftCoordinates(snapshot);
    snapshot.origin = {
      lat: record.mission.mapSceneLayer.center.lat,
      lng: record.mission.mapSceneLayer.center.lon,
      attribution: {
        label: "© OpenStreetMap contributors",
        href: "https://www.openstreetmap.org/copyright",
      },
    };
    const missionData = JSON.stringify(snapshot);
    return projects.map((project) => ({
      ...project,
      missions: project.missions.map((mission) =>
        mission.id === SATORINI_SAMPLE_MISSION_ID
          ? { ...mission, missionData }
          : mission,
      ),
    }));
  } catch {
    return projects;
  }
}

function ensureLeevilleMission(projects: LibProject[]): LibProject[] {
  const seedProject = seedProjects().find((project) =>
    project.missions.some((mission) => mission.id === "m-local-mwgqzezc-101"),
  );
  const seedMission = seedProject?.missions.find(
    (mission) => mission.id === "m-local-mwgqzezc-101",
  );
  if (!seedProject || !seedMission) return projects;
  const existing = projects
    .flatMap((project) => project.missions)
    .find((mission) => mission.id === seedMission.id);
  if (existing) {
    return projects.map((project) => ({
      ...project,
      missions: project.missions.map((mission) => {
        if (mission.id !== seedMission.id || !mission.missionData)
          return mission;
        try {
          const current = JSON.parse(mission.missionData) as {
            areas?: Array<Record<string, unknown>>;
            aiWorkflows?: Array<Record<string, unknown>>;
            avoids?: Array<Record<string, unknown>>;
          };
          const seeded = JSON.parse(seedMission.missionData ?? "{}") as {
            areas?: Array<Record<string, unknown>>;
            aiWorkflows?: Array<Record<string, unknown>>;
            avoids?: Array<Record<string, unknown>>;
          };
          if (
            !Array.isArray(current.areas) ||
            !Array.isArray(seeded.areas) ||
            !Array.isArray(current.aiWorkflows) ||
            !Array.isArray(seeded.aiWorkflows)
          )
            return mission;
          const seededPitchByArea = new Map(
            seeded.areas.flatMap((area) => {
              const pitch = (
                area.reconnaissance as Record<string, unknown> | undefined
              )?.gimbalPitchDeg;
              return typeof area.id === "string" && typeof pitch === "number"
                ? [[area.id, pitch] as const]
                : [];
            }),
          );
          const areas = current.areas.map((area) => {
            const pitch =
              typeof area.id === "string"
                ? seededPitchByArea.get(area.id)
                : undefined;
            if (pitch === undefined) return area;
            const reconnaissance =
              (area.reconnaissance as Record<string, unknown> | undefined) ??
              {};
            return {
              ...area,
              reconnaissance: { ...reconnaissance, gimbalPitchDeg: pitch },
            };
          });
          const seededWorkflowsById = new Map(
            seeded.aiWorkflows.map((workflow) => [workflow.id, workflow]),
          );
          const aiWorkflows = current.aiWorkflows.map((workflow) => {
            const seededWorkflow = seededWorkflowsById.get(workflow.id);
            if (!seededWorkflow) return workflow;
            return {
              ...workflow,
              modelId: seededWorkflow.modelId,
              objectClass: seededWorkflow.objectClass,
            };
          });
          const avoids =
            current.avoids && current.avoids.length > 0
              ? current.avoids
              : (seeded.avoids ?? []);
          return {
            ...mission,
            missionData: JSON.stringify({
              ...current,
              areas,
              aiWorkflows,
              avoids,
            }),
          };
        } catch {
          return mission;
        }
      }),
    }));
  }
  const ownerProject = projects.find(
    (project) => project.id === seedProject.id,
  );
  if (!ownerProject) return [...projects, seedProject];
  return projects.map((project) =>
    project.id === ownerProject.id
      ? { ...project, missions: [...project.missions, seedMission] }
      : project,
  );
}

function normalizeProjects(projects: LibProject[]): LibProject[] {
  const seededMissionById = new Map(
    seedProjects().flatMap((project) =>
      project.missions.map((mission) => [mission.id, mission] as const),
    ),
  );
  return projects.map((project) => ({
    ...project,
    workspaceId: getWorkspace(project.workspaceId).id,
    missions: project.missions.map((mission) => {
      const seeded = seededMissionById.get(mission.id);
      const snapshot = parseSnapshotMetadata(mission.missionData);
      const snapshotWorldType =
        snapshot?.worldType === "2D" || snapshot?.worldType === "3D"
          ? snapshot.worldType
          : undefined;
      const snapshotWorld =
        typeof snapshot?.world === "string" ? snapshot.world : undefined;
      const snapshotWorldId =
        typeof snapshot?.worldId === "string" ? snapshot.worldId : undefined;
      const snapshotVehicle =
        typeof snapshot?.vehicle === "string" ? snapshot.vehicle : undefined;
      const snapshotDroneId =
        typeof snapshot?.droneId === "string" ? snapshot.droneId : undefined;
      const sharedWith = (
        mission.sharedWith ?? (seeded ? SAMPLE_SHARED_USERS : [])
      ).reduce<string[]>((emails, email) => {
        const normalized = email.trim().toLocaleLowerCase();
        if (
          normalized &&
          !emails.some((current) => current.toLocaleLowerCase() === normalized)
        )
          emails.push(email.trim());
        return emails;
      }, []);
      const sharedRoles = sharedWith.reduce<Record<string, SharedMissionRole>>(
        (roles, email) => {
          const normalizedEmail = email.toLocaleLowerCase();
          roles[normalizedEmail] =
            mission.sharedRoles?.[normalizedEmail] === "editor"
              ? "editor"
              : "view-only";
          return roles;
        },
        {},
      );
      const cleanMission = { ...mission } as LibMission & {
        editedAgo?: string;
      };
      delete cleanMission.editedAgo;
      return {
        ...cleanMission,
        updatedAt: isValidTimestamp(mission.updatedAt)
          ? mission.updatedAt
          : null,
        shared:
          mission.sharedWith === undefined
            ? mission.shared || sharedWith.length > 0
            : sharedWith.length > 0,
        sharedWith,
        sharedRoles,
        worldType: mission.worldType ?? snapshotWorldType ?? seeded?.worldType,
        world: mission.world ?? snapshotWorld ?? seeded?.world,
        worldId: mission.worldId ?? snapshotWorldId,
        vehicle: mission.vehicle ?? snapshotVehicle ?? seeded?.vehicle,
        droneId: mission.droneId ?? snapshotDroneId,
      };
    }),
  }));
}

export function seedTemplates(): LibTemplate[] {
  return Array.isArray(templatesSeed) ? (templatesSeed as LibTemplate[]) : [];
}

/** Load persisted state, falling back to the JSON seeds. Never throws. */
export function loadProjects(): LibProject[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw) as unknown;
      if (isDatabase(parsed) || isLegacyDatabase(parsed)) {
        const migrated = isLegacyDatabase(parsed);
        const sourceProjects = migrated
          ? migrateLegacyProjects(parsed.projects)
          : parsed.projects;
        const hydratedProjects = alignSatoriniSeedMission(
          ensureLeevilleMission(
            ensureSeededMission(
              ensureSeededMission(
                ensureSeededMission(
                  normalizeProjects(sourceProjects),
                  seedProjects(),
                  "m-local-mww4lv4v-101",
                ),
                seedProjects(),
                SATORINI_SAMPLE_MISSION_ID,
              ),
              seedProjects(),
              BITEXCO_SAMPLE_MISSION_ID,
            ),
          ),
        );
        if (migrated) saveProjects(hydratedProjects);
        return hydratedProjects;
      }
    }
  } catch {
    /* storage unavailable or corrupt: fall through to seeds */
  }
  return normalizeProjects(seedProjects());
}

/** Find the owning project and mission for a stable Library mission ID. */
export function findMissionRecord(
  projects: LibProject[],
  missionId: string,
): { project: LibProject; mission: LibMission } | null {
  for (const project of projects) {
    const mission = project.missions.find((item) => item.id === missionId);
    if (mission) return { project, mission };
  }
  return null;
}

/** Persist the current state. Returns false if browser storage is unavailable. */
export function saveProjects(projects: LibProject[]): boolean {
  try {
    const shape: DatabaseShape = {
      version: DB_VERSION,
      projects: normalizeProjects(projects),
    };
    localStorage.setItem(DB_KEY, JSON.stringify(shape));
    return true;
  } catch {
    return false;
  }
}

/** Save a complete Studio snapshot into the matching local Library record. */
export function saveMissionSnapshot(
  missionId: string,
  missionData: string,
  metadata: Pick<
    LibMission,
    | "name"
    | "world"
    | "worldType"
    | "worldId"
    | "vehicle"
    | "droneId"
    | "basemapStyle"
  >,
): boolean {
  const projects = loadProjects();
  let found = false;
  const next = projects.map((project) => ({
    ...project,
    missions: project.missions.map((mission) => {
      if (mission.id !== missionId) return mission;
      found = true;
      return {
        ...mission,
        ...metadata,
        missionData,
        updatedAt: new Date().toISOString(),
      };
    }),
  }));
  return found && saveProjects(next);
}

/** Keep a cloned snapshot's internal identity aligned with its new Library ID. */
export function cloneMissionSnapshotIdentity(
  missionData: string | undefined,
  missionId: string,
  name: string,
): string | undefined {
  if (!missionData) return undefined;
  try {
    const parsed: unknown = JSON.parse(missionData) as unknown;
    if (!isRecord(parsed)) return undefined;
    const mission = parsed;
    return JSON.stringify({ ...mission, id: missionId, name });
  } catch {
    return undefined;
  }
}

/** Forget persisted state so seeds load again. Never throws. */
export function clearProjects(): void {
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    /* ignore */
  }
}

/** Download the current state as JSON (promote into seeds by hand). */
export function exportProjects(projects: LibProject[]): void {
  const shape: DatabaseShape & { exportedAt: string } = {
    version: DB_VERSION,
    projects,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(shape, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "skytrack-library.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
