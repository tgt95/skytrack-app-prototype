import { Button } from "skytrack-ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "skytrack-ui/dialog";
import DroneProfileDialog from "./drone-profile-dialog";
import { WorldProfileDialog } from "./workspace-resource-dialogs";
import { ImportAIModelDialog } from "./import-ai-model-dialog";
import type { WorkspaceDroneProfile } from "./database/drone-store";
import type {
  WorkspaceAIModelRecord,
  WorkspaceWorldRecord,
} from "./database/workspace-resources-store";

type ProfileEditor<T> = { mode: "create" | "edit"; profile: T } | null;
type MissionReference = { project: string; mission: string };

export interface LibraryResourceEditorDialogsProps {
  droneEditor: ProfileEditor<WorkspaceDroneProfile>;
  setDroneEditor: (next: ProfileEditor<WorkspaceDroneProfile>) => void;
  saveDroneProfile: (profile: WorkspaceDroneProfile) => void;
  worldEditor: ProfileEditor<WorkspaceWorldRecord>;
  setWorldEditor: (next: ProfileEditor<WorkspaceWorldRecord>) => void;
  sourceMissions: { id: string; projectName: string; missionName: string }[];
  saveWorldProfile: (profile: WorkspaceWorldRecord) => void;
  importModelOpen: boolean;
  setImportModelOpen: (open: boolean) => void;
  existingAIModelNames: string[];
  importAIModel: (file: {
    name: string;
    fileName: string;
    fileSize: number;
  }) => boolean;
}

export function LibraryResourceEditorDialogs({
  droneEditor,
  setDroneEditor,
  saveDroneProfile,
  worldEditor,
  setWorldEditor,
  sourceMissions,
  saveWorldProfile,
  importModelOpen,
  setImportModelOpen,
  existingAIModelNames,
  importAIModel,
}: LibraryResourceEditorDialogsProps) {
  return (
    <>
      <DroneProfileDialog
        open={droneEditor !== null}
        mode={droneEditor?.mode ?? "create"}
        profile={droneEditor?.profile ?? null}
        onClose={() => setDroneEditor(null)}
        onSave={saveDroneProfile}
      />
      <WorldProfileDialog
        open={worldEditor !== null}
        mode={worldEditor?.mode ?? "create"}
        profile={worldEditor?.profile ?? null}
        sourceMissions={sourceMissions}
        onClose={() => setWorldEditor(null)}
        onSave={saveWorldProfile}
      />
      <ImportAIModelDialog
        open={importModelOpen}
        existingNames={existingAIModelNames}
        onClose={() => setImportModelOpen(false)}
        onImport={importAIModel}
      />
    </>
  );
}

export interface LibraryResourceDeleteDialogsProps {
  deleteDroneId: string | null;
  setDeleteDroneId: (id: string | null) => void;
  workspaceName: string;
  droneToDelete: WorkspaceDroneProfile | null;
  deleteDroneReferences: MissionReference[];
  deleteDrone: () => void;
  deleteWorldId: string | null;
  setDeleteWorldId: (id: string | null) => void;
  worldToDelete: WorkspaceWorldRecord | null;
  deleteWorldReferences: MissionReference[];
  deleteWorld: () => void;
  deleteModelId: string | null;
  setDeleteModelId: (id: string | null) => void;
  modelToDelete: WorkspaceAIModelRecord | null;
  deleteAIModel: () => void;
}

