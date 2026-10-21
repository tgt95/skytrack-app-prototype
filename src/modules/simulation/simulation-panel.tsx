/* simulation-panel.tsx — right inspector for the Simulation stage:
   Details / Events / (Console in Code mode) tabs, settings, run footer. */

import { useEffect, useState } from 'react'
import { ArrowCounterClockwiseIcon, PauseIcon, PlayIcon, StopIcon } from '@phosphor-icons/react'
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger } from 'skytrack-ui/accordion'
import { Button } from 'skytrack-ui/button'
import { FieldLabel, FieldRoot } from 'skytrack-ui/field'
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput
} from 'skytrack-ui/number-field'
import { Progress, ProgressIndicator, ProgressTrack } from 'skytrack-ui/progress'
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from 'skytrack-ui/slider'
import { Switch, SwitchThumb } from 'skytrack-ui/switch'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from 'skytrack-ui/tabs'
import type { StudioMission } from '../../domain/mission-model'
import { type SimEventItem, type SimLogLine, type SimPlan, type SimSettings, type SimStatus, type Telemetry } from './simulation'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className='ms-stat'>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export interface SimulationPanelProps {
  mission: StudioMission
  plan: SimPlan | null
  gateReason: string | null
  telemetry: Telemetry | null
  status: SimStatus
  simT: number
  totalT: number
  runIndex: number
  log: SimLogLine[]
  fired: SimEventItem[]
  settings: SimSettings
  showConsole: boolean
  tab: string
  onTabChange: (tab: string) => void
  onRun: () => void
  onPause: () => void
  onResume: () => void
  onAbort: () => void
  onRestart: () => void
  onSelectEvent: (ev: SimEventItem) => void
}

export interface SimulationSettingsFormProps {
  settings: SimSettings
  onChange: (settings: SimSettings) => void
  onClose?: () => void
  /** Waypoint count used to bound the mock-failure field. Defaults when rendered without mission context. */
  maxSeq?: number
}

/** Countdown (seconds) before the panel auto-restarts a completed/failed run. */
export const AUTO_RESTART_DELAY_S = 5

