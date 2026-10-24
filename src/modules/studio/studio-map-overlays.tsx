import type { ReactNode } from 'react'
import {
  PauseIcon,
  PlayIcon,
  SquareIcon
} from '@phosphor-icons/react'
import { Button } from 'skytrack-ui/button'
import { Toggle } from 'skytrack-ui/toggle'
import { ToggleGroup } from 'skytrack-ui/toggle-group'
import { Toolbar, ToolbarButton, ToolbarGroup } from 'skytrack-ui/toolbar'
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger
} from 'skytrack-ui/tooltip'
import { AreaIcon } from '../../shared/icons'
import type { SceneTool } from '../../domain/mission-model'
import type { SimApi, SimPlan } from '../simulation/simulation'
import type { AppTab } from './studio-left-rail'
import type { PendingMissionShape } from './use-drawing-session'

export type Stage = 'design' | 'simulation'

interface StudioMapOverlaysProps {
  appTab: AppTab
  stage: Stage
  gate: { ok: boolean; reason: string | null }
  drawing: boolean
  tool: SceneTool
  pendingCount: number
  pendingShape: PendingMissionShape
  simActive: boolean
  sim: SimApi
  totalT: number
  plan: SimPlan | null
  onStageChange: (stage: Stage) => void
  onPendingShapeChange: (shape: PendingMissionShape) => void
  onOpenSimulationSettings: () => void
  onAnnounce: (message: string) => void
  children: ReactNode
}

