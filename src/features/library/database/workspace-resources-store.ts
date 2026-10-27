import { WORLDS } from "../../../domain/mission-model";
import { DEFAULT_WORKSPACE_ID, WORKSPACES } from "../workspace/workspace-data.ts";
import { STORAGE_KEYS, STORAGE_VERSIONS } from "../../../shared/storage-keys";

export type ResourceStatus = "Sample" | "Draft" | "Registered" | "Archived";
export type AIModelStatus = ResourceStatus | "Ready";
export type AIModelOrigin = "skytrack" | "workspace" | "user-upload";
export type WorldSourceType = "none" | "mission" | "flight-reference";

export interface WorkspaceWorldRecord {
  id: string;
  workspaceId: string;
  name: string;
  location: string;
  status: ResourceStatus;
  sourceType: WorldSourceType;
  sourceMissionId: string;
  sourceMissionLabel: string;
  sourceFlightReference: string;
  reconstructionReference: string;
  note: string;
  /** Local IndexedDB relationship for imported 3D Worlds. */
  glbAssetId?: string;
  glbFileName?: string;
  glbFileSize?: number;
}

export interface WorkspaceAIModelRecord {
  id: string;
  workspaceId: string;
  origin?: AIModelOrigin;
  uploadedBy?: string;
  name: string;
  version: string;
  task: string;
  inputModality: string;
  compatibility: string;
  status: AIModelStatus;
  assetReference: string;
  note: string;
  packageFileName?: string;
  packageFileSize?: number;
}

export interface WorkspaceResourceState {
  version: 1;
  worlds: WorkspaceWorldRecord[];
  aiModels: WorkspaceAIModelRecord[];
}

export const WORKSPACE_RESOURCES_STORAGE_KEY = STORAGE_KEYS.workspaceResources;
const statuses: ResourceStatus[] = [
  "Sample",
  "Draft",
  "Registered",
  "Archived",
];
const sourceTypes: WorldSourceType[] = ["none", "mission", "flight-reference"];

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeSampleWorld(
  workspaceId: string,
  name: string,
  location: string,
): WorkspaceWorldRecord {
  return {
    id: `sample-world-${workspaceId}-${slug(name)}`,
    workspaceId,
    name,
    location,
    status: "Sample",
    sourceType: "none",
    sourceMissionId: "",
    sourceMissionLabel: "",
    sourceFlightReference: "",
    reconstructionReference: "",
    note: "",
  };
}

function makeSampleModel(
  workspaceId: string,
  name: string,
  origin: AIModelOrigin,
  uploadedBy?: string,
): WorkspaceAIModelRecord {
  return {
    id: `sample-model-${workspaceId}-${slug(name)}`,
    workspaceId,
    origin,
    uploadedBy,
    name,
    version: "",
    task: "",
    inputModality: "",
    compatibility: "",
    status: "Sample",
    assetReference: "",
    note: "",
  };
}

function seedState(): WorkspaceResourceState {
  const worlds = WORKSPACES.flatMap((workspace) => {
    const workspaceFixtures = workspace.worlds
      .filter((world) => world.type === "3D")
      .map((world) =>
        makeSampleWorld(workspace.id, world.name, world.location),
      );
    const legacyFixtures =
      workspace.id === DEFAULT_WORKSPACE_ID
        ? WORLDS.filter(
            (name) =>
              name !== "Blank space" &&
              !workspaceFixtures.some((world) => world.name === name),
          ).map((name) => makeSampleWorld(workspace.id, name, "Sample terrain"))
        : [];
    return [...workspaceFixtures, ...legacyFixtures];
  });
  const aiModels = WORKSPACES.flatMap((workspace) =>
    workspace.aiModels.map((name, index) =>
      makeSampleModel(
        workspace.id,
        name,
        index === 0 ? "skytrack" : "workspace",
        index === 0 ? undefined : "Olivia Chen",
      ),
    ),
  );
  return { version: 1, worlds, aiModels };
}

