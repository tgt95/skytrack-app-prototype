import { memo } from 'react'
import { FloppyDiskIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import type { LibraryEntry } from '../library/library'
import { SkyTooltip } from '../../shared/sky-tooltip'
import skytrackLogo from '../../assets/skytrack-logo.svg'

interface StudioTopbarProps {
  missionName: string
  libraryEntry: LibraryEntry | null
  dirty: boolean
  onBackToLibrary: () => void
  onOpenCrumbProject: () => void
  onOpenEdit: () => void
  onSaveLocal: () => void
}

function StudioTopbar({
  missionName,
  libraryEntry,
  dirty,
  onBackToLibrary,
  onOpenCrumbProject,
  onOpenEdit,
  onSaveLocal
}: StudioTopbarProps) {
  return (
    <header className='ms-top'>
      <nav className='ms-crumb' aria-label='Breadcrumb'>
        <SkyTooltip><button
          type='button'
          className='ms-crumb-btn ms-crumb-home'
          data-testid='ms-crumb-home'
          onClick={onBackToLibrary}
          aria-label='Back to library home'
          title='Back to library home'
        >
          <img src={skytrackLogo} alt='SkyTrack' className='ms-crumb-logo' />
        </button></SkyTooltip>
        <span aria-hidden='true' className='ms-crumb-separator'> / </span>
        {libraryEntry ? (
          <>
            <button
              type='button'
              className='ms-crumb-btn ms-crumb-dim'
              data-testid='ms-crumb-project'
              onClick={onOpenCrumbProject}
              aria-label={`Open project ${libraryEntry.project} with its missions`}
              title={`Open project ${libraryEntry.project} with its missions`}
            >
              {libraryEntry.project}
            </button>
            <span aria-hidden='true' className='ms-crumb-separator'> / </span>
            <span className='ms-crumb-name'>{libraryEntry.mission}</span>
          </>
        ) : (
          <>
            <span className='ms-crumb-dim'>Missions</span>
            <span aria-hidden='true' className='ms-crumb-separator'> / </span>
            <span className='ms-crumb-name'>{missionName}</span>
          </>
        )}
      </nav>
      <div className='ms-top-actions'>
        <Button size='sm' variant='outline' onClick={onOpenEdit}>
          <PencilSimpleIcon aria-hidden='true' /> Edit Mission
        </Button>
        <Button size='sm' variant='ghost' onClick={onSaveLocal} disabled={!dirty} aria-label='Save local state (Ctrl+S)'>
          <FloppyDiskIcon aria-hidden='true' /> Save
        </Button>
      </div>
    </header>
  )
}

export default memo(StudioTopbar)
