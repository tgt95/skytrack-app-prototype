import { useMemo, useRef, useState } from "react";
import {
  cloneMissionSnapshotIdentity,
  loadProjects,
  saveProjects,
  type LibMission,
  type LibProject,
  type SharedMissionRole,
} from "@/features/library/database/store";
import { readAccountProfile } from "@/features/library/account/account-menu-state";
import { DEFAULT_WORKSPACE_ID } from "./workspace-data.ts";
import { libraryToastManager } from "@/features/library/library-toast-manager";
import type { WizardResult } from "@/features/library/create-wizard";
import type {
  LibraryEntry,
  LibrarySection,
} from "@/features/library/library-types";

interface UseLibraryProjectsOptions {
  activeWorkspaceId: string;
  projectId: string | null;
  onNavigate: (section: LibrarySection, projectId: string | null) => void;
  onOpenMission: (entry: LibraryEntry) => void;
  onAnnounce: (text: string) => void;
}

let localId = 100;
const nextId = (prefix: string) => {
  localId += 1;
  return `${prefix}-local-${Date.now().toString(36)}-${localId}`;
};

export function useLibraryProjects({
  activeWorkspaceId,
  projectId,
  onNavigate,
  onOpenMission,
  onAnnounce,
}: UseLibraryProjectsOptions) {
  const [projects, setProjects] = useState<LibProject[]>(loadProjects);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const workspaceProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          (project.workspaceId ?? DEFAULT_WORKSPACE_ID) === activeWorkspaceId,
      ),
    [activeWorkspaceId, projects],
  );
  const [missionDlg, setMissionDlg] = useState<{
    mode: "rename";
    projectId: string;
    missionId: string;
    initialName: string;
  } | null>(null);
  const projectDialogReturnFocusRef = useRef<HTMLElement | null>(null);
  const [projectDlg, setProjectDlgState] = useState<
    | { mode: "create" }
    | { mode: "rename"; projectId: string; initialName: string }
    | null
  >(null);
  const setProjectDlg = (next: typeof projectDlg) => {
    if (next && projectDlg === null) {
      const active = document.activeElement;
      projectDialogReturnFocusRef.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
    }
    setProjectDlgState(next);
  };
  const [shareDlg, setShareDlg] = useState<{
    projectId: string;
    missionId: string;
    name: string;
  } | null>(null);
  const [deleteMission, setDeleteMission] = useState<{
    projectId: string;
    missionId: string;
    name: string;
  } | null>(null);
  const [deleteProject, setDeleteProject] = useState<{
    projectId: string;
    name: string;
    missionCount: number;
  } | null>(null);
  const [cloneTarget, setCloneTarget] = useState<{
    missionId: string;
    name: string;
  } | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [wizardSeed, setWizardSeed] = useState({ projectId: "", title: "" });

  const commitProjects = (next: LibProject[]) => {
    if (!saveProjects(next)) {
      onAnnounce(
        "This change could not be saved in this browser. Check browser storage and try again.",
      );
      return false;
    }
    projectsRef.current = next;
    setProjects(next);
    return true;
  };

  const homeMissions = useMemo(
    () =>
      workspaceProjects.flatMap((project) =>
        project.missions.map((mission) => ({
          projectId: project.id,
          project: project.name,
          mission,
        })),
      ),
    [workspaceProjects],
  );
  const starredMissions = useMemo(
    () => homeMissions.filter((entry) => entry.mission.starred),
    [homeMissions],
  );

  const openCreateWizard = (
    targetProjectId = workspaceProjects[0]?.id ?? "",
    title = "",
  ) => {
    setWizardSeed({ projectId: targetProjectId, title });
    setWizardKey((key) => key + 1);
    setWizardOpen(true);
  };

  const openProject = (id: string) => {
    onNavigate("projects", id);
    const project = projects.find((item) => item.id === id);
    onAnnounce(
      `Project ${project?.name ?? ""} opened. ${project?.missions.length ?? 0} missions.`,
    );
  };

  const openMission = (
    ownerId: string,
    projectName: string,
    missionId: string,
  ) => {
    const owner = projectsRef.current.find((project) => project.id === ownerId);
    const mission = owner?.missions.find((entry) => entry.id === missionId);
    if (!owner || !mission) return;
    onOpenMission({
      missionId: mission.id,
      projectId: ownerId,
      project: projectName,
      mission: mission.name,
      workspaceId: owner.workspaceId ?? DEFAULT_WORKSPACE_ID,
      droneId: mission.droneId,
      vehicle: mission.vehicle,
      world: mission.world,
      worldType: mission.worldType,
      worldId: mission.worldId,
    });
  };

  const toggleStar = (ownerId: string, missionId: string) => {
    const current = projectsRef.current;
    const target = current
      .find((project) => project.id === ownerId)
      ?.missions.find((mission) => mission.id === missionId);
    if (!target) return;
    const saved = commitProjects(
      current.map((project) =>
        project.id !== ownerId
          ? project
          : {
              ...project,
              missions: project.missions.map((mission) =>
                mission.id === missionId
                  ? { ...mission, starred: !mission.starred }
                  : mission,
              ),
            },
      ),
    );
    if (saved)
      onAnnounce(
        target.starred
          ? `Unstarred ${target.name}.`
          : `Starred ${target.name}.`,
      );
  };

  const submitMissionDlg = (title: string) => {
    if (!missionDlg) return;
    const saved = commitProjects(
      projectsRef.current.map((project) =>
        project.id !== missionDlg.projectId
          ? project
          : {
              ...project,
              missions: project.missions.map((mission) =>
                mission.id === missionDlg.missionId
                  ? { ...mission, name: title }
                  : mission,
              ),
            },
      ),
    );
    if (!saved) return;
    onAnnounce("Mission has been updated");
    setMissionDlg(null);
  };

  const submitProjectDlg = (title: string) => {
    if (projectDlg?.mode === "rename") {
      const saved = commitProjects(
        projectsRef.current.map((project) =>
          project.id === projectDlg.projectId
            ? { ...project, name: title }
            : project,
        ),
      );
      if (!saved) return;
      onAnnounce("Project has been updated");
      setProjectDlg(null);
      return;
    }
    const fresh: LibProject = {
      id: nextId("p"),
      name: title,
      workspaceId: activeWorkspaceId,
      missions: [],
    };
    if (!commitProjects([...projectsRef.current, fresh])) return;
    onAnnounce(`Project ${title} created locally.`);
    setProjectDlg(null);
  };

  const confirmDeleteMission = () => {
    if (!deleteMission) return;
    const saved = commitProjects(
      projectsRef.current.map((project) =>
        project.id !== deleteMission.projectId
          ? project
          : {
              ...project,
              missions: project.missions.filter(
                (mission) => mission.id !== deleteMission.missionId,
              ),
            },
      ),
    );
    if (!saved) return;
    onAnnounce("Mission has been deleted");
    setDeleteMission(null);
  };

  const confirmDeleteProject = () => {
    if (!deleteProject) return;
    if (
      !commitProjects(
        projectsRef.current.filter(
          (project) => project.id !== deleteProject.projectId,
        ),
      )
    )
      return;
    if (projectId === deleteProject.projectId) onNavigate("projects", null);
    onAnnounce("Project has been deleted");
    setDeleteProject(null);
  };

  const cloneMission = (targetProjectId: string) => {
    if (!cloneTarget) return;
    const current = projectsRef.current;
    const source = current
      .flatMap((project) =>
        project.missions.map((mission) => ({ project, mission })),
      )
      .find((entry) => entry.mission.id === cloneTarget.missionId);
    if (!source) {
      setCloneTarget(null);
      return;
    }
    const copyId = nextId("m");
    const copyName = `${source.mission.name} (copy)`;
    const copy: LibMission = {
      ...source.mission,
      id: copyId,
      name: copyName,
      missionData: cloneMissionSnapshotIdentity(
        source.mission.missionData,
        copyId,
        copyName,
      ),
      editedAgo: "Edited just now",
      starred: false,
      shared: false,
    };
    if (
      !commitProjects(
        current.map((project) =>
          project.id === targetProjectId
            ? { ...project, missions: [copy, ...project.missions] }
            : project,
        ),
      )
    )
      return;
    onAnnounce("Mission has been cloned");
    setCloneTarget(null);
  };

  const submitWizard = (result: WizardResult) => {
    const fresh: LibMission = {
      id: nextId("m"),
      name: result.title,
      editedAgo: "Edited just now",
      starred: false,
      shared: false,
      viewOnly: false,
      world: result.world,
      worldType: result.worldType,
      ...(result.worldId ? { worldId: result.worldId } : {}),
      vehicle: result.vehicle,
      droneId: result.droneId,
    };
    const current = projectsRef.current;
    const target = current.find((project) => project.id === result.projectId);
    const next = current.map((project) =>
      project.id === result.projectId
        ? { ...project, missions: [fresh, ...project.missions] }
        : project,
    );
    if (!commitProjects(next)) return;
    setWizardOpen(false);
    onAnnounce(
      `Mission ${result.title} created in ${target?.name ?? "project"} (${result.world}, ${result.vehicle}).`,
    );
    openMission(result.projectId, target?.name ?? "", fresh.id);
  };

  const shareMission = (email: string) => {
    if (!shareDlg) return false;
    const normalizedEmail = email.trim().toLocaleLowerCase();
    const ownerEmail = readAccountProfile().email.toLocaleLowerCase();
    const mission = projectsRef.current
      .find((project) => project.id === shareDlg.projectId)
      ?.missions.find((item) => item.id === shareDlg.missionId);
    const existing = mission?.sharedWith ?? [];
    if (
      !mission ||
      !normalizedEmail ||
      normalizedEmail === ownerEmail ||
      existing.some((item) => item.toLocaleLowerCase() === normalizedEmail)
    )
      return false;

    const sharedWith = [...existing, email.trim()];
    const saved = commitProjects(
      projectsRef.current.map((project) =>
        project.id !== shareDlg.projectId
          ? project
          : {
              ...project,
              missions: project.missions.map((item) =>
                item.id === shareDlg.missionId
                  ? {
                      ...item,
                      shared: true,
                      sharedWith,
                      sharedRoles: {
                        ...item.sharedRoles,
                        [normalizedEmail]: "view-only",
                      },
                    }
                  : item,
              ),
            },
      ),
    );
    if (!saved) return false;
    onAnnounce(`View only access added for ${email.trim()}.`);
    return true;
  };

  const removeSharedAccess = (email: string) => {
    if (!shareDlg) return;
    const saved = commitProjects(
      projectsRef.current.map((project) =>
        project.id !== shareDlg.projectId
          ? project
          : {
              ...project,
              missions: project.missions.map((mission) => {
                if (mission.id !== shareDlg.missionId) return mission;
                const sharedWith = (mission.sharedWith ?? []).filter(
                  (item) =>
                    item.toLocaleLowerCase() !== email.toLocaleLowerCase(),
                );
                const sharedRoles = Object.fromEntries(
                  Object.entries(mission.sharedRoles ?? {}).filter(
                    ([sharedEmail]) =>
                      sharedEmail.toLocaleLowerCase() !==
                      email.toLocaleLowerCase(),
                  ),
                );
                return {
                  ...mission,
                  shared: sharedWith.length > 0,
                  sharedWith,
                  sharedRoles,
                };
              }),
            },
      ),
    );
    if (saved) onAnnounce(`Access removed for ${email}.`);
  };

  const updateSharedRole = (email: string, role: SharedMissionRole) => {
    if (!shareDlg) return false;
    const normalizedEmail = email.trim().toLocaleLowerCase();
    const mission = projectsRef.current
      .find((project) => project.id === shareDlg.projectId)
      ?.missions.find((item) => item.id === shareDlg.missionId);
    if (
      !mission?.sharedWith?.some(
        (item) => item.toLocaleLowerCase() === normalizedEmail,
      )
    )
      return false;

    const saved = commitProjects(
      projectsRef.current.map((project) =>
        project.id !== shareDlg.projectId
          ? project
          : {
              ...project,
              missions: project.missions.map((item) =>
                item.id === shareDlg.missionId
                  ? {
                      ...item,
                      sharedRoles: {
                        ...item.sharedRoles,
                        [normalizedEmail]: role,
                      },
                    }
                  : item,
              ),
            },
      ),
    );
    if (saved) {
      const roleLabel = role === "editor" ? "Editor" : "View only";
      onAnnounce(`Access for ${email} changed to ${roleLabel}.`);
      libraryToastManager.add({
        title: `Access for ${email} changed to ${roleLabel}.`,
      });
    }
    return saved;
  };

  return {
    projects,
    workspaceProjects,
    projectsRef,
    commitProjects,
    homeMissions,
    starredMissions,
    missionDlg,
    setMissionDlg,
    projectDlg,
    setProjectDlg,
    projectDialogReturnFocusRef,
    shareDlg,
    setShareDlg,
    removeSharedAccess,
    updateSharedRole,
    deleteMission,
    setDeleteMission,
    deleteProject,
    setDeleteProject,
    cloneTarget,
    setCloneTarget,
    wizardOpen,
    setWizardOpen,
    wizardKey,
    wizardSeed,
    openCreateWizard,
    openProject,
    openMission,
    toggleStar,
    submitMissionDlg,
    submitProjectDlg,
    confirmDeleteMission,
    confirmDeleteProject,
    cloneMission,
    submitWizard,
    shareMission,
  };
}
