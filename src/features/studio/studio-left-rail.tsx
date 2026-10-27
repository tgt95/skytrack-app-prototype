import { memo } from "react";
import {
  AirplaneTakeoffIcon,
  ChartPieIcon,
  DroneIcon,
  HandIcon,
  ListChecksIcon,
  PathIcon,
} from "@phosphor-icons/react";
import { Tabs, TabsIndicator, TabsList, TabsTab } from "skytrack-ui/tabs";
import { Toolbar, ToolbarGroup } from "skytrack-ui/toolbar";
import { AreaIcon, AvoidZoneIcon } from "../../ui/components/icons";
import { ToolButton } from "../design/design-controls";
import type { SceneTool } from "../../domain/mission-model";

export type AppTab = "plan" | "fly" | "report";

const APP_TABS: { id: AppTab; label: string; hint: string }[] = [
  { id: "plan", label: "Plan", hint: "Mission planner" },
  { id: "fly", label: "Fly", hint: "Flight monitoring" },
  { id: "report", label: "Report", hint: "Mission reports" },
];

const APP_TAB_ICONS = {
  plan: ListChecksIcon,
  fly: DroneIcon,
  report: ChartPieIcon,
} as const;

interface StudioLeftRailProps {
  appTab: AppTab;
  orientation: "horizontal" | "vertical";
  stageIsDesign: boolean;
  tool: SceneTool;
  onAppTabChange: (tab: AppTab) => void;
  onToolChange: (tool: SceneTool) => void;
  onClearPending: () => void;
  onClearDraftCursor: () => void;
  onClearDraftClosure: () => void;
  onSetPolygon: () => void;
  onAnnounce: (message: string) => void;
}

function StudioLeftRail({
  appTab,
  orientation,
  stageIsDesign,
  tool,
  onAppTabChange,
  onToolChange,
  onClearPending,
  onClearDraftCursor,
  onClearDraftClosure,
  onSetPolygon,
  onAnnounce,
}: StudioLeftRailProps) {
  const resetDraft = () => {
    onClearPending();
    onClearDraftCursor();
    onClearDraftClosure();
  };

  return (
    <aside
      className=" [@media_(max-width:_61.25rem)]:flex-[0_0_auto] [@media_(max-width:_61.25rem)]:flex-col [@media_(max-width:_61.25rem)]:items-stretch [@media_(max-width:_61.25rem)]:gap-[0.5rem] [@media_(max-width:_61.25rem)]:[border-right:none] [@media_(max-width:_61.25rem)]:[border-bottom:0.0625rem_solid_var(--border)] [@media_(max-width:_61.25rem)]:p-[0.5rem_0.625rem] [@media_(max-width:_61.25rem)]:overflow-visible flex-[0_0_3.5rem] flex flex-col items-center gap-[0.75rem] p-[0.5rem_0] [border-right:0.0625rem_solid_var(--border)] bg-(--card) overflow-y-auto"
      aria-label="Mission navigation and tools"
    >
      <Tabs
        value={appTab}
        onValueChange={(value: unknown) => {
          const next = String(value) as AppTab;
          if (next !== appTab) onAppTabChange(next);
        }}
        orientation={orientation}
      >
        <TabsList
          className="ms-apptabs flex flex-col items-stretch gap-[0.125rem] rounded-(--radius) bg-transparent w-full p-0 [@media_(max-width:_61.25rem)]:flex-row [@media_(max-width:_61.25rem)]:items-center [@media_(max-width:_61.25rem)]:overflow-x-auto"
          aria-label="Mission workspace"
          variant="line"
        >
          {APP_TABS.map((tab) => {
            const TabIcon = APP_TAB_ICONS[tab.id];
            const selected = appTab === tab.id;
            return (
              <TabsTab
                key={tab.id}
                value={tab.id}
                id={`ms-apptab-${tab.id}`}
                aria-label={`${tab.label} — ${tab.hint}`}
                data-testid={`ms-apptab-${tab.id}`}
                className="in-[.ms-apptabs]:self-stretch in-[.ms-apptabs]:w-auto flex flex-col items-center gap-0.5 bg-transparent text-xs font-medium px-0.5 py-1.5 cursor-pointer [@media_(max-width:_61.25rem)]:flex-[0_0_auto] [@media_(max-width:_61.25rem)]:min-w-[4.75rem]"
              >
                <TabIcon
                  weight={selected ? "fill" : "regular"}
                  aria-hidden="true"
                  className="size-5"
                />
                <span className="text-xs">{tab.label}</span>
              </TabsTab>
            );
          })}
          <TabsIndicator />
        </TabsList>
      </Tabs>
      <Toolbar
        orientation="vertical"
        aria-label="Mission tools"
        className="ms-rail-bottom [@media_(max-width:_61.25rem)]:mt-0 [@media_(max-width:_61.25rem)]:flex-row [@media_(max-width:_61.25rem)]:items-center [@media_(max-width:_61.25rem)]:justify-start [@media_(max-width:_61.25rem)]:overflow-x-auto [@media_(max-width:_61.25rem)]:pb-[0.125rem] mt-auto flex flex-col items-center gap-[0.625rem] [.ms-rail-bottom&]:bg-transparent [.ms-rail-bottom&]:[border:0] [.ms-rail-bottom&]:rounded-none [.ms-rail-bottom&]:p-0"
      >
        <ToolbarGroup
          aria-label="Draw tools"
          className=" [@media_(max-width:_61.25rem)]:flex-row [@media_(max-width:_61.25rem)]:items-center [@media_(max-width:_61.25rem)]:flex-[0_0_auto] flex flex-col items-center gap-[0.25rem]"
        >
          <ToolButton
            label="Cursor"
            hint="Select · Esc"
            active={tool === "select"}
            testid="ms-tool-select"
            onClick={() => {
              resetDraft();
              onToolChange("select");
            }}
            disabled={!stageIsDesign}
          >
            <HandIcon
              weight={tool === "select" ? "fill" : "regular"}
              aria-hidden="true"
            />
          </ToolButton>
          <ToolButton
            label="Home point"
            hint="H · Click map to place drone Home"
            active={tool === "home"}
            testid="ms-tool-home"
            onClick={() => {
              resetDraft();
              onToolChange("home");
              onAnnounce("Click the map to place the drone Home point.");
            }}
            disabled={!stageIsDesign}
          >
            <AirplaneTakeoffIcon
              weight={tool === "home" ? "fill" : "regular"}
              aria-hidden="true"
            />
          </ToolButton>
          <ToolButton
            label="Route"
            hint="R"
            active={tool === "route"}
            testid="ms-tool-route"
            onClick={() => {
              resetDraft();
              onToolChange("route");
            }}
            disabled={!stageIsDesign}
          >
            <PathIcon
              weight={tool === "route" ? "fill" : "regular"}
              aria-hidden="true"
            />
          </ToolButton>
          <ToolButton
            label="Area"
            hint="A"
            active={tool === "area"}
            testid="ms-tool-area"
            onClick={() => {
              resetDraft();
              onSetPolygon();
              onToolChange("area");
            }}
            disabled={!stageIsDesign}
          >
            <AreaIcon aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Avoid zone"
            hint="N"
            active={tool === "avoid"}
            testid="ms-tool-avoid"
            onClick={() => {
              resetDraft();
              onSetPolygon();
              onToolChange("avoid");
            }}
            disabled={!stageIsDesign}
          >
            <AvoidZoneIcon aria-hidden="true" />
          </ToolButton>
        </ToolbarGroup>
      </Toolbar>
    </aside>
  );
}

export default memo(StudioLeftRail);
