import { useMemo, useRef, useState } from "react";
import type { LibProject } from "@/features/library/database/store";
import {
  loadDroneProfiles,
  saveDroneProfiles,
  type WorkspaceDroneProfile,
} from "@/features/library/database/drone-store";
import { deleteWorldGlbAsset } from "@/features/library/database/world-glb-assets";
import {
  loadWorkspaceResources,
  saveWorkspaceResources,
  type WorkspaceAIModelRecord,
  type WorkspaceResourceState,
  type WorkspaceMapDatasetRecord,
  type WorkspaceWorldRecord,
} from "@/features/library/database/workspace-resources-store";
import { DEFAULT_WORKSPACE_ID } from "./workspace-data.ts";
import { canManageAIModel } from "./use-ai-model-access";
import {
  findAIModelMissionReferences,
  findDroneMissionReferences,
  findWorldMissionReferences,
} from "./resource-mission-references";

export function useWorkspaceResources({
  workspaceId,
  workspaceName,
  projects,
  deleteDroneId,
  deleteWorldId,
  deleteModelId,
  canEditSharedModels = false,
  currentUserName = "",
  createId,
  onAnnounce,
}: {
  workspaceId: string;
  workspaceName: string;
  projects: LibProject[];
  deleteDroneId: string | null;
  deleteWorldId: string | null;
  deleteModelId: string | null;
  canEditSharedModels?: boolean;
  currentUserName?: string;
  createId: (prefix: string) => string;
  onAnnounce: (text: string) => void;
}) {
  const [droneProfiles, setDroneProfiles] =
    useState<WorkspaceDroneProfile[]>(loadDroneProfiles);
  const [resourceState, setResourceState] = useState<WorkspaceResourceState>(
    loadWorkspaceResources,
  );
  const droneProfilesRef = useRef(droneProfiles);
  droneProfilesRef.current = droneProfiles;
  const resourceStateRef = useRef(resourceState);
  resourceStateRef.current = resourceState;

  const workspaceDrones = useMemo(
    () =>
      droneProfiles.filter((profile) => profile.workspaceId === workspaceId),
    [droneProfiles, workspaceId],
  );
  const workspaceWorlds = useMemo(
    () =>
      resourceState.worlds.filter(
        (world) =>
          world.workspaceId === workspaceId &&
          world.id !== "blank-space" &&
          world.name.trim().toLowerCase() !== "blank space",
      ),
    [resourceState.worlds, workspaceId],
  );
  const workspaceMapDatasets = useMemo(
    () =>
      resourceState.mapDatasets.filter(
        (dataset) => dataset.workspaceId === workspaceId,
      ),
    [resourceState.mapDatasets, workspaceId],
  );
  const skytrackAIModels = useMemo(
    () =>
      resourceState.aiModels.filter(
        (model) =>
          model.workspaceId === workspaceId && model.origin === "skytrack",
      ),
    [resourceState.aiModels, workspaceId],
  );
  const workspaceAIModels = useMemo(
    () =>
      resourceState.aiModels.filter(
        (model) =>
          model.workspaceId === workspaceId &&
          (model.origin === "workspace" || model.origin === undefined),
      ),
    [resourceState.aiModels, workspaceId],
  );
  const uploadedAIModels = useMemo(
    () =>
      resourceState.aiModels.filter(
        (model) =>
          model.workspaceId === workspaceId && model.origin === "user-upload",
      ),
    [resourceState.aiModels, workspaceId],
  );
  const sourceMissions = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            (project.workspaceId ?? DEFAULT_WORKSPACE_ID) === workspaceId,
        )
        .flatMap((project) =>
          project.missions
            .filter((mission) => mission.worldType === "2D")
            .map((mission) => ({
              id: mission.id,
              projectName: project.name,
              missionName: mission.name,
            })),
        ),
    [projects, workspaceId],
  );

  const droneToDelete =
    droneProfiles.find((profile) => profile.id === deleteDroneId) ?? null;
  const deleteDroneReferences = findDroneMissionReferences(
    projects,
    droneToDelete,
  );

  const worldToDelete =
    workspaceWorlds.find((world) => world.id === deleteWorldId) ?? null;
  const deleteWorldReferences = findWorldMissionReferences(
    projects,
    worldToDelete,
  );
  const modelToDelete =
    resourceState.aiModels.find(
      (model) =>
        model.workspaceId === workspaceId &&
        model.id === deleteModelId &&
        canManageAIModel(model, canEditSharedModels, currentUserName),
    ) ?? null;
  const deleteModelReferences = findAIModelMissionReferences(
    projects,
    modelToDelete,
    workspaceId,
  );
  const existingAIModelNames = resourceState.aiModels
    .filter((model) => model.workspaceId === workspaceId)
    .map((model) => model.name);

  const commitDroneProfiles = (next: WorkspaceDroneProfile[]) => {
    if (!saveDroneProfiles(next)) {
      onAnnounce(
        "Drone profile could not be saved in this browser. Check browser storage and try again.",
      );
      return false;
    }
    droneProfilesRef.current = next;
    setDroneProfiles(next);
    return true;
  };

  const commitResourceState = (next: WorkspaceResourceState) => {
    if (!saveWorkspaceResources(next)) {
      onAnnounce(
        "Workspace resource could not be saved in this browser. Check browser storage and try again.",
      );
      return false;
    }
    resourceStateRef.current = next;
    setResourceState(next);
    return true;
  };

  const saveDroneProfile = (
    profile: WorkspaceDroneProfile,
    mode: "create" | "edit",
    originalName?: string,
  ) => {
    const nextProfile = {
      ...profile,
      workspaceId,
      legacyLabels:
        originalName && originalName !== profile.name
          ? Array.from(new Set([...profile.legacyLabels, originalName]))
          : profile.legacyLabels,
    };
    const next =
      mode === "edit"
        ? droneProfilesRef.current.map((item) =>
            item.id === nextProfile.id ? nextProfile : item,
          )
        : [...droneProfilesRef.current, nextProfile];
    if (!commitDroneProfiles(next)) return false;
    onAnnounce(
      mode === "edit"
        ? `${nextProfile.name} updated.`
        : `${nextProfile.name} added to ${workspaceName}.`,
    );
    return true;
  };

  const deleteDroneProfile = (id: string) => {
    if (deleteDroneReferences.length > 0) return false;
    const deleted = droneProfilesRef.current.find(
      (profile) => profile.id === id,
    );
    const next = droneProfilesRef.current.filter(
      (profile) => profile.id !== id,
    );
    if (!commitDroneProfiles(next)) return false;
    onAnnounce(`${deleted?.name ?? "Drone"} deleted from ${workspaceName}.`);
    return true;
  };

  const saveWorldProfile = (
    profile: WorkspaceWorldRecord,
    mode: "create" | "edit",
  ) => {
    const nextProfile = { ...profile, workspaceId };
    const nextWorlds =
      mode === "edit"
        ? resourceStateRef.current.worlds.map((world) =>
            world.id === nextProfile.id ? nextProfile : world,
          )
        : [...resourceStateRef.current.worlds, nextProfile];
    if (
      !commitResourceState({ ...resourceStateRef.current, worlds: nextWorlds })
    )
      return false;
    onAnnounce(
      mode === "edit"
        ? `${nextProfile.name} updated.`
        : `${nextProfile.name} added to ${workspaceName}.`,
    );
    return true;
  };

  const saveMapDataset = (dataset: WorkspaceMapDatasetRecord) => {
    const nextDataset = { ...dataset, workspaceId };
    const existing = resourceStateRef.current.mapDatasets.some(
      (item) => item.id === nextDataset.id,
    );
    const nextMapDatasets = existing
      ? resourceStateRef.current.mapDatasets.map((item) =>
          item.id === nextDataset.id ? nextDataset : item,
        )
      : [...resourceStateRef.current.mapDatasets, nextDataset];
    if (
      !commitResourceState({
        ...resourceStateRef.current,
        mapDatasets: nextMapDatasets,
      })
    )
      return false;
    onAnnounce(`${nextDataset.name} added to ${workspaceName} map data.`);
    return true;
  };

  const deleteWorldProfile = (id: string) => {
    if (deleteWorldReferences.length > 0) return false;
    const worldToRemove = resourceStateRef.current.worlds.find(
      (world) => world.id === id,
    );
    const nextWorlds = resourceStateRef.current.worlds.filter(
      (world) => world.id !== id,
    );
    if (
      !commitResourceState({ ...resourceStateRef.current, worlds: nextWorlds })
    )
      return false;
    if (worldToRemove?.glbAssetId) {
      void deleteWorldGlbAsset(worldToRemove.glbAssetId).catch(() => {
        onAnnounce(
          "World deleted, but its GLB file could not be cleared from this browser.",
        );
      });
    }
    onAnnounce("World deleted.");
    return true;
  };

  const importAIModel = ({
    name,
    description,
    fileName,
    fileSize,
    thumbnailDataUrl,
  }: {
    name: string;
    description: string;
    fileName: string;
    fileSize: number;
    thumbnailDataUrl?: string;
  }) => {
    const importedModel: WorkspaceAIModelRecord = {
      id: createId("ai-model"),
      workspaceId,
      origin: "user-upload",
      uploadedBy: "You",
      name,
      description,
      version: "",
      task: "Object detection",
      inputModality: "",
      compatibility: "",
      status: "Draft",
      assetReference: fileName,
      note: "",
      packageFileName: fileName,
      packageFileSize: fileSize,
      thumbnailDataUrl,
    };
    const nextModels = [...resourceStateRef.current.aiModels, importedModel];
    if (
      !commitResourceState({
        ...resourceStateRef.current,
        aiModels: nextModels,
      })
    )
      return false;
    onAnnounce("AI model added to Uploaded by you.");
    return true;
  };

  const deleteAIModel = (id: string) => {
    const target = resourceStateRef.current.aiModels.find(
      (model) => model.id === id,
    );
    if (
      !target ||
      target.workspaceId !== workspaceId ||
      !canManageAIModel(target, canEditSharedModels, currentUserName)
    )
      return false;
    const nextModels = resourceStateRef.current.aiModels.filter(
      (model) => model.id !== id,
    );
    if (
      !commitResourceState({
        ...resourceStateRef.current,
        aiModels: nextModels,
      })
    )
      return false;
    onAnnounce(`${target.name} removed from ${workspaceName}.`);
    return true;
  };

  const saveAIModelDetails = (
    id: string,
    details: { name: string; description: string },
  ) => {
    const target = resourceStateRef.current.aiModels.find(
      (model) => model.id === id && model.workspaceId === workspaceId,
    );
    if (
      !target ||
      !canManageAIModel(target, canEditSharedModels, currentUserName)
    )
      return false;
    const normalizedName = details.name.trim();
    if (!normalizedName) return false;
    const hasDuplicate = resourceStateRef.current.aiModels.some(
      (model) =>
        model.workspaceId === workspaceId &&
        model.id !== id &&
        model.name.trim().toLowerCase() === normalizedName.toLowerCase(),
    );
    if (hasDuplicate) {
      onAnnounce("An AI model with this name already exists in the Workspace.");
      return false;
    }
    const nextModels = resourceStateRef.current.aiModels.map((model) =>
      model.id === id
        ? {
            ...model,
            name: normalizedName,
            description: details.description.trim(),
          }
        : model,
    );
    if (
      !commitResourceState({
        ...resourceStateRef.current,
        aiModels: nextModels,
      })
    )
      return false;
    onAnnounce(`${normalizedName} updated.`);
    return true;
  };

  return {
    workspaceDrones,
    workspaceWorlds,
    workspaceMapDatasets,
    workspaceAIModels,
    skytrackAIModels,
    uploadedAIModels,
    sourceMissions,
    droneToDelete,
    deleteDroneReferences,
    worldToDelete,
    deleteWorldReferences,
    modelToDelete,
    deleteModelReferences,
    existingAIModelNames,
    saveDroneProfile,
    deleteDroneProfile,
    saveWorldProfile,
    saveMapDataset,
    deleteWorldProfile,
    importAIModel,
    deleteAIModel,
    saveAIModelDetails,
  };
}
