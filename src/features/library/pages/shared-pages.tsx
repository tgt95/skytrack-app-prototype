import { Fragment } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { PageHeader } from "skytrack-ui/page-header";
import { LibraryPageLayout } from "@/features/library/cards/library-presentation.tsx";
import type { SharedMission, SharedProject } from "@/features/library/library-cards";

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
        <div
          className="sticky top-0 z-20 border-b border-border bg-card"
          data-testid="ms-lib-page-header-row"
        >
          <div className="min-w-0 bg-card px-6 pt-5" data-testid="ms-lib-page-header-context">
            <button type="button" className="ms-lib-back inline-flex items-center gap-1.5 mb-0 py-1 px-0 [border:0] bg-transparent text-(--muted-foreground) text-[0.8125rem] cursor-pointer hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--sidebar-ring) focus-visible:outline-offset-1" onClick={onBack}>
              <ArrowLeftIcon aria-hidden="true" /> Back
            </button>
          </div>
          <PageHeader
            className="ms-lib-page-header flex flex-col gap-2 px-6 pb-0 pt-0 border-b-0"
            title={
              <span id="ms-lib-shared-title" data-testid="ms-lib-page-header-copy">
                Shared accounts
              </span>
            }
          />
          <div className="px-6 pb-4" data-testid="ms-lib-page-header-description">
            <p className="ms-lib-sub mt-1 mx-0 mb-0 text-sm text-(--muted-foreground)">
              {missionName} · {projectName}
            </p>
          </div>
        </div>
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
        <div
          className="sticky top-0 z-20 border-b border-border bg-card"
          data-testid="ms-lib-page-header-row"
        >
          <div className="min-w-0 bg-card px-6 pt-5" data-testid="ms-lib-page-header-context">
            <button type="button" className="ms-lib-back inline-flex items-center gap-1.5 mb-0 py-1 px-0 [border:0] bg-transparent text-(--muted-foreground) text-[0.8125rem] cursor-pointer hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--sidebar-ring) focus-visible:outline-offset-1" onClick={onBack}>
              <ArrowLeftIcon aria-hidden="true" /> Shared with me
            </button>
          </div>
          <PageHeader
            className="ms-lib-page-header flex flex-col gap-2 px-6 pb-0 pt-0 border-b-0"
            title={
              <span id="ms-lib-shared-project-title" data-testid="ms-lib-page-header-copy">
                {project.name}
              </span>
            }
            toolbar={
              <div className="inline-flex items-center justify-end gap-2 shrink-0" data-testid="ms-lib-page-header-actions">
                <Badge className="rounded-(--radius)" count="View only" />
              </div>
            }
          />
          <div className="px-6 pb-4" data-testid="ms-lib-page-header-description">
            <p className="ms-lib-sub mt-1 mx-0 mb-0 text-sm text-(--muted-foreground)">
              Owned by {project.owner} · {project.workspace} · {project.sharedAgo}
            </p>
          </div>
        </div>
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
        <PageHeader
          className="sticky top-0 z-20 ms-lib-page-header flex flex-col gap-2 px-6 pb-4 pt-5"
          data-testid="ms-lib-page-header-row"
          title={
            <span id="ms-lib-sharedme-title" data-testid="ms-lib-page-header-copy">
              Shared with me
            </span>
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
