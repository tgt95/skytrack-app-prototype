import { Fragment, type ReactNode } from 'react'
import { DotsThreeVerticalIcon, PlusIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuTrigger
} from 'skytrack-ui/menu'
import { SkyTooltip } from '../../shared/sky-tooltip'
import { LibraryPageHeader } from './library-presentation'
import type { LibMission, LibProject } from './database/store'

export function ProjectsPage({
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
    <section aria-labelledby='ms-lib-projects-title'>
      <LibraryPageHeader
        titleId='ms-lib-projects-title'
        title='Projects'
        actions={<Button size='sm' variant='default' onClick={onCreateProject}><PlusIcon aria-hidden='true' /> New Project</Button>}
      />
      <div className='ms-lib-grid' aria-label={`${workspaceName} Projects`}>
        {projects.map((project) => <Fragment key={project.id}>{renderProjectCard(project)}</Fragment>)}
      </div>
    </section>
  )
}

export function ProjectDetailPage({
  project,
  onNavigateProjects,
  onCreateMission,
  onRenameProject,
  onDeleteProject,
  renderMissionCard
}: {
  project: LibProject
  onNavigateProjects: () => void
  onCreateMission: (projectId: string) => void
  onRenameProject: (project: LibProject) => void
  onDeleteProject: (project: LibProject) => void
  renderMissionCard: (projectId: string, projectName: string, mission: LibMission, key: string) => ReactNode
}) {
  return (
    <section aria-labelledby='ms-lib-project-title'>
      <LibraryPageHeader
        titleId='ms-lib-project-title'
        title={project.name}
        context={(
          <nav className='ms-lib-crumb' aria-label='Breadcrumb'>
            <button type='button' className='ms-lib-crumb-link' onClick={onNavigateProjects}>Projects</button>
            <span aria-hidden='true'>›</span>
            <span aria-current='page'>{project.name}</span>
          </nav>
        )}
        actions={(
          <span className='ms-lib-row-actions'>
            <Button
              size='sm'
              variant='default'
              data-testid='ms-lib-new-mission'
              onClick={() => onCreateMission(project.id)}
            >
              <PlusIcon aria-hidden='true' /> New Mission
            </Button>
            <Menu>
              <SkyTooltip>
                <MenuTrigger aria-label={`More actions for ${project.name}`} render={<Button variant='outline' size='icon-sm' className='text-muted-foreground' />}>
                  <DotsThreeVerticalIcon aria-hidden='true' />
                </MenuTrigger>
              </SkyTooltip>
              <MenuPortal>
                <MenuPositioner side='bottom' align='end' sideOffset={4}>
                  <MenuPopup aria-label={`Actions for ${project.name}`}>
                    <MenuItem onClick={() => onRenameProject(project)}>Rename</MenuItem>
                    <MenuItem onClick={() => onDeleteProject(project)}>Delete</MenuItem>
                  </MenuPopup>
                </MenuPositioner>
              </MenuPortal>
            </Menu>
          </span>
        )}
      />
      {project.missions.length === 0 ? (
        <div className='ms-lib-grid'>
          <button type='button' className='ms-lib-newitem' onClick={() => onCreateMission(project.id)}>
            <PlusIcon aria-hidden='true' />
            New Mission
          </button>
        </div>
      ) : (
        <div className='ms-lib-grid' aria-label='Missions in this project'>
          {project.missions.map((mission) => <Fragment key={mission.id}>{renderMissionCard(
            project.id,
            project.name,
            mission,
            `ms-lib-mission-${project.id}-${mission.id}`
          )}</Fragment>)}
        </div>
      )}
    </section>
  )
}
