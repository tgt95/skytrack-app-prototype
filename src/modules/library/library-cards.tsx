import { CubeIcon, FolderIcon, GlobeHemisphereWestIcon, SquaresFourIcon } from '@phosphor-icons/react'
import { Badge } from 'skytrack-ui/badge'
import { Tooltip, TooltipArrow, TooltipPopup, TooltipPortal, TooltipPositioner, TooltipProvider, TooltipTrigger } from 'skytrack-ui/tooltip'
import { LibraryCardFrame, type LibraryCardAction } from './library-presentation'
import MissionThumbnail from './mission-thumbnail'
import { getTemplateThumbnail } from './template-thumbnails'
import type { LibMission, LibProject, LibTemplate } from './database/store'
import { SHARED_PROJECTS } from './workspace-data'

export function MissionContext({ mission }: { mission: Pick<LibMission, 'worldType' | 'world'> }) {
  const worldType = mission.worldType ?? '3D'
  const worldName = mission.world ?? 'Blank space'
  const ModeIcon = worldType === '2D' ? SquaresFourIcon : CubeIcon
  return (
    <span className='ms-lib-context-row'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className='inline-flex' tabIndex={0} role='img' aria-label={`${worldType} mode`} />}>
            <Badge count={<ModeIcon aria-hidden='true' className='size-3.5' />} status='outline' size='sm' aria-hidden='true' />
          </TooltipTrigger>
          <TooltipPortal><TooltipPositioner side='left' sideOffset={6}><TooltipPopup><TooltipArrow />{worldType} mode</TooltipPopup></TooltipPositioner></TooltipPortal>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<span className='inline-flex' tabIndex={0} role='img' aria-label={`World: ${worldName}`} />}>
            <Badge count={<GlobeHemisphereWestIcon aria-hidden='true' className='size-3.5' />} status='outline' size='sm' className='text-muted-foreground' aria-hidden='true' />
          </TooltipTrigger>
          <TooltipPortal><TooltipPositioner side='left' sideOffset={6}><TooltipPopup><TooltipArrow />World: {worldName}</TooltipPopup></TooltipPositioner></TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    </span>
  )
}

export function MissionCard({
  mission, current, testId, actions, onToggleStar, onOpen, onOpenSharedAccounts
}: {
  projectName: string
  mission: LibMission
  current: boolean
  testId: string
  actions: LibraryCardAction[]
  onToggleStar?: () => void
  onOpen: () => void
  onOpenSharedAccounts: (missionId: string) => void
}) {
  return (
    <LibraryCardFrame key={mission.id} label={mission.name} className={current ? 'is-current' : undefined} testId={testId} actions={actions} starred={mission.starred} onToggleStar={onToggleStar} onOpen={onOpen}>
      <button type='button' className='ms-lib-thumb is-mission' data-testid={`${testId}-open`} aria-label={`Open ${mission.name}`} onClick={onOpen}><MissionThumbnail /></button>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-toprow'><span className='ms-lib-card-title'>{mission.name} {current ? <span className='ms-lib-current'>· Current</span> : null}</span></span>
        {mission.viewOnly ? <span className='ms-lib-card-badgerow'><Badge count='View only' /></span> : null}
        <MissionContext mission={mission} />
        <span className='ms-lib-card-edited'>{mission.editedAgo}</span>
        {mission.shared && !mission.viewOnly ? <button type='button' className='ms-lib-link' onClick={() => onOpenSharedAccounts(mission.id)}>View shared accounts</button> : null}
      </span>
    </LibraryCardFrame>
  )
}

export function ProjectCard({ project, actions, onOpen }: { project: LibProject; actions: LibraryCardAction[]; onOpen: () => void }) {
  return (
    <LibraryCardFrame key={project.id} label={project.name} testId={`ms-lib-project-${project.id}`} actions={actions} onOpen={onOpen}>
      <button type='button' className='ms-lib-thumb is-project' data-testid={`ms-lib-project-${project.id}-open`} aria-label={`Open ${project.name}`} onClick={onOpen}><FolderIcon aria-hidden='true' /></button>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-toprow'><span className='ms-lib-card-title'>{project.name}</span></span>
        <span className='ms-lib-card-edited'>{project.missions.length} mission{project.missions.length === 1 ? '' : 's'}</span>
      </span>
    </LibraryCardFrame>
  )
}

