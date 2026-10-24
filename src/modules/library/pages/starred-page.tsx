import { Fragment } from 'react'
import { LibraryEmptyState, LibraryPageHeader } from '../library-presentation'
import type { LibMission } from '../database/store'

type MissionEntry = { projectId: string; project: string; mission: LibMission }

export default function StarredPage({ missions, renderMission }: {
  missions: MissionEntry[]
  renderMission: (entry: MissionEntry, testId: string) => React.ReactNode
}) {
  return (
    <section aria-labelledby='ms-lib-starred-title'>
      <LibraryPageHeader titleId='ms-lib-starred-title' title='Starred missions' />
      {missions.length === 0 ? <LibraryEmptyState title='No starred missions yet' description='Star a mission from a project to keep it close at hand.' /> :
        <div className='ms-lib-grid' aria-label='Starred missions'>{missions.map((entry) => <Fragment key={entry.mission.id}>{renderMission(entry, `ms-lib-starred-${entry.mission.id}`)}</Fragment>)}</div>}
    </section>
  )
}
