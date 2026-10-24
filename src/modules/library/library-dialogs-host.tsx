import type { Dispatch, SetStateAction } from "react";
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
import {
  CloneProjectPicker,
  MissionDialog,
  ProjectDialog,
  ShareDialog,
} from "./library-dialogs";
import CreateMissionWizard, { type WizardResult } from "./create-wizard";
import DroneProfileDialog from "./drone-profile-dialog";
import { WorldProfileDialog } from "./workspace-resource-dialogs";
import { ImportAIModelDialog } from "./import-ai-model-dialog";
import {
  AccountMenuDialogs,
  type AccountMenuPanel,
} from "./account-menu-dialogs";
import type {
  AccountProfile,
  NotificationPreferences,
} from "./account-menu-state";
import type { LibProject } from "./database/store";
import type { WorkspaceDroneProfile } from "./database/drone-store";
import type {
  WorkspaceAIModelRecord,
  WorkspaceWorldRecord,
} from "./database/workspace-resources-store";
import { getWorkspace } from "./workspace-data";

type Setter<T> = Dispatch<SetStateAction<T>>;
type MissionDlg = {
  mode: "rename";
  projectId: string;
  missionId: string;
  initialName: string;
} | null;
type ProjectDlg =
  | { mode: "create" }
  | { mode: "rename"; projectId: string; initialName: string }
  | null;
type ShareDlg = { projectId: string; missionId: string; name: string } | null;
type MissionDelete = {
  projectId: string;
  missionId: string;
  name: string;
} | null;
type ProjectDelete = {
  projectId: string;
  name: string;
  missionCount: number;
} | null;
type ProfileEditor<T> = { mode: "create" | "edit"; profile: T } | null;
type MissionReference = { project: string; mission: string };

export interface LibraryDialogsHostProps {
  missionDlg: MissionDlg;
  setMissionDlg: Setter<MissionDlg>;
  submitMissionDlg: (title: string) => void;
  wizardOpen: boolean;
  setWizardOpen: Setter<boolean>;
  wizardKey: number;
  workspaceProjects: LibProject[];
  wizardSeed: { projectId: string; title: string };
  workspaceDrones: WorkspaceDroneProfile[];
  worlds: WorkspaceWorldRecord[];
  submitWizard: (result: WizardResult) => void;
  projectDlg: ProjectDlg;
  setProjectDlg: Setter<ProjectDlg>;
  submitProjectDlg: (title: string) => void;
  droneEditor: ProfileEditor<WorkspaceDroneProfile>;
  setDroneEditor: Setter<ProfileEditor<WorkspaceDroneProfile>>;
  saveDroneProfile: (profile: WorkspaceDroneProfile) => void;
  worldEditor: ProfileEditor<WorkspaceWorldRecord>;
  setWorldEditor: Setter<ProfileEditor<WorkspaceWorldRecord>>;
  sourceMissions: { id: string; projectName: string; missionName: string }[];
  saveWorldProfile: (profile: WorkspaceWorldRecord) => void;
  importModelOpen: boolean;
  setImportModelOpen: Setter<boolean>;
  existingAIModelNames: string[];
  importAIModel: (file: {
    name: string;
    fileName: string;
    fileSize: number;
  }) => boolean;
  shareDlg: ShareDlg;
  setShareDlg: Setter<ShareDlg>;
  shareMission: () => void;
  cloneTarget: { missionId: string; name: string } | null;
  setCloneTarget: Setter<{ missionId: string; name: string } | null>;
  cloneMission: (projectId: string) => void;
  deleteMission: MissionDelete;
  setDeleteMission: Setter<MissionDelete>;
  confirmDeleteMission: () => void;
  deleteProject: ProjectDelete;
  setDeleteProject: Setter<ProjectDelete>;
  confirmDeleteProject: () => void;
  deleteDroneId: string | null;
  setDeleteDroneId: Setter<string | null>;
  activeWorkspace: ReturnType<typeof getWorkspace>;
  droneToDelete: WorkspaceDroneProfile | null;
  deleteDroneReferences: MissionReference[];
  deleteDrone: () => void;
  deleteWorldId: string | null;
  setDeleteWorldId: Setter<string | null>;
  worldToDelete: WorkspaceWorldRecord | null;
  deleteWorldReferences: MissionReference[];
  deleteWorld: () => void;
  deleteModelId: string | null;
  setDeleteModelId: Setter<string | null>;
  modelToDelete: WorkspaceAIModelRecord | null;
  deleteAIModel: () => void;
  accountPanel: AccountMenuPanel | null;
  setAccountPanel: Setter<AccountMenuPanel | null>;
  accountProfile: AccountProfile;
  notificationPreferences: NotificationPreferences;
  updateAccountProfile: (name: string) => boolean;
  updateNotificationPreferences: (next: NotificationPreferences) => void;
  onAnnounce: (message: string) => void;
  onLogout: () => void;
}