export function LibraryResourceDeleteDialogs({
  deleteDroneId,
  setDeleteDroneId,
  workspaceName,
  droneToDelete,
  deleteDroneReferences,
  deleteDrone,
  deleteWorldId,
  setDeleteWorldId,
  worldToDelete,
  deleteWorldReferences,
  deleteWorld,
  deleteModelId,
  setDeleteModelId,
  modelToDelete,
  deleteAIModel,
}: LibraryResourceDeleteDialogsProps) {
  return (
    <>
      <Dialog
        open={deleteDroneId !== null}
        onOpenChange={(v: boolean) => {
          if (!v) setDeleteDroneId(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label="Delete drone profile">
            <DialogHeader>
              <DialogTitle className="heading">
                Delete drone profile?
              </DialogTitle>
              <DialogDescription>
                {droneToDelete
                  ? `Delete ${droneToDelete.name} from ${workspaceName}?`
                  : null}
              </DialogDescription>
            </DialogHeader>
            {deleteDroneReferences.length > 0 ? (
              <div className="ms-drone-reference-warning" role="alert">
                <p className="m-[0_0_0.5rem]">
                  This Drone is selected by {deleteDroneReferences.length}{" "}
                  mission{deleteDroneReferences.length === 1 ? "" : "s"}. Change
                  those missions to another Drone before deleting this profile.
                </p>
                <ul className="flex flex-col gap-[0.3125rem] m-0 pl-[1.125rem]">
                  {deleteDroneReferences.map((reference) => (
                    <li key={`${reference.project}-${reference.mission}`}>
                      <strong>{reference.mission}</strong>
                      <span className="ml-[0.375rem] text-(--muted-foreground)">
                        {reference.project}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <DialogFooter>
              <DialogClose className="w-auto flex-[0_0_auto]">
                Cancel
              </DialogClose>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteDroneReferences.length > 0}
                onClick={deleteDrone}
                className="w-auto flex-[0_0_auto]"
              >
                Delete Drone
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      <Dialog
        open={deleteWorldId !== null}
        onOpenChange={(v: boolean) => {
          if (!v) setDeleteWorldId(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label="Delete World">
            <DialogHeader>
              <DialogTitle className="heading">
                {deleteWorldReferences.length > 0
                  ? "World is in use"
                  : "Delete World?"}
              </DialogTitle>
              <DialogDescription>
                {worldToDelete
                  ? `${worldToDelete.name} · ${workspaceName}`
                  : null}
              </DialogDescription>
            </DialogHeader>
            {deleteWorldReferences.length > 0 ? (
              <div className="ms-drone-reference-warning" role="alert">
                <p className="m-[0_0_0.5rem]">
                  This World is selected by {deleteWorldReferences.length}{" "}
                  mission{deleteWorldReferences.length === 1 ? "" : "s"}.
                  Reassign those missions before deleting it, or archive the
                  World.
                </p>
                <ul className="flex flex-col gap-[0.3125rem] m-0 pl-[1.125rem]">
                  {deleteWorldReferences.map((reference) => (
                    <li key={`${reference.project}-${reference.mission}`}>
                      <strong>{reference.mission}</strong>
                      <span className="ml-[0.375rem] text-(--muted-foreground)">
                        {reference.project}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="ms-resource-note">
                This removes the World record. Any source and reconstruction
                references stored here will also be removed.
              </p>
            )}
            <DialogFooter>
              <DialogClose className="w-auto flex-[0_0_auto]">
                Cancel
              </DialogClose>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteWorldReferences.length > 0}
                onClick={deleteWorld}
                className="w-auto flex-[0_0_auto]"
              >
                Delete World
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      <Dialog
        open={deleteModelId !== null}
        onOpenChange={(v: boolean) => {
          if (!v) setDeleteModelId(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label="Remove uploaded AI model">
            <DialogHeader>
              <DialogTitle className="heading">
                Remove uploaded model?
              </DialogTitle>
              <DialogDescription>
                {modelToDelete
                  ? `Delete ${modelToDelete.name} from ${workspaceName}?`
                  : null}
              </DialogDescription>
            </DialogHeader>
            <p className="ms-resource-note">
              This removes the model details from this browser. The ZIP file was
              not stored here.
            </p>
            <DialogFooter>
              <DialogClose className="w-auto flex-[0_0_auto]">
                Cancel
              </DialogClose>
              <Button
                size="sm"
                variant="destructive"
                onClick={deleteAIModel}
                className="w-auto flex-[0_0_auto]"
              >
                Remove model
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