function isWorld(value: unknown): value is WorkspaceWorldRecord {
  if (!value || typeof value !== "object") return false;
  const world = value as Partial<WorkspaceWorldRecord>;
  return (
    typeof world.id === "string" &&
    typeof world.workspaceId === "string" &&
    typeof world.name === "string" &&
    typeof world.location === "string" &&
    statuses.includes(world.status as ResourceStatus) &&
    sourceTypes.includes(world.sourceType as WorldSourceType) &&
    typeof world.sourceMissionId === "string" &&
    typeof world.sourceMissionLabel === "string" &&
    typeof world.sourceFlightReference === "string" &&
    typeof world.reconstructionReference === "string" &&
    typeof world.note === "string" &&
    (world.glbAssetId === undefined || typeof world.glbAssetId === "string") &&
    (world.glbFileName === undefined || typeof world.glbFileName === "string") &&
    (world.glbFileSize === undefined || typeof world.glbFileSize === "number")
  );
}

function isAIModel(value: unknown): value is WorkspaceAIModelRecord {
  if (!value || typeof value !== "object") return false;
  const model = value as Partial<WorkspaceAIModelRecord>;
  return (
    typeof model.id === "string" &&
    typeof model.workspaceId === "string" &&
    typeof model.name === "string" &&
    typeof model.version === "string" &&
    typeof model.task === "string" &&
    typeof model.inputModality === "string" &&
    typeof model.compatibility === "string" &&
    (statuses.includes(model.status as ResourceStatus) ||
      model.status === "Ready") &&
    typeof model.assetReference === "string" &&
    typeof model.note === "string" &&
    (model.origin === undefined ||
      model.origin === "skytrack" ||
      model.origin === "workspace" ||
      model.origin === "user-upload") &&
    (model.uploadedBy === undefined || typeof model.uploadedBy === "string") &&
    (model.packageFileName === undefined ||
      typeof model.packageFileName === "string") &&
    (model.packageFileSize === undefined ||
      typeof model.packageFileSize === "number")
  );
}

export function loadWorkspaceResources(): WorkspaceResourceState {
  try {
    const raw = localStorage.getItem(WORKSPACE_RESOURCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspaceResourceState>;
      if (
        parsed.version === STORAGE_VERSIONS.workspaceResources &&
        Array.isArray(parsed.worlds) &&
        parsed.worlds.every(isWorld) &&
        Array.isArray(parsed.aiModels) &&
        parsed.aiModels.every(isAIModel)
      ) {
        const legacySkyTrackAssignments = new Set<string>();
        const aiModels = parsed.aiModels.map((model) => {
          if (model.origin !== undefined) return model;
          if (
            !model.id.startsWith("sample-model-") ||
            legacySkyTrackAssignments.has(model.workspaceId)
          ) {
            return { ...model, origin: "workspace" as const };
          }
          legacySkyTrackAssignments.add(model.workspaceId);
          return { ...model, origin: "skytrack" as const };
        });
        return {
          version: STORAGE_VERSIONS.workspaceResources,
          worlds: parsed.worlds,
          aiModels,
        };
      }
    }
  } catch {
    /* Unavailable or corrupt storage falls back to clearly labeled samples. */
  }
  return seedState();
}

export function saveWorkspaceResources(state: WorkspaceResourceState): boolean {
  try {
    localStorage.setItem(
      WORKSPACE_RESOURCES_STORAGE_KEY,
      JSON.stringify({
        ...state,
        version: STORAGE_VERSIONS.workspaceResources,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function worldsForWorkspace(
  workspaceId: string,
): WorkspaceWorldRecord[] {
  return loadWorkspaceResources().worlds.filter(
    (world) => world.workspaceId === workspaceId,
  );
}

export function selectableWorldsForWorkspace(
  workspaceId: string,
): WorkspaceWorldRecord[] {
  return worldsForWorkspace(workspaceId).filter(
    (world) =>
      world.status === "Sample" ||
      world.status === "Registered" ||
      (world.status === "Draft" && Boolean(world.glbAssetId)),
  );
}

export function newWorkspaceWorld(
  id: string,
  workspaceId: string,
): WorkspaceWorldRecord {
  return {
    id,
    workspaceId,
    name: "",
    location: "",
    status: "Draft",
    sourceType: "none",
    sourceMissionId: "",
    sourceMissionLabel: "",
    sourceFlightReference: "",
    reconstructionReference: "",
    note: "",
  };
}