export function SimulationSettingsForm({ settings, onChange, onClose, maxSeq = 99 }: SimulationSettingsFormProps) {
  return (
    <div>
      <FieldRoot className='ms-field'>
        <FieldLabel>Run times</FieldLabel>
        <NumberField
          value={settings.runTimes}
          min={1}
          max={20}
          step={1}
          onValueChange={(v: number | null) => {
            if (v !== null) onChange({ ...settings, runTimes: Math.min(20, Math.max(1, Math.round(v))) })
          }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement aria-label='Decrease run times'>−</NumberFieldDecrement>
            <NumberFieldInput aria-label='Run times' />
            <NumberFieldIncrement aria-label='Increase run times'>+</NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
        <p className='ms-hint'>Enter 1–20.</p>
      </FieldRoot>
      <FieldRoot className='ms-field'>
        <FieldLabel>Playback speed — {settings.speedFactor.toFixed(1)}×</FieldLabel>
        <Slider
          value={settings.speedFactor}
          min={0.25}
          max={4}
          step={0.25}
          onValueChange={(v: number | readonly number[]) => {
            const first = typeof v === 'number' ? v : v[0]
            if (typeof first === 'number') onChange({ ...settings, speedFactor: first })
          }}
        >
          <SliderControl>
            <SliderTrack>
              <SliderIndicator />
              <SliderThumb aria-label='Playback speed' />
            </SliderTrack>
          </SliderControl>
        </Slider>
      </FieldRoot>
      <label className='ms-switchrow'>
        <Switch
          checked={settings.reducedMotion}
          size='sm'
          onCheckedChange={(v: boolean) => onChange({ ...settings, reducedMotion: v })}
          aria-label='Reduced motion'
        >
          <SwitchThumb />
        </Switch>
        Reduced motion (step vehicle, no camera glide)
      </label>
      <FieldRoot className='ms-field'>
        <FieldLabel>Wind (m/s, mock)</FieldLabel>
        <NumberField
          value={settings.windMS}
          min={0}
          max={12}
          step={0.5}
          onValueChange={(v: number | null) => {
            if (v !== null) onChange({ ...settings, windMS: v })
          }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement aria-label='Decrease wind'>−</NumberFieldDecrement>
            <NumberFieldInput aria-label='Wind' />
            <NumberFieldIncrement aria-label='Increase wind'>+</NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
      </FieldRoot>
      <FieldRoot className='ms-field'>
        <FieldLabel>Inject mock failure at waypoint (0 = none)</FieldLabel>
        <NumberField
          value={settings.mockFailureAtSeq}
          min={0}
          max={maxSeq}
          step={1}
          onValueChange={(v: number | null) => {
            if (v !== null) onChange({ ...settings, mockFailureAtSeq: Math.min(maxSeq, Math.max(0, Math.round(v))) })
          }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement aria-label='Decrease failure waypoint'>−</NumberFieldDecrement>
            <NumberFieldInput aria-label='Mock failure waypoint' />
            <NumberFieldIncrement aria-label='Increase failure waypoint'>+</NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
      </FieldRoot>
      {onClose ? (
        <Button size='sm' variant='ghost' onClick={onClose}>
          Close
        </Button>
      ) : null}
    </div>
  )
}

export default function SimulationPanel(props: SimulationPanelProps) {
  const {
    mission,
    plan,
    gateReason,
    telemetry,
    status,
    simT,
    totalT,
    runIndex,
    log,
    fired,
    settings,
    showConsole,
    tab,
    onTabChange,
    onRun,
    onPause,
    onResume,
    onAbort,
    onRestart,
    onSelectEvent
  } = props
  const [autoRestartIn, setAutoRestartIn] = useState<number | null>(null)
  const activeTab = showConsole ? tab : tab === 'console' ? 'details' : tab

  // Source parity: completed/failed runs auto-restart after a short
  // countdown unless the operator cancels. The countdown text lives inside
  // the existing role=status/alert messages so assistive tech announces it.
  useEffect(() => {
    if (status === 'completed' || status === 'failed') {
      setAutoRestartIn(AUTO_RESTART_DELAY_S)
    } else {
      setAutoRestartIn(null)
    }
  }, [status])

  useEffect(() => {
    if (autoRestartIn === null) return
    if (autoRestartIn <= 0) {
      onRestart()
      return
    }
    const id = window.setTimeout(() => {
      setAutoRestartIn((n) => (n === null ? n : n - 1))
    }, 1000)
    return () => window.clearTimeout(id)
  }, [autoRestartIn, onRestart])

  const running = status === 'running'
  const paused = status === 'paused'
  const ended = status === 'completed' || status === 'aborted' || status === 'failed'
  const pct = totalT > 0 ? Math.min(100, (simT / totalT) * 100) : 0
  const currentSeq = telemetry?.targetSeq ?? null

  return (
    <div className='ms-inspector' data-testid='ms-sim-panel'>
      <div className='ms-inspector-head'>
        <div>
          <h2 className='ms-inspector-title'>Simulation</h2>
          <p className='ms-inspector-sub'>Mock run — deterministic local clock.</p>
        </div>
      </div>

      {!plan ? (
        <section className='ms-card' role='status'>
          <h3 className='ms-card-title'>Simulation locked</h3>
          <p className='ms-hint'>{gateReason ?? 'Add mission logic first.'}</p>
        </section>
      ) : (
        <Tabs value={activeTab} onValueChange={(v: unknown) => onTabChange(String(v))}>
          <TabsList aria-label='Simulation views'>
            <TabsTab value='details'>Mission details</TabsTab>
            <TabsTab value='events'>Events</TabsTab>
            {showConsole ? <TabsTab value='console'>Console</TabsTab> : null}
            <TabsIndicator />
          </TabsList>

          <TabsPanel value='details'>
            <Accordion aria-label='Drone and route details' multiple defaultValue={['drone', 'route']}>
              <AccordionItem value='drone'>
                <AccordionHeader>
                  <AccordionTrigger>Drone telemetry{telemetry ? ` — ${telemetry.mode}` : ''}</AccordionTrigger>
                </AccordionHeader>
                <AccordionPanel>
                  {telemetry ? (
                    <dl className='ms-stats' data-testid='ms-telemetry'>
                      <Stat label='Vehicle' value={mission.vehicle} />
                      <Stat label='Mode' value={telemetry.mode} />
                      <Stat label='Signal' value={`${telemetry.signal} (mock)`} />
                      <Stat label='Roll' value={`${telemetry.rollDeg.toFixed(1)}°`} />
                      <Stat label='Pitch' value={`${telemetry.pitchDeg.toFixed(1)}°`} />
                      <Stat label='Yaw' value={`${telemetry.yawDeg.toFixed(1)}°`} />
                      <Stat label='Altitude' value={`${telemetry.altM.toFixed(1)} m`} />
                      <Stat label='Speed' value={`${telemetry.speedMS.toFixed(2)} m/s`} />
                      <Stat label='Battery' value={`${telemetry.batteryPct.toFixed(0)}% (mock)`} />
                      <Stat label='Home distance' value={`${telemetry.homeDistM.toFixed(1)} m`} />
                    </dl>
                  ) : (
                    <p className='ms-hint'>No telemetry yet — run the mock simulation.</p>
                  )}
                </AccordionPanel>
              </AccordionItem>
              <AccordionItem value='route'>
                <AccordionHeader>
                  <AccordionTrigger>Route — {mission.waypoints.length} waypoints</AccordionTrigger>
                </AccordionHeader>
                <AccordionPanel>
                  <Progress value={pct} aria-label='Route progress'>
                    <ProgressTrack>
                      <ProgressIndicator />
                    </ProgressTrack>
                  </Progress>
                  <p className='ms-hint' data-testid='ms-route-progress'>
                    {pct.toFixed(0)}% · {plan.totalDist.toFixed(1)} m · run {runIndex + 1}/{settings.runTimes}
                  </p>
                  <ol className='ms-route-list'>
                    {mission.waypoints.map((wp) => (
                      <li
                        key={wp.id}
                        className={`ms-route-item${currentSeq === wp.seq && (running || paused) ? ' is-active' : ''}`}
                      >
                        <span>
                          {wp.seq} — ({wp.x.toFixed(1)}, {wp.y.toFixed(1)}, {wp.z.toFixed(1)})
                        </span>
                        {wp.actions.length > 0 ? <span className='ms-hint'>{wp.actions.map((a) => a.label).join(' · ')}</span> : null}
                      </li>
                    ))}
                  </ol>
                  <p className='ms-hint'>END — {mission.returnHomeOnEnd ? 'Return home' : 'Land in place'}</p>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
            <p className='ms-hint'>
              {settings.runTimes}× run · {settings.speedFactor.toFixed(2).replace(/\.?0+$/, '')}× speed · wind{' '}
              {settings.windMS} m/s · {settings.reducedMotion ? 'reduced motion' : 'full motion'}
              {settings.mockFailureAtSeq > 0 ? ` · mock failure at WP ${settings.mockFailureAtSeq}` : ''}
            </p>
          </TabsPanel>

          <TabsPanel value='events'>
            {fired.length === 0 ? (
              <section className='ms-card' role='status'>
                <h3 className='ms-card-title'>No events yet</h3>
                <p className='ms-hint'>Events appear here while the mock run plays — waypoint arrivals, actions, return home.</p>
              </section>
            ) : (
              <ol className='ms-event-list' aria-label='Simulation events'>
                {fired.map((ev, i) => (
                  <li key={`${ev.t}-${i}`}>
                    <button
                      type='button'
                      className='ms-event-row'
                      onClick={() => onSelectEvent(ev)}
                      aria-label={`Focus ${ev.label}`}
                    >
                      <span className='ms-event-t'>{ev.t.toFixed(1)}s</span>
                      <span>{ev.label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </TabsPanel>

          {showConsole ? (
            <TabsPanel value='console'>
              <ol className='ms-console' aria-label='Simulation console (mock)'>
                {log.length === 0 ? (
                  <li className='ms-hint'>Console is empty — start a run.</li>
                ) : (
                  log.map((line, i) => (
                    <li key={i} className='ms-console-line'>
                      <span className='ms-event-t'>[{line.t.toFixed(1)}s]</span> {line.text}
                    </li>
                  ))
                )}
              </ol>
            </TabsPanel>
          ) : null}
        </Tabs>
      )}

      {status === 'completed' ? (
        <p className='ms-issue is-ok' role='status'>
          Mission run completed (mock). Restart to replay.{' '}
          {autoRestartIn !== null ? (
            <>
              Restart simulation in {autoRestartIn} seconds.{' '}
              <Button size='sm' variant='ghost' onClick={() => setAutoRestartIn(null)} aria-label='Cancel automatic restart'>
                Cancel
              </Button>
            </>
          ) : null}
        </p>
      ) : null}
      {status === 'failed' ? (
        <p className='ms-issue is-error' role='alert'>
          Mock run failed — design preserved. Adjust settings or Restart.{' '}
          {autoRestartIn !== null ? (
            <>
              Restart simulation in {autoRestartIn} seconds.{' '}
              <Button size='sm' variant='ghost' onClick={() => setAutoRestartIn(null)} aria-label='Cancel automatic restart'>
                Cancel
              </Button>
            </>
          ) : null}
        </p>
      ) : null}
      {status === 'aborted' ? (
        <p className='ms-issue is-warning' role='status'>Run aborted by operator — not completed. Restart to replay.</p>
      ) : null}

      <div className='ms-runfooter' data-testid='ms-run-footer'>
        {!running && !paused ? (
          <Button size='sm' variant='default' onClick={ended ? onRestart : onRun} disabled={!plan} aria-label={ended ? 'Restart simulation' : 'Run simulation'}>
            <PlayIcon aria-hidden='true' /> {ended ? 'Restart' : 'Run Simulation'}
          </Button>
        ) : null}
        {running ? (
          <>
            <Button size='sm' variant='secondary' onClick={onPause} aria-label='Pause simulation'>
              <PauseIcon aria-hidden='true' /> Pause
            </Button>
            <Button size='sm' variant='outline' onClick={onAbort} aria-label='Abort simulation'>
              <StopIcon aria-hidden='true' /> Abort
            </Button>
          </>
        ) : null}
        {paused ? (
          <>
            <Button size='sm' variant='default' onClick={onResume} aria-label='Resume simulation'>
              <PlayIcon aria-hidden='true' /> Resume
            </Button>
            <Button size='sm' variant='outline' onClick={onAbort} aria-label='Abort simulation'>
              <StopIcon aria-hidden='true' /> Abort
            </Button>
            <Button size='sm' variant='ghost' onClick={onRestart} aria-label='Restart simulation'>
              <ArrowCounterClockwiseIcon aria-hidden='true' /> Restart
            </Button>
          </>
        ) : null}
      </div>
      <p className='ms-foot-note'>Mock LiDAR and telemetry derive from the same clock — nothing is sensed or flown.</p>
    </div>
  )
}
