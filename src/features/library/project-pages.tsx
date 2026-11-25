import { Fragment, type ReactNode } from 'react'
import {
  FolderOpenIcon,
  DotsThreeVerticalIcon,
  PlusIcon
} from '@phosphor-icons/react'
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle
} from 'skytrack-ui/empty'
import { Button } from 'skytrack-ui/button'
import { PageHeader } from 'skytrack-ui/page-header'
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuTrigger
} from 'skytrack-ui/menu'
import { SkyTooltip } from '@/ui/components/sky-tooltip'
import { LibraryPageLayout } from './cards/library-presentation.tsx'
import type { LibMission, LibProject } from './database/store'

export function ProjectsPage ({
  workspaceName,
  projects,
  renderProjectCard,
  onCreateProject
}: {
  workspaceName: string
  projects: LibProject[]
  renderProjectCard: (project: LibProject) => ReactNode
  onCreateProject: () => void
}) {
  return (
    <LibraryPageLayout
      titleId='ms-lib-projects-title'
      header={
        <PageHeader
          className='sticky top-0 z-20 ms-lib-page-header flex flex-col gap-2 px-6 pb-4 pt-5'
          data-testid='ms-lib-page-header-row'
          title={
            <span
              id='ms-lib-projects-title'
              data-testid='ms-lib-page-header-copy'
            >
              Projects
            </span>
          }
          toolbar={
            <div
              className='inline-flex items-center justify-end gap-2 shrink-0'
              data-testid='ms-lib-page-header-actions'
            >
              <Button
                size='default'
                variant='default'
                onClick={onCreateProject}
              >
                <PlusIcon aria-hidden='true' /> New Project
              </Button>
            </div>
          }
        />
      }
    >
      <div
        className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
        aria-label={`${workspaceName} Projects`}
      >
        {projects.map(project => (
          <Fragment key={project.id}>{renderProjectCard(project)}</Fragment>
        ))}
      </div>
    </LibraryPageLayout>
  )
}

export function ProjectDetailPage ({
  project,
  onCreateMission,
  onRenameProject,
  onDeleteProject,
  renderMissionCard
}: {
  project: LibProject
  onCreateMission: (projectId: string) => void
  onRenameProject: (project: LibProject) => void
  onDeleteProject: (project: LibProject) => void
  renderMissionCard: (
    projectId: string,
    projectName: string,
    mission: LibMission,
    key: string
  ) => ReactNode
}) {
  return (
    <LibraryPageLayout
      titleId='ms-lib-project-title'
      header={
        <PageHeader
          className='sticky top-0 z-20 ms-lib-page-header flex flex-col gap-2 px-6 pb-4 pt-5'
          data-testid='ms-lib-page-header-row'
          title={
            <span
              id='ms-lib-project-title'
              data-testid='ms-lib-page-header-copy'
            >
              {project.name}
            </span>
          }
          toolbar={
            <div
              className='inline-flex items-center justify-end gap-2 shrink-0'
              data-testid='ms-lib-page-header-actions'
            >
              <span
                className=' inline-flex items-center gap-1.5 flex-[0_0_auto]'
                data-testid='ms-lib-row-actions'
              >
                <Button
                  data-testid='ms-lib-new-mission'
                  onClick={() => onCreateMission(project.id)}
                >
                  <PlusIcon aria-hidden='true' /> New Mission
                </Button>
                <Menu>
                  <SkyTooltip>
                    <MenuTrigger
                      aria-label={`More actions for ${project.name}`}
                      render={<Button variant='outline' size='icon' />}
                    >
                      <DotsThreeVerticalIcon aria-hidden='true' />
                    </MenuTrigger>
                  </SkyTooltip>
                  <MenuPortal>
                    <MenuPositioner side='bottom' align='end' sideOffset={4}>
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
            </div>
          }
        />
      }
    >
      {project.missions.length === 0 ? (
        <Empty>
          <EmptyMedia icon={FolderOpenIcon} />
          <EmptyTitle aria-label='Create mission' role='heading' aria-level={2}>
            No data yet
          </EmptyTitle>
          <EmptyDescription>All missions will appear here.</EmptyDescription>
          <Button onClick={() => onCreateMission(project.id)}>
            <PlusIcon aria-hidden='true' /> New Mission
          </Button>
        </Empty>
      ) : (
        <div
          className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5'
          aria-label='Missions in this project'
        >
          {project.missions.map(mission => (
            <Fragment key={mission.id}>
              {renderMissionCard(
                project.id,
                project.name,
                mission,
                `ms-lib-mission-${project.id}-${mission.id}`
              )}
            </Fragment>
          ))}
        </div>
      )}
    </LibraryPageLayout>
  )
}
