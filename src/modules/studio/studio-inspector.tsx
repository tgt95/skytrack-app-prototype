import type { ComponentProps } from 'react'
import DesignPanel, { ZoneDraftPanel } from '../design/design-panel'
import RouteDraftPanel from '../design/route-draft-panel'
import SimulationPanel, { SimulationSettingsForm } from '../simulation/simulation-panel'

type DraftPanelProps = ComponentProps<typeof RouteDraftPanel>
type ZonePanelProps = ComponentProps<typeof ZoneDraftPanel>
type DesignInspectorProps = ComponentProps<typeof DesignPanel>
type SimulationInspectorProps = ComponentProps<typeof SimulationPanel>
type SimulationSettingsProps = ComponentProps<typeof SimulationSettingsForm>

export interface StudioInspectorProps {
  visible: boolean
  stageIsDesign: boolean
  codeView: boolean
  routeDraftActive: boolean
  zoneDraftActive: boolean
  routeDraft: DraftPanelProps
  zoneDraft: ZonePanelProps
  design: DesignInspectorProps
  simulationSettingsOpen: boolean
  simulationSettings: SimulationSettingsProps
  simulation: SimulationInspectorProps
}

export default function StudioInspector({
  visible,
  stageIsDesign,
  codeView,
  routeDraftActive,
  zoneDraftActive,
  routeDraft,
  zoneDraft,
  design,
  simulationSettingsOpen,
  simulationSettings,
  simulation
}: StudioInspectorProps) {
  if (!visible) return null

  return (
    <aside className={`ms-inspector-wrap${stageIsDesign && codeView && !routeDraftActive ? ' is-code-view' : ''}`} aria-label='Inspector'>
      {routeDraftActive ? (
        <RouteDraftPanel {...routeDraft} />
      ) : zoneDraftActive ? (
        <ZoneDraftPanel {...zoneDraft} />
      ) : stageIsDesign ? (
        <DesignPanel {...design} />
      ) : simulationSettingsOpen ? (
        <div className='ms-inspector' data-testid='ms-sim-settings'>
          <div className='ms-inspector-head'>
            <div>
              <h2 className='ms-inspector-title'>Simulation settings</h2>
              <p className='ms-inspector-sub'>Local mock run only — no aircraft, no cloud.</p>
            </div>
          </div>
          <SimulationSettingsForm {...simulationSettings} />
        </div>
      ) : (
        <SimulationPanel {...simulation} />
      )}
    </aside>
  )
}
