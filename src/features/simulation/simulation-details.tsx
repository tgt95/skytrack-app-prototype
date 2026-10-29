import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger
} from 'skytrack-ui/accordion'
import {
  Progress,
  ProgressIndicator,
  ProgressTrack
} from 'skytrack-ui/progress'
import type { StudioMission } from '../../domain/mission-model'
import type {
  SimPlan,
  SimSettings,
  SimStatus,
  Telemetry
} from './simulation-types'
import {
  distanceToDisplay,
  distanceUnit,
  formatDistance,
  speedToDisplay,
  speedUnit,
  useMeasurementSystem
} from '../../shared/measurement-units'

function Stat ({
  label,
  value,
  size
}: {
  label: string
  value: string
  size?: string
}) {
  return (
    <div className='ms-stat'>
      <dt className='text-xs text-(--muted-foreground)'>{label}</dt>
      <dd
        className={`${
          size == 'lg' ? 'text-lg' : 'text-base'
        } font-medium m-0 overflow-hidden text-ellipsis`}
      >
        {value}
      </dd>
    </div>
  )
}

export interface SimulationDetailsProps {
  mission: StudioMission
  plan: SimPlan
  telemetry: Telemetry | null
  status: SimStatus
  simT: number
  totalT: number
  runIndex: number
  settings: SimSettings
}

export default function SimulationDetails ({
  mission,
  plan,
  telemetry,
  status,
  simT,
  totalT,
  runIndex,
  settings
}: SimulationDetailsProps) {
  const unitSystem = useMeasurementSystem()
  const running = status === 'running'
  const paused = status === 'paused'
  const pct = totalT > 0 ? Math.min(100, (simT / totalT) * 100) : 0
  const currentSeq = telemetry?.targetSeq ?? null
  return (
    <>
      <Accordion
        aria-label='Drone and route details'
        multiple
        defaultValue={['drone', 'route']}
        // className='px-3'
      >
        <AccordionItem value='drone'>
          <AccordionHeader>
            <AccordionTrigger className='px-3'>
              Drone telemetry{telemetry ? ` — ${telemetry.mode}` : ''}
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel>
            {telemetry ? (
              <div data-testid='ms-telemetry'>
                <dl
                  className='m-0 grid grid-cols-[2.1fr_1fr] gap-3 px-3 pb-3'
                  data-testid='ms-telemetry-1'
                >
                  <Stat label='Vehicle' value={mission.vehicle} />
                  <Stat label='Mode' value={telemetry.mode} />
                  <Stat label='Signal' value={telemetry.signal} />
                  <Stat
                    label='Battery'
                    value={`${telemetry.batteryPct.toFixed(0)}%`}
                  />
                </dl>
                <dl
                  className='m-0 grid grid-cols-3 gap-3 px-3 pb-3'
                  data-testid='ms-telemetry-2'
                >
                  <Stat
                    label='Roll'
                    value={`${telemetry.rollDeg.toFixed(1)}°`}
                  />
                  <Stat
                    label='Pitch'
                    value={`${telemetry.pitchDeg.toFixed(1)}°`}
                  />
                  <Stat label='Yaw' value={`${telemetry.yawDeg.toFixed(1)}°`} />
                  <Stat
                    label='Altitude'
                    value={`${distanceToDisplay(
                      telemetry.altM,
                      unitSystem
                    ).toFixed(1)} ${distanceUnit(unitSystem)}`}
                  />
                  <Stat
                    label='Speed'
                    value={`${speedToDisplay(
                      telemetry.speedMS,
                      unitSystem
                    ).toFixed(2)} ${speedUnit(unitSystem)}`}
                  />
                  <Stat
                    label='Home distance'
                    value={formatDistance(telemetry.homeDistM, unitSystem)}
                  />
                </dl>
              </div>
            ) : (
              <p className='ms-hint'>Run the simulation to view telemetry.</p>
            )}
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem value='route'>
          <AccordionHeader>
            <AccordionTrigger className='px-3'>
              Route — {mission.waypoints.length} waypoints
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel className='px-3 pb-3'>
            <Progress value={pct} aria-label='Route progress' className='my-3'>
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            <p className='ms-hint' data-testid='ms-route-progress'>
              {pct.toFixed(0)}% · {formatDistance(plan.totalDist, unitSystem)} ·
              run {runIndex + 1}/{settings.runTimes}
            </p>
            <ol
              className=' [list-style:none] mt-2 -mx-1.5 mb-0 p-0 flex flex-col gap-0.5 max-h-65 overflow-y-auto text-sm'
              data-testid='ms-route-list'
            >
              {mission.waypoints.map(wp => (
                <li
                  key={wp.id}
                  className={[
                    currentSeq === wp.seq && (running || paused)
                      ? 'is-active'
                      : '',
                    'flex flex-col gap-px py-0.75 px-1.5 rounded-(--radius) [&.is-active]:bg-(--accent) [&.is-active]:text-(--primary) [&.is-active]:font-semibold'
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-testid='ms-route-item'
                >
                  <span>
                    {wp.seq} — ({distanceToDisplay(wp.x, unitSystem).toFixed(1)}
                    , {distanceToDisplay(wp.y, unitSystem).toFixed(1)},{' '}
                    {distanceToDisplay(wp.z, unitSystem).toFixed(1)}{' '}
                    {distanceUnit(unitSystem)})
                  </span>
                  {wp.actions.length > 0 ? (
                    <span className='ms-hint'>
                      {wp.actions.map(a => a.label).join(' · ')}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <p className='ms-hint'>
              END — {mission.returnHomeOnEnd ? 'Return home' : 'Land in place'}
            </p>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      <p className='px-3 text-xs text-muted-foreground'>
        {settings.runTimes}× run ·{' '}
        {settings.speedFactor.toFixed(2).replace(/\.?0+$/, '')}× speed · wind{' '}
        {speedToDisplay(settings.windMS, unitSystem)} {speedUnit(unitSystem)} ·{' '}
        {settings.reducedMotion ? 'reduced motion' : 'full motion'}
        {settings.mockFailureAtSeq > 0
          ? ` · failure at WP ${settings.mockFailureAtSeq}`
          : ''}
      </p>
    </>
  )
}
