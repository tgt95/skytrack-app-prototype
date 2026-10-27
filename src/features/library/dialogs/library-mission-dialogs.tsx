import type { RefObject } from "react";
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
} from "./library-dialogs.tsx";
import CreateMissionWizard, { type WizardResult } from "../create-wizard";
import type { LibProject } from "../database/store";
import type { WorkspaceDroneProfile } from "../database/drone-store";
import type { WorkspaceWorldRecord } from "../database/workspace-resources-store";

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

export interface LibraryMissionSetupDialogsProps {
  missionDlg: MissionDlg;
  setMissionDlg: (next: MissionDlg) => void;
  submitMissionDlg: (title: string) => void;
  wizardOpen: boolean;
  setWizardOpen: (open: boolean) => void;
  wizardKey: number;
  projects: LibProject[];
  wizardSeed: { projectId: string; title: string };
  drones: WorkspaceDroneProfile[];
  worlds: WorkspaceWorldRecord[];
  submitWizard: (result: WizardResult) => void;
  projectDlg: ProjectDlg;
  setProjectDlg: (next: ProjectDlg) => void;
  projectDialogReturnFocusRef: RefObject<HTMLElement | null>;
  submitProjectDlg: (title: string) => void;
}

export function LibraryMissionSetupDialogs({
  missionDlg,
  setMissionDlg,
  submitMissionDlg,
  wizardOpen,
  setWizardOpen,
  wizardKey,
  projects,
  wizardSeed,
  drones,
  worlds,
  submitWizard,
  projectDlg,
  setProjectDlg,
  projectDialogReturnFocusRef,
  submitProjectDlg,
}: LibraryMissionSetupDialogsProps) {
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
        projects={projects}
        initialProjectId={wizardSeed.projectId || projects[0]?.id || ""}
        initialTitle={wizardSeed.title}
        drones={drones}
        worlds={worlds}
        onClose={() => setWizardOpen(false)}
        onSubmit={submitWizard}
      />
      {/* New / Update Project — real copy: "Create project to manage your
          missions", "Project title" (120), Cancel + Create/Update. */}
      <ProjectDialog
        dlg={projectDlg}
        focusReturnRef={projectDialogReturnFocusRef}
        onClose={() => setProjectDlg(null)}
        onSubmit={submitProjectDlg}
      />
    </>
  );
}

export interface LibraryMissionActionDialogsProps {
  projects: LibProject[];
  shareDlg: ShareDlg;
  setShareDlg: (next: ShareDlg) => void;
  shareMission: () => void;
  cloneTarget: { missionId: string; name: string } | null;
  setCloneTarget: (next: { missionId: string; name: string } | null) => void;
  cloneMission: (projectId: string) => void;
  setProjectDlg: (next: ProjectDlg) => void;
  deleteMission: MissionDelete;
  setDeleteMission: (next: MissionDelete) => void;
  confirmDeleteMission: () => void;
  deleteProject: ProjectDelete;
  setDeleteProject: (next: ProjectDelete) => void;
  confirmDeleteProject: () => void;
}

export function LibraryMissionActionDialogs({
  projects,
  shareDlg,
  setShareDlg,
  shareMission,
  cloneTarget,
  setCloneTarget,
  cloneMission,
  setProjectDlg,
  deleteMission,
  setDeleteMission,
  confirmDeleteMission,
  deleteProject,
  setDeleteProject,
  confirmDeleteProject,
}: LibraryMissionActionDialogsProps) {
  return (
    <>
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
              <DialogTitle className="heading">Clone mission</DialogTitle>
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
                projects={projects}
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
              <DialogTitle className="heading">Delete Mission?</DialogTitle>
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
              <DialogTitle className="heading">Delete Project?</DialogTitle>
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
    </>
  );
}
