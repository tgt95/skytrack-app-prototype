import { QuestionIcon, SidebarIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import type { useDrawingSession } from "../../features/studio/use-drawing-session";
import type { useStudioSimulationModel } from "../../features/studio/use-studio-simulation-model";
import type { useStudioUiState } from "../../features/studio/use-studio-ui-state";

type FooterUiState = Pick<
  ReturnType<typeof useStudioUiState>,
  "stage" | "selection" | "settings" | "rightOpen"
>;
type FooterDrawingState = Pick<
  ReturnType<typeof useDrawingSession>,
  "tool" | "pending"
>;
type FooterSimulationState = Pick<
  ReturnType<typeof useStudioSimulationModel>,
  "plan" | "sim" | "totalT" | "telemetry"
>;

interface StudioStatusFooterProps {
  dirty: boolean;
  ui: FooterUiState;
  drawing: FooterDrawingState;
  simulation: FooterSimulationState;
  onOpenShortcuts: () => void;
  onToggleInspector: () => void;
}

export default function StudioStatusFooter({
  dirty,
  ui,
  drawing,
  simulation,
  onOpenShortcuts,
  onToggleInspector,
}: StudioStatusFooterProps) {
  const simActive = ui.stage === "simulation";
  const statusLine = `${ui.stage === "design" ? "Design" : "Simulation"} · ${drawing.tool} tool${ui.selection ? ` · selected ${ui.selection.kind}` : ""}${drawing.pending.length > 0 ? ` · ${drawing.pending.length} pts` : ""} · sim ${simulation.sim.status}${simulation.plan ? ` · t=${simulation.sim.simT.toFixed(1)}s/${simulation.totalT.toFixed(0)}s` : ""}${simulation.telemetry && simActive ? ` · home ${simulation.telemetry.homeDistM.toFixed(0)} m · wind ${ui.settings.windMS} m/s · GPS RTK` : ""}${dirty ? " · unsaved" : " · saved"}`;

  return (
    <footer
      className=" flex-[0_0_auto] flex items-center justify-between gap-[0.625rem] p-[0.25rem_0.75rem] [border-top:0.0625rem_solid_var(--border)] bg-(--card) text-[0.75rem] text-(--muted-foreground)"
      data-testid="ms-status"
    >
      <span
        className="ms-status-line overflow-hidden text-ellipsis whitespace-nowrap"
        data-testid="ms-status-line"
      >
        {statusLine}
      </span>
      <span
        className=" flex gap-[0.25rem] flex-[0_0_auto]"
        data-testid="ms-status-actions"
      >
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenShortcuts}
          aria-label="Keyboard shortcuts"
        >
          <QuestionIcon aria-hidden="true" /> Shortcuts
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleInspector}
          aria-label="Toggle inspector panel"
        >
          <SidebarIcon aria-hidden="true" />{" "}
          {ui.rightOpen ? "Hide panel (\\)" : "Show panel (\\)"}
        </Button>
      </span>
    </footer>
  );
}
