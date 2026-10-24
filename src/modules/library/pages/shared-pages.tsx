import { Fragment } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Badge } from 'skytrack-ui/badge'
import { LibraryPageHeader } from '../library-presentation'
import type { SharedMission, SharedProject } from '../library-cards'

export function SharedAccountsPage({ missionName, projectName, onBack }: { missionName: string; projectName: string; onBack: () => void }) {
  return (
    <section aria-labelledby='ms-lib-shared-title'>
      <LibraryPageHeader titleId='ms-lib-shared-title' title='Shared accounts' description={<p className='ms-lib-sub'>{missionName} · {projectName}</p>} context={<button type='button' className='ms-lib-back' onClick={onBack}><ArrowLeftIcon aria-hidden='true' /> Back</button>} />
      <ul className='ms-lib-sharelist'><li className='ms-lib-share-row'><span className='ms-lib-avatar' aria-hidden='true'>GT</span><span><span className='ms-lib-card-title'>Gia Tuấn Trinh&apos;s … (you)</span><span className='ms-lib-card-edited'>Owner · mock — sharing needs backend auth</span></span></li></ul>
    </section>
  )
}

export function SharedProjectPage({ project, renderMission, onBack }: { project: SharedProject; renderMission: (mission: SharedMission) => React.ReactNode; onBack: () => void }) {
  return (
    <section aria-labelledby='ms-lib-shared-project-title'>
      <LibraryPageHeader titleId='ms-lib-shared-project-title' title={project.name} description={<p className='ms-lib-sub'>Owned by {project.owner} · {project.workspace} · {project.sharedAgo}</p>} context={<button type='button' className='ms-lib-back' onClick={onBack}><ArrowLeftIcon aria-hidden='true' /> Shared with me</button>} actions={<Badge count='View only' />} />
      <div className='ms-lib-grid' aria-label={`Missions in ${project.name}`}>{project.missions.map((mission) => <Fragment key={mission.id}>{renderMission(mission)}</Fragment>)}</div>
    </section>
  )
}

export function SharedWithMePage({ projects, renderProject }: { projects: SharedProject[]; renderProject: (project: SharedProject) => React.ReactNode }) {
  return (
    <section aria-labelledby='ms-lib-sharedme-title'>
      <LibraryPageHeader titleId='ms-lib-sharedme-title' title='Shared with me' description={<p className='ms-lib-sub'>Projects shared by people in other Workspaces.</p>} />
      <div className='ms-lib-grid' aria-label='Projects shared with me'>{projects.map((project) => <Fragment key={project.id}>{renderProject(project)}</Fragment>)}</div>
    </section>
  )
}
