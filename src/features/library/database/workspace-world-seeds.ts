import { DEFAULT_WORKSPACE_ID, WORKSPACES } from "@/features/library/workspace/workspace-data.ts";
import { BUNDLED_WORLD_ASSETS } from "./bundled-world-assets";
import type { WorkspaceResourceState, WorkspaceWorldRecord } from "./workspace-resources-store";

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeBundledSampleWorld(
  workspaceId: string,
  asset: (typeof BUNDLED_WORLD_ASSETS)[number],
): WorkspaceWorldRecord {
  return {
    id: `sample-world-${workspaceId}-${slug(asset.name)}`,
    workspaceId,
    name: asset.name,
    location: asset.location,
    status: "Sample",
    sourceType: "none",
    sourceMissionId: "",
    sourceMissionLabel: "",
    sourceFlightReference: "",
    reconstructionReference: "",
    note: "Bundled sample GLB World",
    glbAssetId: asset.id,
    glbFileName: asset.fileName,
    glbFileSize: asset.fileSize,
  };
}

const LEGACY_SAMPLE_WORLD_FIXTURES = [
  { workspaceId: DEFAULT_WORKSPACE_ID, name: "Field terrain", location: "Redlands, CA" },
  { workspaceId: "survey-operations", name: "Quarry terrain", location: "Benton County" },
  { workspaceId: "survey-operations", name: "Coastal world", location: "Portland, ME" },
  ...["Courtyard block", "Rooftop pad", "Rolling hills", "Mountain ridge"].map((name) => ({
    workspaceId: DEFAULT_WORKSPACE_ID,
    name,
    location: "Sample terrain",
  })),
];

export function migrateLegacySampleWorlds(
  state: WorkspaceResourceState,
): WorkspaceResourceState | null {
  const replacedWorkspaceIds = new Set<string>();
  const retainedWorlds = state.worlds.filter((world) => {
    const fixture = LEGACY_SAMPLE_WORLD_FIXTURES.find(
      (candidate) =>
        candidate.workspaceId === world.workspaceId &&
        world.id === `sample-world-${candidate.workspaceId}-${slug(candidate.name)}`,
    );
    if (
      !fixture ||
      world.status !== "Sample" ||
      world.name !== fixture.name ||
      world.location !== fixture.location ||
      world.sourceType !== "none" ||
      world.sourceMissionId !== "" ||
      world.sourceMissionLabel !== "" ||
      world.sourceFlightReference !== "" ||
      world.reconstructionReference !== "" ||
      world.note !== "" ||
      world.glbAssetId !== undefined ||
      world.glbFileName !== undefined ||
      world.glbFileSize !== undefined
    ) {
      return true;
    }
    replacedWorkspaceIds.add(world.workspaceId);
    return false;
  });

  if (replacedWorkspaceIds.size === 0) return null;

  const nextWorlds = [...retainedWorlds];
  for (const workspaceId of replacedWorkspaceIds) {
    for (const asset of BUNDLED_WORLD_ASSETS) {
      const world = makeBundledSampleWorld(workspaceId, asset);
      if (!nextWorlds.some((item) => item.id === world.id)) {
        nextWorlds.push(world);
      }
    }
  }
  return { ...state, worlds: nextWorlds };
}

export function bundledSampleWorlds() {
  return WORKSPACES.flatMap((workspace) =>
    BUNDLED_WORLD_ASSETS.map((asset) =>
      makeBundledSampleWorld(workspace.id, asset),
    ),
  );
}