export default function LibraryDialogsHost({
  missionDlg,
  setMissionDlg,
  submitMissionDlg,
  wizardOpen,
  setWizardOpen,
  wizardKey,
  workspaceProjects,
  wizardSeed,
  workspaceDrones,
  worlds,
  submitWizard,
  projectDlg,
  setProjectDlg,
  submitProjectDlg,
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
  shareDlg,
  setShareDlg,
  shareMission,
  cloneTarget,
  setCloneTarget,
  cloneMission,
  deleteMission,
  setDeleteMission,
  confirmDeleteMission,
  deleteProject,
  setDeleteProject,
  confirmDeleteProject,
  deleteDroneId,
  setDeleteDroneId,
  activeWorkspace,
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
  accountPanel,
  setAccountPanel,
  accountProfile,
  notificationPreferences,
  updateAccountProfile,
  updateNotificationPreferences,
  onAnnounce,
  onLogout,
}: LibraryDialogsHostProps) {
  return (
    <>
      {/* Mission rename dialog. */}
      <MissionDialog
        dlg={missionDlg}
        onClose={() => setMissionDlg(null)}
        onSubmit={submitMissionDlg}
      />
      {/* Guided creation (Figma 631:29818): General → World → Drone. */}
      <CreateMissionWizard
        key={`wizard-${wizardKey}`}
        open={wizardOpen}
        projects={workspaceProjects}
        initialProjectId={
          wizardSeed.projectId || workspaceProjects[0]?.id || ""
        }
        initialTitle={wizardSeed.title}
        drones={workspaceDrones}
        worlds={worlds}
        onClose={() => setWizardOpen(false)}
        onSubmit={submitWizard}
      />
      {/* New / Update Project — real copy: "Create project to manage your
          missions", "Project title" (120), Cancel + Create/Update. */}
      <ProjectDialog
        dlg={projectDlg}
        onClose={() => setProjectDlg(null)}
        onSubmit={submitProjectDlg}
      />
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
      {/* Share mission — real copy: email (254, "Enter a valid email
          address"), Permission ["View only"], Cancel + Share Mission. */}
      <ShareDialog
        dlg={shareDlg}
        onClose={() => setShareDlg(null)}
        onSubmit={shareMission}
      />
      {/* Clone target project picker (simplified ProjectSelection). */}
      <Dialog
        open={cloneTarget !== null}
        onOpenChange={(v: boolean) => {
          if (!v) setCloneTarget(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label="Clone mission">
            <DialogHeader>
              <DialogTitle>Clone mission</DialogTitle>
              <DialogDescription>
                {cloneTarget ? (
                  <>
                    Choose a project for the copy of &ldquo;{cloneTarget.name}
                    &rdquo;.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <div className="ms-lib-form">
              <CloneProjectPicker
                projects={workspaceProjects}
                onPick={cloneMission}
                onNewProject={() => {
                  setCloneTarget(null);
                  setProjectDlg({ mode: "create" });
                }}
              />
            </div>
            <DialogFooter>
              <DialogClose className="w-auto flex-[0_0_auto]">
                Cancel
              </DialogClose>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      {/* Delete Mission — real confirm copy. */}
      <Dialog
        open={deleteMission !== null}
        onOpenChange={(v: boolean) => {
          if (!v) setDeleteMission(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label="Delete mission">
            <DialogHeader>
              <DialogTitle>Delete Mission?</DialogTitle>
              <DialogDescription>
                {deleteMission ? (
                  <>
                    Do you want to delete the &ldquo;{deleteMission.name}&rdquo;
                    mission? This action can&apos;t be reversed.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose className="w-auto flex-[0_0_auto]">
                Cancel
              </DialogClose>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDeleteMission}
                className="w-auto flex-[0_0_auto]"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
      {/* Delete Project — real confirm copy. */}
      <Dialog
        open={deleteProject !== null}
        onOpenChange={(v: boolean) => {
          if (!v) setDeleteProject(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label="Delete project">
            <DialogHeader>
              <DialogTitle>Delete Project?</DialogTitle>
              <DialogDescription>
                {deleteProject ? (
                  <>
                    The &ldquo;{deleteProject.name}&rdquo; project contains{" "}
                    {deleteProject.missionCount} mission
                    {deleteProject.missionCount === 1 ? "" : "s"}. Deleting it
                    will also permanently delete {deleteProject.missionCount}{" "}
                    mission{deleteProject.missionCount === 1 ? "" : "s"}. This
                    action can&apos;t be reversed.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose className="w-auto flex-[0_0_auto]">
                Cancel
              </DialogClose>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDeleteProject}
                className="w-auto flex-[0_0_auto]"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
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
              <DialogTitle>Delete drone profile?</DialogTitle>
              <DialogDescription>
                {droneToDelete
                  ? `Delete ${droneToDelete.name} from ${activeWorkspace.name}?`
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
              <DialogTitle>
                {deleteWorldReferences.length > 0
                  ? "World is in use"
                  : "Delete World?"}
              </DialogTitle>
              <DialogDescription>
                {worldToDelete
                  ? `${worldToDelete.name} · ${activeWorkspace.name}`
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
              <DialogTitle>Remove uploaded model?</DialogTitle>
              <DialogDescription>
                {modelToDelete
                  ? `Delete ${modelToDelete.name} from ${activeWorkspace.name}?`
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
      <AccountMenuDialogs
        panel={accountPanel}
        profile={accountProfile}
        notifications={notificationPreferences}
        onClose={() => setAccountPanel(null)}
        onSaveProfile={updateAccountProfile}
        onChangeNotifications={updateNotificationPreferences}
        onAnnounce={onAnnounce}
        onLogout={onLogout}
      />{" "}
    </>
  );
}