export default function StudioMapOverlays({
  appTab,
  stage,
  gate,
  drawing,
  tool,
  pendingCount,
  pendingShape,
  simActive,
  sim,
  totalT,
  plan,
  onStageChange,
  onPendingShapeChange,
  onOpenSimulationSettings,
  onAnnounce,
  children
}: StudioMapOverlaysProps) {
  if (appTab !== 'plan') {
    const title = appTab === 'fly' ? 'Fly' : 'Report'
    const testId = appTab === 'fly' ? 'ms-fly-placeholder' : 'ms-report-placeholder'
    const description = appTab === 'fly'
      ? 'Placeholder — flight execution is not implemented in this prototype. Plan holds the current mission planner.'
      : 'Placeholder — mission reports are not implemented in this prototype. Plan holds the current mission planner.'
    return (
      <div className='ms-body-placeholder'>
        <section className='ms-placeholder' role='region' aria-label={`${title} placeholder`} data-testid={testId}>
          <h2 className='ms-placeholder-title'>{title}</h2>
          <p className='ms-hint'>{description}</p>
        </section>
      </div>
    )
  }

  return (
    <section className='ms-center' aria-label='3D scene and run controls'>
      <div className='ms-stage-minibar' data-testid='ms-stage-minibar'>
        <ToggleGroup
          className='ms-stage'
          value={[stage]}
          onValueChange={(next: string[]) => {
            const first = next[0]
            if (first === 'design' || first === 'simulation') onStageChange(first)
          }}
          aria-label='Mission stage'
        >
          <Toggle value='design' aria-label='Design stage (1)' aria-current={stage === 'design' ? 'step' : undefined}>
            <span className='ms-stage-num' aria-hidden='true'>1</span>
            <span className='ms-stage-label'>Design</span>
          </Toggle>
          <span className='ms-stage-link' aria-hidden='true' />
          {gate.ok ? (
            <Toggle value='simulation' aria-label='Simulation stage (2)' aria-current={stage === 'simulation' ? 'step' : undefined}>
              <span className='ms-stage-num' aria-hidden='true'>2</span>
              <span className='ms-stage-label'>Simulation</span>
            </Toggle>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={(
                  <Toggle
                    value='simulation'
                    aria-label='Simulation stage (2)'
                    aria-current={stage === 'simulation' ? 'step' : undefined}
                    aria-disabled='true'
                    tabIndex={0}
                    onClick={(event) => {
                      event.preventDefault()
                      onAnnounce(`Simulation locked. ${gate.reason ?? 'Mission is not valid.'}`)
                    }}
                    title={gate.reason ? `Simulation locked — ${gate.reason}` : 'Simulation locked'}
                  />
                )}>
                  <span className='ms-stage-num' aria-hidden='true'>2</span>
                  <span className='ms-stage-label'>Simulation</span>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipPositioner side='bottom' sideOffset={8}>
                    <TooltipPopup><TooltipArrow />{gate.reason ? `Simulation locked — ${gate.reason}` : 'Simulation locked'}</TooltipPopup>
                  </TooltipPositioner>
                </TooltipPortal>
              </Tooltip>
            </TooltipProvider>
          )}
        </ToggleGroup>
      </div>
      {drawing && stage === 'design' && tool !== 'route' ? (
        <div className='ms-drawbar' role='status'>
          <div className='ms-drawbar-copy'>
            <Toolbar orientation='horizontal' aria-label='Footprint shape' className='ms-zone-shape-toolbar'>
              <ToolbarGroup>
                <ToolbarButton type='button' size='sm' isActivated={pendingShape === 'polygon'} aria-pressed={pendingShape === 'polygon'} disabled={pendingCount > 0} onClick={() => onPendingShapeChange('polygon')}>
                  <AreaIcon aria-hidden='true' className='ms-fill-icon' /> Polygon
                </ToolbarButton>
                <ToolbarButton type='button' size='sm' isActivated={pendingShape === 'cylinder'} aria-pressed={pendingShape === 'cylinder'} disabled={pendingCount > 0} onClick={() => onPendingShapeChange('cylinder')}>
                  <svg viewBox='0 0 20 20' aria-hidden='true'><ellipse cx='10' cy='4' rx='6.5' ry='2.5' /><path d='M3.5 4v11.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V4' /><path d='M3.5 15.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5' /></svg> Cylinder
                </ToolbarButton>
              </ToolbarGroup>
            </Toolbar>
            <span>{pendingShape === 'cylinder'
              ? (pendingCount === 0 ? 'Click the scene to place the center; move and click the check to set radius.' : 'Move the pointer to set the radius, then click the check to finish.')
              : `${tool === 'area' ? 'Area' : 'Avoid-zone'} — ${pendingCount} point${pendingCount === 1 ? '' : 's'} placed. Close the outline at point 1.`}</span>
          </div>
        </div>
      ) : null}
      {simActive ? (
        <div className='ms-simbar' role='status'>
          <span className='ms-simbar-state' data-testid='ms-sim-state'>
            {sim.status === 'idle' && 'Ready — Run Simulation to play the mock clock.'}
            {sim.status === 'running' && `Running mock… t=${sim.simT.toFixed(1)}s / ${totalT.toFixed(0)}s (Space aborts · P pauses).`}
            {sim.status === 'paused' && `Paused at t=${sim.simT.toFixed(1)}s (Space aborts · P resumes).`}
            {sim.status === 'completed' && 'Completed (mock).'}
            {sim.status === 'aborted' && 'Aborted — design preserved.'}
            {sim.status === 'failed' && 'Failed (mock fault) — design preserved.'}
          </span>
          <span className='ms-simbar-actions'>
            <Button size='sm' variant='ghost' onClick={onOpenSimulationSettings} aria-label='Open simulation settings'>Settings</Button>
            {sim.status === 'idle' && <Button size='sm' variant='default' onClick={sim.start} disabled={!plan}><PlayIcon aria-hidden='true' /> Run</Button>}
            {sim.status === 'running' && <Button size='sm' variant='secondary' onClick={sim.pause}><PauseIcon aria-hidden='true' /> Pause</Button>}
            {sim.status === 'paused' && <Button size='sm' variant='default' onClick={sim.resume}><PlayIcon aria-hidden='true' /> Resume</Button>}
            {(sim.status === 'completed' || sim.status === 'aborted' || sim.status === 'failed') && <Button size='sm' variant='default' onClick={sim.restart}><PlayIcon aria-hidden='true' /> Restart</Button>}
            {(sim.status === 'running' || sim.status === 'paused') && <Button size='sm' variant='outline' onClick={sim.abort}><SquareIcon aria-hidden='true' /> Abort</Button>}
          </span>
        </div>
      ) : null}
      {children}
    </section>
  )
}
