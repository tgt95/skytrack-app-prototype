import type { Dispatch, SetStateAction } from 'react'
import { Button } from 'skytrack-ui/button'
import type { StudioMission } from '../../domain/mission-model'
import { DraftAxisInput } from './design-controls'
import type { PendingMissionPoint } from '../studio/use-drawing-session'

interface RouteDraftPanelProps {
  mission: StudioMission
  pending: PendingMissionPoint[]
  routeDraftZ: number
  setPending: Dispatch<SetStateAction<PendingMissionPoint[]>>
  onCancel: () => void
  onCommit: () => void
}

export default function RouteDraftPanel({
  mission,
  pending,
  routeDraftZ,
  setPending,
  onCancel,
  onCommit
}: RouteDraftPanelProps) {
  return (
    <section className='ms-route-draft' aria-label='Route draft'>
      <header className='ms-route-draft-head'>
        <div>
          <h2 className='ms-inspector-title'>Route draft</h2>
          <p className='ms-inspector-sub'>Click the scene to add waypoints. Add at least 2, then press Enter to commit. Press Escape to cancel.</p>
        </div>
      </header>
      <p className='ms-route-draft-count' role='status' aria-live='polite'>
        {pending.length < 2
          ? `${pending.length} of 2 minimum waypoints. Add ${2 - pending.length} more to commit.`
          : `${pending.length} waypoints ready to commit.`}
      </p>
      {pending.length > 0 ? (
        <ol className='ms-route-draft-list' aria-label='Pending route waypoints'>
          {pending.map((point, index) => {
            const pointZ = point.z ?? routeDraftZ
            const sequence = mission.waypoints.length + index + 1
            const updatePoint = (change: Partial<PendingMissionPoint>) => {
              setPending((previous) => previous.map((item, itemIndex) => itemIndex === index
                ? { ...item, ...change }
                : item))
            }
            return (
              <li className='ms-route-draft-row' key={`route-draft-${sequence}`}>
                <span className='ms-route-draft-seq'>{sequence}</span>
                <span className='ms-route-draft-coords'>
                  <DraftAxisInput
                    label={`Pending waypoint ${sequence} X`}
                    axis='X'
                    value={point.x}
                    min={-2000}
                    max={2000}
                    precision={0.1}
                    onChange={(x) => updatePoint({ x })}
                  />
                  <DraftAxisInput
                    label={`Pending waypoint ${sequence} Y`}
                    axis='Y'
                    value={point.y}
                    min={-2000}
                    max={2000}
                    precision={0.1}
                    onChange={(y) => updatePoint({ y })}
                  />
                  <DraftAxisInput
                    label={`Pending waypoint ${sequence} altitude`}
                    axis='Z'
                    value={pointZ}
                    min={0}
                    max={Number.POSITIVE_INFINITY}
                    precision={0.01}
                    onChange={(z) => updatePoint({ z })}
                  />
                </span>
              </li>
            )
          })}
        </ol>
      ) : null}
      <div className='ms-route-draft-actions'>
        <Button size='sm' variant='outline' onClick={onCancel}>Cancel</Button>
        <Button size='sm' variant='default' onClick={() => onCommit()} disabled={pending.length < 2}>Commit route</Button>
      </div>
    </section>
  )
}
