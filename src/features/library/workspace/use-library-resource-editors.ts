import { useState } from "react";
import type { WorkspaceDroneProfile } from "../database/drone-store";
import type {
  WorkspaceAIModelRecord,
  WorkspaceWorldRecord,
} from "../database/workspace-resources-store";

export type LibraryResourceEditor<T> = {
  mode: "create" | "edit";
  profile: T;
} | null;

type MissionReference = { project: string; mission: string };

type AIModelPackageInput = {
  name: string;
  fileName: string;
  fileSize: number;
};

export function useLibraryResourceEditors() {
  const [droneEditor, setDroneEditor] =
    useState<LibraryResourceEditor<WorkspaceDroneProfile>>(null);
  const [deleteDroneId, setDeleteDroneId] = useState<string | null>(null);
  const [worldEditor, setWorldEditor] =
    useState<LibraryResourceEditor<WorkspaceWorldRecord>>(null);
  const [deleteWorldId, setDeleteWorldId] = useState<string | null>(null);
  const [importModelOpen, setImportModelOpen] = useState(false);
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);

  return {
    droneEditor,
    setDroneEditor,
    deleteDroneId,
    setDeleteDroneId,
    worldEditor,
    setWorldEditor,
    deleteWorldId,
    setDeleteWorldId,
    importModelOpen,
    setImportModelOpen,
    deleteModelId,
    setDeleteModelId,
  };
}

export function createLibraryResourceEditorActions({
  droneEditor,
  worldEditor,
  deleteDroneId,
  deleteWorldId,
  deleteModelId,
  deleteDroneReferences,
  deleteWorldReferences,
  modelToDelete,
  persistDroneProfile,
  removeDroneProfile,
  persistWorldProfile,
  removeWorldProfile,
  persistAIModel,
  removeAIModel,
  closeDroneEditor,
  closeWorldEditor,
  clearDeleteDroneId,
  clearDeleteWorldId,
  clearDeleteModelId,
  onAIModelImported,
}: {
  droneEditor: LibraryResourceEditor<WorkspaceDroneProfile>;
  worldEditor: LibraryResourceEditor<WorkspaceWorldRecord>;
  deleteDroneId: string | null;
  deleteWorldId: string | null;
  deleteModelId: string | null;
  deleteDroneReferences: readonly MissionReference[];
  deleteWorldReferences: readonly MissionReference[];
  modelToDelete: WorkspaceAIModelRecord | null;
  persistDroneProfile: (
    profile: WorkspaceDroneProfile,
    mode: "create" | "edit",
    originalName?: string,
  ) => boolean;
  removeDroneProfile: (id: string) => boolean;
  persistWorldProfile: (
    profile: WorkspaceWorldRecord,
    mode: "create" | "edit",
  ) => boolean;
  removeWorldProfile: (id: string) => boolean;
  persistAIModel: (model: AIModelPackageInput) => boolean;
  removeAIModel: (id: string) => boolean;
  closeDroneEditor: () => void;
  closeWorldEditor: () => void;
  clearDeleteDroneId: () => void;
  clearDeleteWorldId: () => void;
  clearDeleteModelId: () => void;
  onAIModelImported: () => void;
}) {
  const saveDroneProfile = (profile: WorkspaceDroneProfile) => {
    if (!droneEditor) return;
    if (
      persistDroneProfile(profile, droneEditor.mode, droneEditor.profile.name)
    )
      closeDroneEditor();
  };

  const deleteDrone = () => {
    if (!deleteDroneId || deleteDroneReferences.length > 0) return;
    if (removeDroneProfile(deleteDroneId)) clearDeleteDroneId();
  };

  const saveWorldProfile = (profile: WorkspaceWorldRecord) => {
    if (!worldEditor) return;
    if (persistWorldProfile(profile, worldEditor.mode)) closeWorldEditor();
  };

  const deleteWorld = () => {
    if (!deleteWorldId || deleteWorldReferences.length > 0) return;
    if (removeWorldProfile(deleteWorldId)) clearDeleteWorldId();
  };

  const importAIModel = (model: AIModelPackageInput) => {
    const saved = persistAIModel(model);
    if (saved) onAIModelImported();
    return saved;
  };

  const deleteAIModel = () => {
    if (!deleteModelId || !modelToDelete) return;
    if (removeAIModel(deleteModelId)) clearDeleteModelId();
  };

  return {
    saveDroneProfile,
    deleteDrone,
    saveWorldProfile,
    deleteWorld,
    importAIModel,
    deleteAIModel,
  };
}