export function TemplateCard({ template, testId, onOpen, hideMeta = false }: { template: LibTemplate; testId: string; onOpen: () => void; hideMeta?: boolean }) {
  const tint = `tint-${template.id.charCodeAt(1) % 6}`
  const thumbnail = getTemplateThumbnail(template.id)
  return (
    <LibraryCardFrame key={template.id} label={template.title} testId={testId} actions={[{ id: 'open', label: 'Open', group: 'primary', onSelect: onOpen }]} onOpen={onOpen}>
      <button type='button' className={`ms-lib-thumb is-template is-photo ${tint}`} data-testid={`${testId}-open`} aria-label={`Open ${template.title}`} onClick={onOpen}>
        {thumbnail ? <img src={thumbnail} alt='' aria-hidden='true' className='ms-template-thumbnail' /> : <span className='ms-lib-thumb-art' aria-hidden='true' />}
      </button>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-title'>{template.title}</span>
        <span className='ms-lib-card-desc'>{template.desc}</span>
        {hideMeta ? null : <span className='ms-lib-card-edited'>{template.byline}</span>}
      </span>
    </LibraryCardFrame>
  )
}

export function RecentMissionCard({ projectName, mission, current, testId, actions, onToggleStar, onOpen }: {
  projectName: string
  mission: LibMission
  current: boolean
  testId: string
  actions: LibraryCardAction[]
  onToggleStar?: () => void
  onOpen: () => void
}) {
  return (
    <LibraryCardFrame key={mission.id} label={`${projectName} | ${mission.name}`} className={current ? 'is-current' : undefined} testId={testId} actions={actions} starred={mission.starred} onToggleStar={onToggleStar} onOpen={onOpen}>
      <button type='button' className='ms-lib-thumb is-drone' data-testid={`${testId}-open`} aria-label={`Open ${mission.name}`} onClick={onOpen}><MissionThumbnail /></button>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-title'>{projectName} | {mission.name} {current ? <span className='ms-lib-current'>· Current</span> : null}</span>
        <span className='ms-lib-card-meta'><MissionContext mission={mission} /></span>
        <span className='ms-lib-card-edited'>{mission.editedAgo}</span>
      </span>
    </LibraryCardFrame>
  )
}

export type SharedProject = (typeof SHARED_PROJECTS)[number]
export type SharedMission = SharedProject['missions'][number]

export function SharedProjectCard({ project, onOpen }: { project: SharedProject; onOpen: () => void }) {
  return (
    <LibraryCardFrame key={project.id} label={project.name} testId={`ms-lib-shared-project-${project.id}`} actions={[{ id: 'open', label: 'Open', group: 'primary', onSelect: onOpen }]} onOpen={onOpen}>
      <button type='button' className='ms-lib-thumb is-project' data-testid={`ms-lib-shared-project-${project.id}-open`} aria-label={`Open shared project ${project.name}`} onClick={onOpen}><FolderIcon aria-hidden='true' /></button>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-toprow'><span className='ms-lib-card-title'>{project.name}</span><Badge count='View only' /></span>
        <span className='ms-lib-shared-owner'><span className='ms-lib-avatar' aria-hidden='true'>{project.ownerInitials}</span><span>{project.owner} · {project.workspace}</span></span>
        <span className='ms-lib-card-edited'>{project.missions.length} mission{project.missions.length === 1 ? '' : 's'} · {project.sharedAgo}</span>
        <span className='ms-lib-shared-context'>{project.missions.map((mission) => `${mission.worldType} · ${mission.world}`).join(' / ')}</span>
      </span>
    </LibraryCardFrame>
  )
}

export function SharedMissionCard({ mission }: { mission: SharedMission }) {
  return (
    <article key={mission.id} className='ms-lib-card is-readonly' aria-label={mission.name}>
      <span className='ms-lib-thumb is-mission' aria-hidden='true'><MissionThumbnail /></span>
      <span className='ms-lib-card-body'>
        <span className='ms-lib-card-toprow'><span className='ms-lib-card-title'>{mission.name}</span><Badge count='View only' /></span>
        <MissionContext mission={mission} />
        <span className='ms-lib-card-edited'>{mission.editedAgo}</span>
      </span>
    </article>
  )
}
