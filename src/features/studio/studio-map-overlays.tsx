import type { ReactNode } from "react";
import { PauseIcon, PlayIcon, SquareIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Toggle } from "skytrack-ui/toggle";
import { ToggleGroup } from "skytrack-ui/toggle-group";
import { Toolbar, ToolbarButton, ToolbarGroup } from "skytrack-ui/toolbar";
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "skytrack-ui/tooltip";
import { AreaIcon } from "../../ui/components/icons";
import type { SceneTool } from "../../domain/mission-model";
import type { SimApi, SimPlan } from "../simulation/simulation";
import type { AppTab } from "./studio-left-rail";
import type { PendingMissionShape } from "./use-drawing-session";

export type Stage = "design" | "simulation";

const stageToggleClassName = [
  "group relative inline-flex items-center gap-2 h-auto py-2.5 px-3.5 rounded-[0] bg-transparent text-(--muted-foreground) text-[0.8125rem] font-semibold whitespace-nowrap",
  "hover:bg-transparent hover:text-(--foreground) disabled:opacity-[0.55] aria-disabled:opacity-[0.55] aria-disabled:cursor-not-allowed",
  "data-[pressed=true]:bg-transparent data-[pressed=true]:text-(--foreground) aria-pressed:bg-transparent aria-pressed:text-(--foreground)",
  '[&[data-pressed="true"]::after]:[content:""] [&[data-pressed="true"]::after]:absolute [&[data-pressed="true"]::after]:left-2.5 [&[data-pressed="true"]::after]:right-2.5 [&[data-pressed="true"]::after]:-bottom-0.25 [&[data-pressed="true"]::after]:h-0.5 [&[data-pressed="true"]::after]:rounded-[0.125rem] [&[data-pressed="true"]::after]:bg-(--primary)',
  '[&[aria-pressed="true"]::after]:[content:""] [&[aria-pressed="true"]::after]:absolute [&[aria-pressed="true"]::after]:left-2.5 [&[aria-pressed="true"]::after]:right-2.5 [&[aria-pressed="true"]::after]:-bottom-0.25 [&[aria-pressed="true"]::after]:h-0.5 [&[aria-pressed="true"]::after]:rounded-[0.125rem] [&[aria-pressed="true"]::after]:bg-(--primary)',
  "[@media_(max-width:_61.25rem)]:py-2 [@media_(max-width:_61.25rem)]:px-2.5 [@media_(max-width:_61.25rem)]:text-xs",
].join(" ");

const stageNumberClassName =
  "ms-stage-num group-data-[pressed=true]:bg-(--primary) group-data-[pressed=true]:[border-color:transparent] group-data-[pressed=true]:text-(--primary-foreground) group-aria-pressed:bg-(--primary) group-aria-pressed:[border-color:transparent] group-aria-pressed:text-(--primary-foreground)";

