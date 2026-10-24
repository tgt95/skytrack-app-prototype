import { Fragment } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { LibraryPageHeader } from '../library-presentation'
import type { LibMission, LibTemplate } from '../database/store'

type MissionEntry = { projectId: string; project: string; mission: LibMission }

export function HomePage({ missions, templates, renderRecent, renderTemplate, onViewAll, onOpenTemplate }: {
  missions: MissionEntry[]
  templates: LibTemplate[]
  renderRecent: (entry: MissionEntry, testId: string) => React.ReactNode
  renderTemplate: (template: LibTemplate, testId: string, onOpen: () => void, hideMeta: boolean) => React.ReactNode
  onViewAll: () => void
  onOpenTemplate: (id: string) => void
}) {
  return (
    <section aria-labelledby='ms-lib-home-title'>
      <LibraryPageHeader titleId='ms-lib-home-title' variant='plain' title='Welcome to SkyTrack' />
      <section aria-labelledby='ms-lib-recent-title' className='mb-8'>
        <div className='ms-section-header'><h2 id='ms-lib-recent-title'>Recent missions</h2></div>
        <div className='ms-lib-grid is-recent' role='list' aria-label='Recent missions'>
          {missions.slice(0, 5).map((entry) => <Fragment key={entry.mission.id}>{renderRecent(entry, `ms-lib-recent-${entry.mission.id}`)}</Fragment>)}
        </div>
      </section>
      <section aria-labelledby='ms-lib-templates-title'>
        <div className='ms-section-header'>
          <h2 id='ms-lib-templates-title'>Mission templates</h2>
          <button type='button' className='ms-lib-viewall' data-testid='ms-lib-view-all' onClick={onViewAll}>View all <CaretRightIcon aria-hidden='true' /></button>
        </div>
        <div className='ms-lib-grid is-templates' role='list' aria-label='Mission templates preview'>
          {templates.slice(0, 6).map((template) => <Fragment key={template.id}>{renderTemplate(template, `ms-lib-template-${template.id}`, () => onOpenTemplate(template.id), true)}</Fragment>)}
        </div>
      </section>
    </section>
  )
}
