import { useMemo, type ReactNode } from "react";
import type { LibMission, LibProject, LibTemplate } from "../database/store";
import type { WorkspaceWorldRecord } from "../database/workspace-resources-store";
import {
  MissionCard,
  RecentMissionCard,
  SharedMissionCard,
  type SharedMission,
} from "./mission-cards.tsx";
import {
  ProjectCard,
  SharedProjectCard,
  TemplateCard,
  type SharedProject,
} from "./library-cards.tsx";
import { type LibraryCardAction } from "./library-presentation.tsx";

interface LibraryCardRenderersOptions {
  username: string;
  worlds: WorkspaceWorldRecord[];
  openMission: (
    projectId: string,
    projectName: string,
    missionId: string,
  ) => void;
  openProject: (projectId: string) => void;
  toggleStar: (projectId: string, missionId: string) => void;
  setMissionDlg: (
    value: {
      mode: "rename";
      projectId: string;
      missionId: string;
      initialName: string;
    } | null,
  ) => void;
  setProjectDlg: (
    value:
      | { mode: "create" }
      | { mode: "rename"; projectId: string; initialName: string }
      | null,
  ) => void;
  setShareDlg: (
    value: { projectId: string; missionId: string; name: string } | null,
  ) => void;
  setDeleteMission: (
    value: { projectId: string; missionId: string; name: string } | null,
  ) => void;
  setDeleteProject: (
    value: { projectId: string; name: string; missionCount: number } | null,
  ) => void;
  setCloneTarget: (value: { missionId: string; name: string } | null) => void;
  onOpenSharedProject: (projectId: string) => void;
}

export function useLibraryCardRenderers({
  username,
  worlds,
  openMission,
  openProject,
  toggleStar,
  setMissionDlg,
  setProjectDlg,
  setShareDlg,
  setDeleteMission,
  setDeleteProject,
  setCloneTarget,
  onOpenSharedProject,
}: LibraryCardRenderersOptions) {
  const worldsById = useMemo(
    () => new Map(worlds.map((world) => [world.id, world])),
    [worlds],
  );
  const worldsByName = useMemo(
    () => new Map(worlds.map((world) => [world.name, world])),
    [worlds],
  );
  const worldAssetForMission = (mission: LibMission) => {
    const world = mission.worldId
      ? worldsById.get(mission.worldId)
      : worldsByName.get(mission.world ?? "");
    return world?.glbAssetId;
  };
  const missionActions = (
    projectId: string,
    projectName: string,
    mission: LibMission,
  ): LibraryCardAction[] => {
    const actions: LibraryCardAction[] = [
      {
        id: "open",
        label: "Open",
        group: "primary",
        onSelect: () => openMission(projectId, projectName, mission.id),
      },
    ];
    if (!mission.viewOnly) {
      actions.push(
        {
          id: "star",
          label: mission.starred ? "Unstar" : "Star",
          group: "common",
          onSelect: () => toggleStar(projectId, mission.id),
        },
        {
          id: "rename",
          label: "Rename",
          group: "common",
          onSelect: () =>
            setMissionDlg({
              mode: "rename",
              projectId,
              missionId: mission.id,
              initialName: mission.name,
            }),
        },
        {
          id: "clone",
          label: "Clone",
          group: "common",
          onSelect: () =>
            setCloneTarget({ missionId: mission.id, name: mission.name }),
        },
        {
          id: "share",
          label: "Share",
          group: "common",
          onSelect: () =>
            setShareDlg({
              projectId,
              missionId: mission.id,
              name: mission.name,
            }),
        },
        {
          id: "delete",
          label: "Delete",
          group: "destructive",
          destructive: true,
          onSelect: () =>
            setDeleteMission({
              projectId,
              missionId: mission.id,
              name: mission.name,
            }),
        },
      );
    }
    return actions;
  };

  const missionCard = (
    projectId: string,
    projectName: string,
    mission: LibMission,
    testId: string,
  ): ReactNode => (
    <MissionCard
      projectName={projectName}
      mission={mission}
      worldAssetId={worldAssetForMission(mission)}
      username={username}
      testId={testId}
      actions={missionActions(projectId, projectName, mission)}
      onToggleStar={
        mission.viewOnly ? undefined : () => toggleStar(projectId, mission.id)
      }
      onOpen={() => openMission(projectId, projectName, mission.id)}
    />
  );

  const projectCard = (project: LibProject): ReactNode => {
    const handleOpen = () => openProject(project.id);
    return (
      <ProjectCard
        project={project}
        onOpen={handleOpen}
        actions={[
          { id: "open", label: "Open", group: "primary", onSelect: handleOpen },
          {
            id: "rename",
            label: "Rename",
            group: "common",
            onSelect: () =>
              setProjectDlg({
                mode: "rename",
                projectId: project.id,
                initialName: project.name,
              }),
          },
          {
            id: "delete",
            label: "Delete",
            group: "destructive",
            destructive: true,
            onSelect: () =>
              setDeleteProject({
                projectId: project.id,
                name: project.name,
                missionCount: project.missions.length,
              }),
          },
        ]}
      />
    );
  };

  const templateCard = (
    template: LibTemplate,
    testId: string,
    onOpen: () => void,
    hideMeta = false,
  ): ReactNode => (
    <TemplateCard
      template={template}
      testId={testId}
      onOpen={onOpen}
      hideMeta={hideMeta}
    />
  );

  const recentCard = (
    projectId: string,
    projectName: string,
    mission: LibMission,
    testId: string,
  ): ReactNode => (
    <RecentMissionCard
      projectName={projectName}
      mission={mission}
      worldAssetId={worldAssetForMission(mission)}
      username={username}
      testId={testId}
      actions={missionActions(projectId, projectName, mission)}
      onToggleStar={
        mission.viewOnly ? undefined : () => toggleStar(projectId, mission.id)
      }
      onOpen={() => openMission(projectId, projectName, mission.id)}
    />
  );

  return {
    missionCard,
    projectCard,
    templateCard,
    recentCard,
    sharedProjectCard: (project: SharedProject) => (
      <SharedProjectCard
        project={project}
        onOpen={() => onOpenSharedProject(project.id)}
      />
    ),
    sharedMissionCard: (mission: SharedMission, ownerName: string) => (
      <SharedMissionCard mission={mission} ownerName={ownerName} />
    ),
  };
}
