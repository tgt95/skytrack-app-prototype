import { Fragment, type ReactNode } from "react";
import { DotsThreeVerticalIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "skytrack-ui/breadcrumb";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuTrigger,
} from "skytrack-ui/menu";
import { SkyTooltip } from "../../ui/components/sky-tooltip";
import { LibraryPageHeader, LibraryPageLayout } from "./cards/library-presentation.tsx";
import type { LibMission, LibProject } from "./database/store";

export function ProjectsPage({
  workspaceName,
  projects,
  renderProjectCard,
  onCreateProject,
}: {
  workspaceName: string;
  projects: LibProject[];
  renderProjectCard: (project: LibProject) => ReactNode;
  onCreateProject: () => void;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-projects-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-projects-title"
          title="Projects"
          actions={
            <Button size="default" variant="default" onClick={onCreateProject}>
              <PlusIcon aria-hidden="true" /> New Project
            </Button>
          }
        />
      }
    >
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
        aria-label={`${workspaceName} Projects`}
      >
        {projects.map((project) => (
          <Fragment key={project.id}>{renderProjectCard(project)}</Fragment>
        ))}
      </div>
    </LibraryPageLayout>
  );
}

export function ProjectDetailPage({
  project,
  onNavigateProjects,
  onCreateMission,
  onRenameProject,
  onDeleteProject,
  renderMissionCard,
}: {
  project: LibProject;
  onNavigateProjects: () => void;
  onCreateMission: (projectId: string) => void;
  onRenameProject: (project: LibProject) => void;
  onDeleteProject: (project: LibProject) => void;
  renderMissionCard: (
    projectId: string,
    projectName: string,
    mission: LibMission,
    key: string,
  ) => ReactNode;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-project-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-project-title"
          title={project.name}
          context={
            <Breadcrumb
              className="mb-0 text-[0.8125rem] text-(--muted-foreground)"
              aria-label="Breadcrumb"
            >
              <BreadcrumbList className="m-0 list-none gap-2 p-0 text-inherit">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={<button type="button" />}
                    className="rounded-(--radius) p-0.5 text-inherit hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1"
                    data-testid="ms-lib-project-breadcrumb-link"
                    onClick={onNavigateProjects}
                  >
                    Projects
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{project.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
          actions={
            <span
              className=" inline-flex items-center gap-1.5 flex-[0_0_auto]"
              data-testid="ms-lib-row-actions"
            >
              <Button
                size="default"
                variant="default"
                data-testid="ms-lib-new-mission"
                onClick={() => onCreateMission(project.id)}
              >
                <PlusIcon aria-hidden="true" /> New Mission
              </Button>
              <Menu>
                <SkyTooltip>
                  <MenuTrigger
                    aria-label={`More actions for ${project.name}`}
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                      />
                    }
                  >
                    <DotsThreeVerticalIcon aria-hidden="true" />
                  </MenuTrigger>
                </SkyTooltip>
                <MenuPortal>
                  <MenuPositioner side="bottom" align="end" sideOffset={4}>
                    <MenuPopup aria-label={`Actions for ${project.name}`}>
                      <MenuItem onClick={() => onRenameProject(project)}>
                        Rename
                      </MenuItem>
                      <MenuItem onClick={() => onDeleteProject(project)}>
                        Delete
                      </MenuItem>
                    </MenuPopup>
                  </MenuPositioner>
                </MenuPortal>
              </Menu>
            </span>
          }
        />
      }
    >
      {project.missions.length === 0 ? (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
          aria-label="Create mission"
        >
          <button
            type="button"
            className=" inline-flex flex-col items-center justify-center gap-2 min-h-51.5 w-full p-4 border-[1.5px] border-dashed border-border rounded-(--radius) bg-transparent text-(--primary) text-[0.8125rem] font-semibold cursor-pointer hover:border-(--primary) hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1"
            onClick={() => onCreateMission(project.id)}
            data-testid="ms-lib-newitem"
          >
            <PlusIcon aria-hidden="true" className="w-5 h-5" />
            New Mission
          </button>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
          aria-label="Missions in this project"
        >
          {project.missions.map((mission) => (
            <Fragment key={mission.id}>
              {renderMissionCard(
                project.id,
                project.name,
                mission,
                `ms-lib-mission-${project.id}-${mission.id}`,
              )}
            </Fragment>
          ))}
        </div>
      )}
    </LibraryPageLayout>
  );
}
