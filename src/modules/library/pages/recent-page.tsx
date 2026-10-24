import { Fragment } from 'react'
import { LibraryEmptyState, LibraryPageHeader } from '../library-presentation'
import type { LibMission } from '../database/store'

type MissionEntry = { projectId: string; project: string; mission: LibMission }

export default function RecentPage({ missions, renderMission }: {
  missions: MissionEntry[]
  renderMission: (entry: MissionEntry, testId: string) => React.ReactNode
}) {
  return (
    <section aria-labelledby='ms-lib-recent-page-title'>
      <LibraryPageHeader titleId='ms-lib-recent-page-title' title='Recent' />
      {missions.length === 0 ? <LibraryEmptyState title='No recent missions' description='Missions in this Workspace will appear here.' /> :
        <div className='ms-lib-grid is-recent' aria-label='Recent missions'>{missions.map((entry) => <Fragment key={entry.mission.id}>{renderMission(entry, `ms-lib-recent-page-${entry.mission.id}`)}</Fragment>)}</div>}
    </section>
  )
}
