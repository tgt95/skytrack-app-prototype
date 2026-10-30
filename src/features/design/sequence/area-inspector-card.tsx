import {
  CaretDownIcon,
  CaretUpIcon,
  DotsThreeIcon,
  GearIcon,
  GitMergeIcon,
  HandIcon,
  RulerIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
} from "skytrack-ui/menu";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import { AreaIcon } from "../../../ui/components/icons";
import {
  getAreaScanSpacingM,
  dist3,
  polygonAreaM2,
  type MissionArea,
  type ReconFlightSettings,
  type StudioMission,
} from "../../../domain/mission-model";
import type { DerivedTransfer } from "../../../domain/transfer-planner";
import { ReconCaptureSummary } from "../panels/reconnaissance-inspector";
import { InspectorField } from "../controls/inspector-field";
import SliderField from "../controls/slider-field";
import { EndMissionControl } from "./sequence-transfer";
import { RouteWaypointList } from "./route-waypoint-list";
import { ACTION_OPTIONS } from "./sequence-action-controls";
import { createAIWorkflowAt } from "./ai-workflow-utils";
import type {
  CameraActionKind,
  SceneSelection,
} from "../../../domain/mission-model";
import type { AIModelCardModel } from "../../../ui/components/ai-model-card";
import type { SequenceDropPosition } from "./sequence-drag";
import {
  distanceFromDisplay,
  distanceToDisplay,
  distanceUnit,
  formatArea,
  useMeasurementSystem,
} from "../../../shared/measurement-units";

type Waypoint = StudioMission["waypoints"][number];

export interface AreaInspectorCardProps {
  area: MissionArea;
  mission: StudioMission;
  orderedWaypoints: Waypoint[];
  worldType: "2D" | "3D";
  recon: ReconFlightSettings;
  draft: MissionArea;
  editing: boolean;
  collapsed: boolean;
  grabbedWaypointId: string | null;
  selected: SceneSelection | null;
  isFinalSequenceItem: boolean;
  transfer?: DerivedTransfer;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCollapsed: () => void;
  onToggleRecon: () => void;
  onOpenRecon: () => void;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  onSetActionPitch: (wpId: string, actionId: string, pitch: number) => void;
  onSelect: (selection: SceneSelection | null) => void;
  onInsertActionAt: (
    wpId: string,
    actionIndex: number,
    kind: CameraActionKind,
  ) => void;
  aiModels: AIModelCardModel[];
  onImportAIModel: () => void;
  onDeleteAIModel: (modelId: string) => boolean;
  onPickUpWaypoint: (id: string) => void;
  onPreviewMoveWaypoint: (id: string, dir: -1 | 1) => void;
  onDropPreviewWaypoint: (id: string) => void;
  onCancelPreviewWaypoint: (id: string) => void;
  onReorderWaypoint: (id: string, toIndex: number) => void;
  onMoveAction: (
    fromWpId: string,
    actionId: string,
    toWpId: string,
    toActionId?: string,
    position?: SequenceDropPosition,
  ) => void;
  onDeleteWaypoint: (id: string) => void;
  onDeleteAction: (wpId: string, actionId: string) => void;
  onAnnounce: (message: string) => void;
  onPreviewDraft: (nextDraft: MissionArea) => void;
  onCancelEdit: () => void;
  onCommitEdit: (draft: MissionArea) => void;
}