interface StudioMapOverlaysProps {
  appTab: AppTab;
  stage: Stage;
  gate: { ok: boolean; reason: string | null };
  drawing: boolean;
  tool: SceneTool;
  pendingCount: number;
  pendingShape: PendingMissionShape;
  simActive: boolean;
  sim: SimApi;
  totalT: number;
  plan: SimPlan | null;
  onStageChange: (stage: Stage) => void;
  onPendingShapeChange: (shape: PendingMissionShape) => void;
  onOpenSimulationSettings: () => void;
  onAnnounce: (message: string) => void;
  children: ReactNode;
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
  children,
}: StudioMapOverlaysProps) {
  if (appTab !== "plan") {
    const title = appTab === "fly" ? "Fly" : "Report";
    const testId =
      appTab === "fly" ? "ms-fly-placeholder" : "ms-report-placeholder";
    const description =
      appTab === "fly" ? "Flight monitoring" : "Mission reports";
    return (
      <div
        className=" flex-[1_1_auto] flex items-start justify-center min-w-0 py-12 px-6 overflow-y-auto"
        data-testid="ms-body-placeholder"
      >
        <section
          className="ms-placeholder"
          role="region"
          aria-label={title}
          data-testid={testId}
        >
          <h2
            className="heading m-0 text-base font-bold"
            data-testid="ms-placeholder-title"
          >
            {title}
          </h2>
          <p className="ms-hint">{description}</p>
        </section>
      </div>
    );
  }

  return (
    <section
      className=" [@media_(max-width:_61.25rem)]:flex-[0_0_auto] flex-[1_1_auto] flex flex-col min-w-0 min-h-0"
      aria-label="3D scene and run controls"
    >
      <div
        className="ms-stage-minibar flex-[0_0_auto] flex items-stretch bg-(--card) border-b border-b-border py-0 px-4 [@media_(max-width:_61.25rem)]:py-0 [@media_(max-width:_61.25rem)]:px-2"
        data-testid="ms-stage-minibar"
      >
        <ToggleGroup
          className="flex items-stretch gap-0 p-0 [border:0] rounded-none bg-transparent"
          value={[stage]}
          onValueChange={(next: string[]) => {
            const first = next[0];
            if (first === "design" || first === "simulation")
              onStageChange(first);
          }}
          aria-label="Mission stage"
        >
          <Toggle
            className={stageToggleClassName}
            value="design"
            aria-label="Design stage (1)"
            aria-current={stage === "design" ? "step" : undefined}
          >
            <span className={stageNumberClassName} aria-hidden="true">
              1
            </span>
            <span className="ms-stage-label">Design</span>
          </Toggle>
          <span
            className=" flex-[0_0_auto] self-center w-6 h-px my-0 mx-1 bg-(--border) [@media_(max-width:_61.25rem)]:w-6"
            aria-hidden="true"
            data-testid="ms-stage-link"
          />
          {gate.ok ? (
            <Toggle
              className={stageToggleClassName}
              value="simulation"
              aria-label="Simulation stage (2)"
              aria-current={stage === "simulation" ? "step" : undefined}
            >
              <span className={stageNumberClassName} aria-hidden="true">
                2
              </span>
              <span className="ms-stage-label">Simulation</span>
            </Toggle>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Toggle
                      className={stageToggleClassName}
                      value="simulation"
                      aria-label="Simulation stage (2)"
                      aria-current={stage === "simulation" ? "step" : undefined}
                      aria-disabled="true"
                      tabIndex={0}
                      onClick={(event) => {
                        event.preventDefault();
                        onAnnounce(
                          `Simulation locked. ${gate.reason ?? "Mission is not valid."}`,
                        );
                      }}
                      title={
                        gate.reason
                          ? `Simulation locked — ${gate.reason}`
                          : "Simulation locked"
                      }
                    />
                  }
                >
                  <span className={stageNumberClassName} aria-hidden="true">
                    2
                  </span>
                  <span className="ms-stage-label">Simulation</span>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipPositioner side="bottom" sideOffset={8}>
                    <TooltipPopup>
                      <TooltipArrow />
                      {gate.reason
                        ? `Simulation locked — ${gate.reason}`
                        : "Simulation locked"}
                    </TooltipPopup>
                  </TooltipPositioner>
                </TooltipPortal>
              </Tooltip>
            </TooltipProvider>
          )}
        </ToggleGroup>
      </div>
      {drawing && stage === "design" && tool !== "route" ? (
        <div
          className=" flex-[0_0_auto] flex items-center justify-between gap-2.5 py-1.5 px-3 border-b border-b-border bg-(--card) text-xs"
          role="status"
          data-testid="ms-drawbar"
        >
          <div
            className=" flex items-center gap-3 min-w-0 text-(--muted-foreground)"
            data-testid="ms-drawbar-copy"
          >
            {tool === "avoid" ? (
              <Toolbar
                orientation="horizontal"
                aria-label="Avoid-zone footprint shape"
                className="flex-[0_0_auto]"
              >
                <ToolbarGroup>
                <ToolbarButton
                  type="button"
                  size="sm"
                  isActivated={pendingShape === "polygon"}
                  aria-pressed={pendingShape === "polygon"}
                  disabled={pendingCount > 0}
                  onClick={() => onPendingShapeChange("polygon")}
                >
                  <AreaIcon
                    aria-hidden="true"
                    className="w-4 h-4 fill-[currentColor] stroke-none"
                  />{" "}
                  Polygon
                </ToolbarButton>
                <ToolbarButton
                  type="button"
                  size="sm"
                  isActivated={pendingShape === "cylinder"}
                  aria-pressed={pendingShape === "cylinder"}
                  disabled={pendingCount > 0}
                  onClick={() => onPendingShapeChange("cylinder")}
                >
                  <svg
                    className="w-4 h-4 fill-none stroke-[currentColor] stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <ellipse cx="10" cy="4" rx="6.5" ry="2.5" />
                    <path d="M3.5 4v11.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V4" />
                    <path d="M3.5 15.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" />
                  </svg>{" "}
                  Cylinder
                </ToolbarButton>
                </ToolbarGroup>
              </Toolbar>
            ) : null}
            <span>
              {tool === "area"
                ? `Area — ${pendingCount} point${pendingCount === 1 ? "" : "s"} placed. Choose Polygon or Cylinder in Area draft settings.${pendingCount > 0 ? " Finish or cancel this draft to change shape." : ""}`
                : pendingShape === "cylinder"
                ? pendingCount === 0
                  ? "Click the scene to place the center; move and click the check to set radius."
                  : "Move the pointer to set the radius, then click the check to finish."
                : `Avoid-zone — ${pendingCount} point${pendingCount === 1 ? "" : "s"} placed. Close the outline at point 1.`}
            </span>
          </div>
        </div>
      ) : null}
      {simActive ? (
        <div
          className=" flex-[0_0_auto] flex items-center justify-between gap-2.5 py-1.5 px-3 border-b border-b-border bg-(--card) text-xs"
          role="status"
          data-testid="ms-simbar"
        >
          <span
            className=" flex items-center gap-1.5 min-w-0"
            data-testid="ms-sim-state"
          >
            {sim.status === "idle" &&
              "Ready — Run Simulation to follow the mission timeline."}
            {sim.status === "running" &&
              `Running simulation… t=${sim.simT.toFixed(1)}s / ${totalT.toFixed(0)}s (Space aborts · P pauses).`}
            {sim.status === "paused" &&
              `Paused at t=${sim.simT.toFixed(1)}s (Space aborts · P resumes).`}
            {sim.status === "completed" && "Completed."}
            {sim.status === "aborted" && "Aborted — design preserved."}
            {sim.status === "failed" && "Failed — design preserved."}
          </span>
          <span
            className=" flex items-center gap-1.5 min-w-0"
            data-testid="ms-simbar-actions"
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenSimulationSettings}
              aria-label="Open simulation settings"
            >
              Settings
            </Button>
            {sim.status === "idle" && (
              <Button
                size="sm"
                variant="default"
                onClick={sim.start}
                disabled={!plan}
              >
                <PlayIcon aria-hidden="true" /> Run
              </Button>
            )}
            {sim.status === "running" && (
              <Button size="sm" variant="secondary" onClick={sim.pause}>
                <PauseIcon aria-hidden="true" /> Pause
              </Button>
            )}
            {sim.status === "paused" && (
              <Button size="sm" variant="default" onClick={sim.resume}>
                <PlayIcon aria-hidden="true" /> Resume
              </Button>
            )}
            {(sim.status === "completed" ||
              sim.status === "aborted" ||
              sim.status === "failed") && (
              <Button size="sm" variant="default" onClick={sim.restart}>
                <PlayIcon aria-hidden="true" /> Restart
              </Button>
            )}
            {(sim.status === "running" || sim.status === "paused") && (
              <Button size="sm" variant="outline" onClick={sim.abort}>
                <SquareIcon aria-hidden="true" /> Abort
              </Button>
            )}
          </span>
        </div>
      ) : null}
      {children}
    </section>
  );
}
