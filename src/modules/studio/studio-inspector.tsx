import type { ComponentProps } from "react";
import DesignPanel, { ZoneDraftPanel } from "../design/design-panel";
import RouteDraftPanel from "../design/route-draft-panel";
import SimulationPanel, {
  SimulationSettingsForm,
} from "../simulation/simulation-panel";

type DraftPanelProps = ComponentProps<typeof RouteDraftPanel>;
type ZonePanelProps = ComponentProps<typeof ZoneDraftPanel>;
type DesignInspectorProps = ComponentProps<typeof DesignPanel>;
type SimulationInspectorProps = ComponentProps<typeof SimulationPanel>;
type SimulationSettingsProps = ComponentProps<typeof SimulationSettingsForm>;

export interface StudioInspectorProps {
  visible: boolean;
  stageIsDesign: boolean;
  codeView: boolean;
  routeDraftActive: boolean;
  zoneDraftActive: boolean;
  routeDraft: DraftPanelProps;
  zoneDraft: ZonePanelProps;
  design: DesignInspectorProps;
  simulationSettingsOpen: boolean;
  simulationSettings: SimulationSettingsProps;
  simulation: SimulationInspectorProps;
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
  simulation,
}: StudioInspectorProps) {
  if (!visible) return null;

  return (
    <aside
      className={[
        `ms-inspector-wrap${stageIsDesign && codeView && !routeDraftActive ? " is-code-view" : ""}`,
        "flex-[0_0_25rem] min-h-0 [border-left:0.0625rem_solid_var(--border)] bg-(--card) overflow-y-auto [.ms-inspector-wrap&:where(.is-code-view)]:basis-[clamp(28.75rem,38vw,45rem)] [.ms-inspector-wrap&:where(.is-code-view)]:overflow-hidden [@media_(max-width:_73.75rem)]:basis-[19.375rem] [@media_(max-width:_73.75rem)]:[.ms-inspector-wrap&:where(.is-code-view)]:basis-[min(45vw,38.75rem)] [@media_(max-width:_61.25rem)]:flex-[0_0_auto] [@media_(max-width:_61.25rem)]:[border-left:none] [@media_(max-width:_61.25rem)]:[border-top:0.0625rem_solid_var(--border)] [@media_(max-width:_61.25rem)]:overflow-visible [@media_(max-width:_61.25rem)]:[.ms-inspector-wrap&:where(.is-code-view)]:basis-auto [@media_(max-width:_61.25rem)]:[.ms-inspector-wrap&:where(.is-code-view)]:h-[37.5rem]",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Inspector"
    >
      {routeDraftActive ? (
        <RouteDraftPanel {...routeDraft} />
      ) : zoneDraftActive ? (
        <ZoneDraftPanel {...zoneDraft} />
      ) : stageIsDesign ? (
        <DesignPanel {...design} />
      ) : simulationSettingsOpen ? (
        <div className="ms-inspector" data-testid="ms-sim-settings">
          <div
            className="flex items-start justify-between gap-[0.5rem]"
            data-testid="ms-inspector-head"
          >
            <div>
              <h2 className="ms-inspector-title">Simulation settings</h2>
            </div>
          </div>
          <SimulationSettingsForm {...simulationSettings} />
        </div>
      ) : (
        <SimulationPanel {...simulation} />
      )}
    </aside>
  );
}