export default function AreaInspectorCard({
  area,
  mission,
  orderedWaypoints,
  worldType,
  recon,
  draft,
  editing,
  collapsed,
  grabbedWaypointId,
  selected,
  isFinalSequenceItem,
  transfer,
  onEdit,
  onDelete,
  onToggleCollapsed,
  onToggleRecon,
  onOpenRecon,
  onUpdateMission,
  onSetActionPitch,
  onSelect,
  onInsertActionAt,
  aiModels,
  onImportAIModel,
  onDeleteAIModel,
  onPickUpWaypoint,
  onPreviewMoveWaypoint,
  onDropPreviewWaypoint,
  onCancelPreviewWaypoint,
  onReorderWaypoint,
  onMoveAction,
  onDeleteWaypoint,
  onDeleteAction,
  onAnnounce,
  onPreviewDraft,
  onCancelEdit,
  onCommitEdit,
}: AreaInspectorCardProps) {
  const unitSystem = useMeasurementSystem();
  const areaM2 = Math.round(polygonAreaM2(area.points));
  const waypoints: Waypoint[] = mission.waypoints.filter(
    (waypoint) => waypoint.generatedByArea === area.id,
  );
  const latestAreaWaypoint = waypoints.at(-1);
  const actionCount = waypoints.reduce(
    (sum, waypoint) => sum + waypoint.actions.length,
    0,
  );
  const spacingM = getAreaScanSpacingM(area);
  const spacingLabel = area.reconnaissance?.enabled
    ? distanceToDisplay(spacingM, unitSystem).toFixed(1)
    : String(distanceToDisplay(spacingM, unitSystem));
  const pathLength = waypoints
    .slice(1)
    .reduce(
      (sum, waypoint, index) => sum + dist3(waypoints[index], waypoint),
      0,
    );

  const previewArea = (next: MissionArea) => onPreviewDraft(next);
  const addAIWorkflow = () => {
    if (!latestAreaWaypoint) return;
    const workflow = createAIWorkflowAt({
      sequenceId: area.id,
      sequenceType: "area",
      waypoint: latestAreaWaypoint,
      actionIndex: latestAreaWaypoint.actions.length,
      existingWorkflows: mission.aiWorkflows ?? [],
    });
    onUpdateMission(
      {
        ...mission,
        aiWorkflows: [...(mission.aiWorkflows ?? []), workflow],
      },
      `${workflow.label} added.`,
    );
  };

  return (
    <section
      className={`border border-border rounded-(--radius) bg-(--background) p-0 gap-3 [&:has([data-selected=true])]:border-(--primary)${editing ? " border-(--primary)" : ""}`}
      aria-label={area.label}
    >
      <div className="flex flex-row items-center gap-2 min-w-0 p-3 max-sm:flex-wrap">
        <div className="flex items-center gap-1.5 flex-[0_0_auto] min-w-0 whitespace-nowrap">
          <AreaIcon
            aria-hidden="true"
            className="w-4 h-4 text-(--foreground) shrink-0"
          />
          <span className="text-sm font-semibold flex-[0_0_auto] min-w-0 whitespace-nowrap">
            {area.label}
          </span>
        </div>
        <span className="block flex-[1_1_0] ml-auto min-w-0 overflow-hidden text-right text-ellipsis whitespace-nowrap text-xs text-(--muted-foreground) max-sm:ml-0 max-sm:text-left">
          <SkyTooltip>
            <span
              className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
              aria-label={
                areaM2 > 0
                  ? formatArea(areaM2, unitSystem)
                  : `${area.points.length} outline points`
              }
            >
              <RulerIcon aria-hidden="true" className="w-3.5 h-3.5" />
              {areaM2 > 0
                ? formatArea(areaM2, unitSystem)
                : `${area.points.length} pts`}
            </span>
          </SkyTooltip>
          <span aria-hidden="true">·</span>
          <SkyTooltip>
            <span
              className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
              aria-label={`${waypoints.length} generated waypoints in ${area.label}`}
            >
              <GitMergeIcon aria-hidden="true" className="w-3.5 h-3.5" />
              {waypoints.length}
            </span>
          </SkyTooltip>
          <span aria-hidden="true">·</span>
          <SkyTooltip>
            <span
              className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
              aria-label={`${actionCount} generated drone actions in ${area.label}`}
            >
              <HandIcon aria-hidden="true" className="w-3.5 h-3.5" />
              {actionCount}
            </span>
          </SkyTooltip>
        </span>
        <div className="flex items-center gap-0 ml-auto shrink-0">
          <Menu>
            <SkyTooltip>
              <MenuTrigger
                aria-label={`More options for ${area.label}`}
                className="border-0 bg-transparent p-0"
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <DotsThreeIcon aria-hidden="true" />
              </MenuTrigger>
            </SkyTooltip>
            <MenuPortal>
              <MenuPositioner side="bottom" align="end" sideOffset={4}>
                <MenuPopup>
                  {latestAreaWaypoint ? (
                    <MenuSubmenuRoot>
                      <MenuSubmenuTrigger
                        aria-label={`Add action to latest waypoint in ${area.label}`}
                      >
                        Add action
                      </MenuSubmenuTrigger>
                      <MenuPortal>
                        <MenuPositioner
                          side="right"
                          align="start"
                          sideOffset={4}
                        >
                          <MenuPopup className="min-w-52.5">
                            {ACTION_OPTIONS.map((option) => (
                              <MenuItem
                                key={option.value}
                                onClick={() =>
                                  onInsertActionAt(
                                    latestAreaWaypoint.id,
                                    latestAreaWaypoint.actions.length,
                                    option.value,
                                  )
                                }
                              >
                                {option.label}
                              </MenuItem>
                            ))}
                            <MenuSeparator />
                            <MenuItem onClick={addAIWorkflow}>
                              AI workflow
                            </MenuItem>
                          </MenuPopup>
                        </MenuPositioner>
                      </MenuPortal>
                    </MenuSubmenuRoot>
                  ) : (
                    <MenuItem disabled>Add action</MenuItem>
                  )}
                  <MenuSeparator />
                  <MenuItem onClick={onEdit}>Edit area</MenuItem>
                  <MenuSeparator />
                  <MenuItem onClick={onDelete}>Delete area</MenuItem>
                </MenuPopup>
              </MenuPositioner>
            </MenuPortal>
          </Menu>
          <SkyTooltip>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-expanded={!collapsed}
              aria-label={
                collapsed ? `Expand ${area.label}` : `Collapse ${area.label}`
              }
              onClick={onToggleCollapsed}
            >
              {collapsed ? (
                <CaretDownIcon aria-hidden="true" />
              ) : (
                <CaretUpIcon aria-hidden="true" />
              )}
            </Button>
          </SkyTooltip>
        </div>
      </div>
      {worldType === "2D" && !editing ? (
        <div className="border-b border-b-border">
          <InspectorField
            label="Reconnaissance flight"
            className="flex-row items-center gap-3 min-h-10.5 pb-2 px-3 text-(--muted-foreground) text-xs font-semibold"
          >
            <Switch
              className="flex-[0_0_auto]"
              checked={recon.enabled}
              size="sm"
              aria-label={`${area.label} reconnaissance flight`}
              onCheckedChange={onToggleRecon}
            >
              <SwitchThumb size="sm" />
            </Switch>
            <SkyTooltip>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Reconnaissance settings for ${area.label}`}
                onClick={onOpenRecon}
              >
                <GearIcon aria-hidden="true" />
              </Button>
            </SkyTooltip>
          </InspectorField>
        </div>
      ) : null}
      {worldType === "2D" && recon.enabled && !editing ? (
        <>
          <ReconCaptureSummary
            waypoints={waypoints}
            settings={recon}
            pathLength={pathLength}
            altitudeAgl
          />
        </>
      ) : null}
      {!collapsed ? (
        <>
          {editing ? (
            <form
              className="flex flex-col gap-2 mt-2.5 p-3"
              aria-label={`${area.label} scan settings`}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  onCancelEdit();
                } else if (event.key === "Enter") {
                  event.stopPropagation();
                  if (
                    event.target instanceof HTMLElement &&
                    event.target.getAttribute("role") === "slider"
                  ) {
                    event.preventDefault();
                    event.currentTarget.requestSubmit();
                  }
                }
              }}
              onSubmit={(event) => {
                event.preventDefault();
                onCommitEdit(draft);
              }}
            >
              {draft.reconnaissance?.enabled ? (
                <p className="m-0 text-xs text-(--muted-foreground) leading-[1.5] p-3">
                  Lane spacing follows Side overlap (
                  {distanceToDisplay(
                    getAreaScanSpacingM(draft),
                    unitSystem,
                  ).toFixed(1)}{" "}
                  {distanceUnit(unitSystem)}) while Recon is on. Turn Recon off
                  to edit manual line spacing.
                </p>
              ) : (
                <SliderField
                  label={`Line spacing (${distanceUnit(unitSystem)})`}
                  value={distanceToDisplay(draft.lineSpacingM ?? 6, unitSystem)}
                  min={distanceToDisplay(0.25, unitSystem)}
                  max={distanceToDisplay(20, unitSystem)}
                  step={unitSystem === "imperial" ? 0.5 : 0.25}
                  unit={distanceUnit(unitSystem)}
                  onChange={(value) =>
                    previewArea({
                      ...draft,
                      lineSpacingM: distanceFromDisplay(value, unitSystem),
                    })
                  }
                />
              )}
              <SliderField
                label="Orientation (°)"
                value={draft.orientationDeg ?? 0}
                min={-180}
                max={180}
                step={1}
                unit="°"
                onChange={(value) =>
                  previewArea({ ...draft, orientationDeg: value })
                }
              />
              <SliderField
                label={`Scan padding (${distanceUnit(unitSystem)})`}
                value={distanceToDisplay(draft.paddingM ?? 0, unitSystem)}
                min={distanceToDisplay(0, unitSystem)}
                max={distanceToDisplay(20, unitSystem)}
                step={unitSystem === "imperial" ? 1 : 0.5}
                unit={distanceUnit(unitSystem)}
                onChange={(value) =>
                  previewArea({
                    ...draft,
                    paddingM: distanceFromDisplay(value, unitSystem),
                  })
                }
              />
              <div className="flex justify-end flex-row gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onCancelEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="default">
                  Commit area
                </Button>
              </div>
            </form>
          ) : (
            <p className="m-0 text-xs text-(--muted-foreground) leading-[1.5] p-3 pt-0!">
              {area.scanLines?.length ?? 0} scan lanes · {spacingLabel}{" "}
              {distanceUnit(unitSystem)}
              spacing · {area.orientationDeg ?? 0}°
            </p>
          )}
          {!editing ? (
            <>
              <RouteWaypointList
                sequenceId={`area:${area.id}`}
                sequenceLabel={area.label}
                routeWaypoints={waypoints}
                orderedWaypoints={orderedWaypoints}
                mission={mission}
                recon={recon}
                grabbedWaypointId={grabbedWaypointId}
                selected={selected}
                transfer={transfer}
                generatedWaypoints
                onSelect={onSelect}
                onUpdateMission={onUpdateMission}
                onInsertActionAt={onInsertActionAt}
                aiModels={aiModels}
                onImportAIModel={onImportAIModel}
                onDeleteAIModel={onDeleteAIModel}
                onPickUpWaypoint={onPickUpWaypoint}
                onPreviewMoveWaypoint={onPreviewMoveWaypoint}
                onDropPreviewWaypoint={onDropPreviewWaypoint}
                onCancelPreviewWaypoint={onCancelPreviewWaypoint}
                onReorderWaypoint={onReorderWaypoint}
                onMoveAction={onMoveAction}
                onDeleteWaypoint={onDeleteWaypoint}
                onDeleteAction={onDeleteAction}
                onSetActionPitch={onSetActionPitch}
                onAnnounce={onAnnounce}
              />
              {isFinalSequenceItem && !transfer ? (
                <EndMissionControl
                  mission={mission}
                  onUpdateMission={onUpdateMission}
                  as="li"
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
