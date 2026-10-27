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
import { AreaCameraWaypoints } from "./area-camera-waypoints";
import { InspectorField } from "../controls/inspector-field";
import SliderField from "../controls/slider-field";
import { EndMissionControl, TransferRow } from "./sequence-transfer";

type Waypoint = StudioMission["waypoints"][number];

export interface AreaInspectorCardProps {
  area: MissionArea;
  mission: StudioMission;
  worldType: "2D" | "3D";
  recon: ReconFlightSettings;
  draft: MissionArea;
  editing: boolean;
  collapsed: boolean;
  isFinalSequenceItem: boolean;
  transfer?: DerivedTransfer;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCollapsed: () => void;
  onToggleRecon: () => void;
  onOpenRecon: () => void;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  onSetActionPitch: (wpId: string, actionId: string, pitch: number) => void;
  onPreviewDraft: (nextDraft: MissionArea) => void;
  onCancelEdit: () => void;
  onCommitEdit: (draft: MissionArea) => void;
}

export default function AreaInspectorCard({
  area,
  mission,
  worldType,
  recon,
  draft,
  editing,
  collapsed,
  isFinalSequenceItem,
  transfer,
  onEdit,
  onDelete,
  onToggleCollapsed,
  onToggleRecon,
  onOpenRecon,
  onUpdateMission,
  onSetActionPitch,
  onPreviewDraft,
  onCancelEdit,
  onCommitEdit,
}: AreaInspectorCardProps) {
  const areaM2 = Math.round(polygonAreaM2(area.points));
  const waypoints: Waypoint[] = mission.waypoints.filter(
    (waypoint) => waypoint.generatedByArea === area.id,
  );
  const actionCount = waypoints.reduce(
    (sum, waypoint) => sum + waypoint.actions.length,
    0,
  );
  const spacingM = getAreaScanSpacingM(area);
  const spacingLabel = area.reconnaissance?.enabled
    ? spacingM.toFixed(1)
    : String(spacingM);
  const pathLength = waypoints
    .slice(1)
    .reduce(
      (sum, waypoint, index) => sum + dist3(waypoints[index], waypoint),
      0,
    );

  const previewArea = (next: MissionArea) => onPreviewDraft(next);

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
                  ? `${areaM2} square meters`
                  : `${area.points.length} outline points`
              }
            >
              <RulerIcon
                aria-hidden="true"
                className="w-3.5 h-3.5"
              />
              {areaM2 > 0 ? `${areaM2} m²` : `${area.points.length} pts`}
            </span>
          </SkyTooltip>
          <span aria-hidden="true">·</span>
          <SkyTooltip>
            <span
              className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
              aria-label={`${waypoints.length} generated waypoints in ${area.label}`}
            >
              <GitMergeIcon
                aria-hidden="true"
                className="w-3.5 h-3.5"
              />
              {waypoints.length}
            </span>
          </SkyTooltip>
          <span aria-hidden="true">·</span>
          <SkyTooltip>
            <span
              className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) [font-variant-numeric:tabular-nums] whitespace-nowrap"
              aria-label={`${actionCount} generated drone actions in ${area.label}`}
            >
              <HandIcon
                aria-hidden="true"
                className="w-3.5 h-3.5"
              />
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
      {worldType === "2D" ? (
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
      {worldType === "2D" && recon.enabled ? (
        <>
          <ReconCaptureSummary
            waypoints={waypoints}
            settings={recon}
            pathLength={pathLength}
            altitudeAgl
          />
          <AreaCameraWaypoints
            areaLabel={area.label}
            waypoints={waypoints}
            defaultGimbalPitchDeg={recon.gimbalPitchDeg}
            onSetPitch={onSetActionPitch}
          />
        </>
      ) : null}
      {!collapsed ? (
        <>
          {editing ? (
            <form
              className="flex flex-col gap-2 mt-2.5 pt-2.5 border-t border-t-border"
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
                  {getAreaScanSpacingM(draft).toFixed(1)} m) while Recon is on.
                  Turn Recon off to edit manual line spacing.
                </p>
              ) : (
                <SliderField
                  label="Line spacing (m)"
                  value={draft.lineSpacingM ?? 6}
                  min={0.25}
                  max={20}
                  step={0.25}
                  unit="m"
                  onChange={(value) =>
                    previewArea({ ...draft, lineSpacingM: value })
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
                label="Scan padding (m)"
                value={draft.paddingM ?? 0}
                min={0}
                max={20}
                step={0.5}
                unit="m"
                onChange={(value) => previewArea({ ...draft, paddingM: value })}
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
              {area.scanLines?.length ?? 0} scan lanes · {spacingLabel} m
              spacing · {area.orientationDeg ?? 0}°
            </p>
          )}
          <TransferRow transfer={transfer} as="li" />
          {isFinalSequenceItem && !transfer ? (
            <EndMissionControl
              mission={mission}
              onUpdateMission={onUpdateMission}
              as="li"
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
