import { useMemo, useRef, useState } from "react";
import type { LibProject } from "../database/store";
import {
  loadDroneProfiles,
  saveDroneProfiles,
  type WorkspaceDroneProfile,
} from "../database/drone-store";
import { deleteWorldGlbAsset } from "../database/world-glb-assets";
import {
  loadWorkspaceResources,
  saveWorkspaceResources,
  type WorkspaceAIModelRecord,
  type WorkspaceResourceState,
  type WorkspaceWorldRecord,
} from "../database/workspace-resources-store";
import { DEFAULT_WORKSPACE_ID } from "./workspace-data.ts";

type MissionReference = { project: string; mission: string };

export function useWorkspaceResources({
  workspaceId,
  workspaceName,
  projects,
  deleteDroneId,
  deleteWorldId,
  deleteModelId,
  createId,
  onAnnounce,
}: {
  workspaceId: string;
  workspaceName: string;
  projects: LibProject[];
  deleteDroneId: string | null;
  deleteWorldId: string | null;
  deleteModelId: string | null;
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
  const deleteDroneReferences: MissionReference[] = droneToDelete
    ? projects.flatMap((project) => {
        if (
          (project.workspaceId ?? DEFAULT_WORKSPACE_ID) !==
          droneToDelete.workspaceId
        )
          return [];
        return project.missions.flatMap((mission) => {
          let snapshot: Record<string, unknown> | null = null;
          try {
            snapshot = mission.missionData
              ? (JSON.parse(mission.missionData) as Record<string, unknown>)
              : null;
          } catch {
            snapshot = null;
          }
          const referencedId =
            mission.droneId ??
            (typeof snapshot?.droneId === "string"
              ? snapshot.droneId
              : undefined);
          const referencedName =
            mission.vehicle ??
            (typeof snapshot?.vehicle === "string"
              ? snapshot.vehicle
              : undefined);
          const matches =
            referencedId === droneToDelete.id ||
            (!referencedId &&
              Boolean(referencedName) &&
              [droneToDelete.name, ...droneToDelete.legacyLabels].includes(
                referencedName as string,
              ));
          return matches
            ? [{ project: project.name, mission: mission.name }]
            : [];
        });
      })
    : [];

  const worldToDelete =
    workspaceWorlds.find((world) => world.id === deleteWorldId) ?? null;
  const deleteWorldReferences: MissionReference[] = worldToDelete
    ? projects.flatMap((project) => {
        if (
          (project.workspaceId ?? DEFAULT_WORKSPACE_ID) !==
          worldToDelete.workspaceId
        )
          return [];
        return project.missions.flatMap((mission) => {
          let snapshot: Record<string, unknown> | null = null;
          try {
            snapshot = mission.missionData
              ? (JSON.parse(mission.missionData) as Record<string, unknown>)
              : null;
          } catch {
            snapshot = null;
          }
          const referencedId =
            mission.worldId ??
            (typeof snapshot?.worldId === "string"
              ? snapshot.worldId
              : undefined);
          const matches = referencedId
            ? referencedId === worldToDelete.id
            : mission.world === worldToDelete.name;
          return matches
            ? [{ project: project.name, mission: mission.name }]
            : [];
        });
      })
    : [];
  const modelToDelete =
    uploadedAIModels.find((model) => model.id === deleteModelId) ?? null;
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
    fileName,
    fileSize,
  }: {
    name: string;
    fileName: string;
    fileSize: number;
  }) => {
    const importedModel: WorkspaceAIModelRecord = {
      id: createId("ai-model"),
      workspaceId,
      origin: "user-upload",
      uploadedBy: "You",
      name,
      version: "",
      task: "Object detection",
      inputModality: "",
      compatibility: "",
      status: "Draft",
      assetReference: fileName,
      note: "",
      packageFileName: fileName,
      packageFileSize: fileSize,
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
    if (!modelToDelete) return false;
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
    onAnnounce("Imported AI model removed from this browser.");
    return true;
  };

  return {
    workspaceDrones,
    workspaceWorlds,
    workspaceAIModels,
    skytrackAIModels,
    uploadedAIModels,
    sourceMissions,
    droneToDelete,
    deleteDroneReferences,
    worldToDelete,
    deleteWorldReferences,
    modelToDelete,
    existingAIModelNames,
    saveDroneProfile,
    deleteDroneProfile,
    saveWorldProfile,
    deleteWorldProfile,
    importAIModel,
    deleteAIModel,
  };
}
