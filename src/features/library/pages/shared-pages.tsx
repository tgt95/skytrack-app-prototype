import { Fragment } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { LibraryPageHeader, LibraryPageLayout } from "../cards/library-presentation.tsx";
import type { SharedMission, SharedProject } from "../library-cards";

export function SharedAccountsPage({
  missionName,
  projectName,
  onBack,
}: {
  missionName: string;
  projectName: string;
  onBack: () => void;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-shared-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-shared-title"
          title="Shared accounts"
          description={
            <p className="ms-lib-sub mt-0">
              {missionName} · {projectName}
            </p>
          }
          context={
            <button type="button" className="ms-lib-back" onClick={onBack}>
              <ArrowLeftIcon aria-hidden="true" /> Back
            </button>
          }
        />
      }
    >
      <ul
        className=" [list-style:none] m-0 p-0 flex flex-col gap-2 max-w-130"
        data-testid="ms-lib-sharelist"
      >
        <li
          className=" flex items-center gap-2.5 border border-border rounded-(--radius) bg-(--card) py-2.5 px-3"
          data-testid="ms-lib-share-row"
        >
          <span
            className="flex-[0_0_auto] inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-(--accent) text-(--primary) text-[0.6875rem] font-bold"
            aria-hidden="true"
          >
            GT
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium leading-[1.4]">
              Gia Tuấn Trinh&apos;s … (you)
            </span>
            <span className="text-sm text-muted-foreground">
              Workspace owner
            </span>
          </span>
        </li>
      </ul>
    </LibraryPageLayout>
  );
}

export function SharedProjectPage({
  project,
  renderMission,
  onBack,
}: {
  project: SharedProject;
  renderMission: (mission: SharedMission, ownerName: string) => React.ReactNode;
  onBack: () => void;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-shared-project-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-shared-project-title"
          title={project.name}
          description={
            <p className="ms-lib-sub mt-0">
              Owned by {project.owner} · {project.workspace} ·{" "}
              {project.sharedAgo}
            </p>
          }
          context={
            <button type="button" className="ms-lib-back" onClick={onBack}>
              <ArrowLeftIcon aria-hidden="true" /> Shared with me
            </button>
          }
          actions={<Badge count="View only" />}
        />
      }
    >
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
        aria-label={`Missions in ${project.name}`}
      >
        {project.missions.map((mission) => (
          <Fragment key={mission.id}>
            {renderMission(mission, project.owner)}
          </Fragment>
        ))}
      </div>
    </LibraryPageLayout>
  );
}

export function SharedWithMePage({
  projects,
  renderProject,
}: {
  projects: SharedProject[];
  renderProject: (project: SharedProject) => React.ReactNode;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-sharedme-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-sharedme-title"
          title="Shared with me"
          description={
            <p className="ms-lib-sub mt-0">
              Projects shared by people in other Workspaces.
            </p>
          }
        />
      }
    >
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
        aria-label="Projects shared with me"
      >
        {projects.map((project) => (
          <Fragment key={project.id}>{renderProject(project)}</Fragment>
        ))}
      </div>
    </LibraryPageLayout>
  );
}
