import {
  ArrowCounterClockwiseIcon,
  DotsThreeIcon,
  GearIcon,
  GitMergeIcon,
  HandIcon,
  PathIcon,
  RulerIcon,
  CaretDownIcon,
  CaretUpIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
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
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import { CompactAxisField } from "./compact-axis-field";
import { ACTION_OPTIONS } from "./sequence-action-controls";
import type { SequenceDropPosition } from "./sequence-drag";
import { ReconCaptureSummary } from "./reconnaissance-inspector";
import { SkyTooltip } from "../../ui/components/sky-tooltip";
import {
  getMissionRoutes,
  dist3,
  type ReconFlightSettings,
  type SceneSelection,
  type StudioMission,
  type MissionRouteMeta,
  type CameraActionKind,
} from "../../domain/mission-model";
import type { DerivedTransfer } from "../../domain/transfer-planner";
import { EndMissionControl } from "./sequence-transfer";
import { RouteWaypointList } from "./route-waypoint-list";

type Waypoint = StudioMission["waypoints"][number];

export interface RouteSequenceCardProps {
  route: MissionRouteMeta;
  routeIndex: number;
  mission: StudioMission;
  orderedWaypoints: Waypoint[];
  worldType: "2D" | "3D";
  recon: ReconFlightSettings;
  collapsed: boolean;
  grabbedWaypointId: string | null;
  selected: SceneSelection | null;
  transfer?: DerivedTransfer;
  isFinalSequenceItem: boolean;
  onToggleCollapsed: () => void;
  onToggleRecon: () => void;
  onOpenRecon: () => void;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  onDeleteRoute: (routeId: string) => void;
  onInsertActionAt: (
    wpId: string,
    actionIndex: number,
    kind: CameraActionKind,
  ) => void;
  onSelect: (selection: SceneSelection | null) => void;
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
  onSetActionPitch: (wpId: string, actionId: string, pitch: number) => void;
  onAnnounce: (message: string) => void;
}

export default function RouteSequenceCard({
  route,
  routeIndex,
  mission,
  orderedWaypoints,
  worldType,
  recon,
  collapsed,
  grabbedWaypointId,
  selected,
  transfer,
  isFinalSequenceItem,
  onToggleCollapsed,
  onToggleRecon,
  onOpenRecon,
  onUpdateMission,
  onDeleteRoute,
  onInsertActionAt,
  onSelect,
  onPickUpWaypoint,
  onPreviewMoveWaypoint,
  onDropPreviewWaypoint,
  onCancelPreviewWaypoint,
  onReorderWaypoint,
  onMoveAction,
  onDeleteWaypoint,
  onDeleteAction,
  onSetActionPitch,
  onAnnounce,
}: RouteSequenceCardProps) {
  const routeWaypoints = orderedWaypoints.filter(
    (waypoint) =>
      !waypoint.generatedByArea &&
      !waypoint.generatedByAvoid &&
      (waypoint.routeId === route.id || (!waypoint.routeId && routeIndex === 0)),
  );
  const routeLength = routeWaypoints
    .slice(1)
    .reduce((sum, waypoint, index) => sum + dist3(routeWaypoints[index], waypoint), 0);
  const routeActions = routeWaypoints.reduce((sum, waypoint) => sum + waypoint.actions.length, 0);
  const latestWaypoint = routeWaypoints.at(-1);
  const speed = route.targetSpeedMS ?? mission.targetSpeedMS;
  const speedRow = (
    <div className={worldType === "2D" ? "ms-recon-control-row ms-target-speed-row" : "ms-data-row"}>
      <span id={`ms-speed-label-${route.id}`} className={worldType === "2D" ? "flex-1 min-w-0" : undefined}>
        Target speed
      </span>
      <span className="ms-data-right flex items-center gap-1.5 min-w-0 [.ms-target-speed-row_>_&]:flex-[0_0_auto]">
        <CompactAxisField
          label={`${route.label} target speed in meters per second`}
          short=""
          value={speed}
          min={0.5}
          max={15}
          step={0.5}
          inputSize="xs"
          axisClassName="hidden"
          onChange={(value) =>
            onUpdateMission({
              ...mission,
              routes: getMissionRoutes(mission).map((item) =>
                item.id === route.id
                  ? {
                      ...item,
                      targetSpeedMS: Math.min(15, Math.max(0.5, value)),
                    }
                  : item,
              ),
            })
          }
        />
        <span
          className=" text-xs text-(--muted-foreground)"
          aria-hidden="true"
          data-testid="ms-unit"
        >
          m/s
        </span>
        <SkyTooltip>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Reset ${route.label} target speed to mission default`}
            title="Reset to mission default speed"
            onClick={() =>
              onUpdateMission(
                {
                  ...mission,
                  routes: getMissionRoutes(mission).map((item) => {
                    if (item.id !== route.id) return item;
                    const { targetSpeedMS, ...rest } = item;
                    void targetSpeedMS;
                    return rest;
                  }),
                },
                `${route.label} target speed reset to mission default.`,
              )
            }
          >
            <ArrowCounterClockwiseIcon aria-hidden="true" />
          </Button>
        </SkyTooltip>
      </span>
    </div>
  );

  return (
    <section
      className="ms-card ms-object-block"
      aria-label={`${route.label} sequence, ${routeWaypoints.length} waypoints, ${routeActions} actions`}
    >
      <div className="ms-route-head flex-row! items-center gap-2 min-w-0 p-3 max-sm:flex-wrap">
        <div className="ms-route-title-group">
          <PathIcon aria-hidden="true" className="ms-route-icon" />
          <span className="ms-route-name flex-[0_0_auto] min-w-0 whitespace-nowrap">
            {route.label}
          </span>
        </div>
        <span className="ms-route-stats block flex-[1_1_0] ml-auto min-w-0 overflow-hidden text-right text-ellipsis whitespace-nowrap max-sm:ml-0 max-sm:text-left">
          <SkyTooltip>
            <span
              className="ms-stat"
              title="Waypoint-to-waypoint route length; excludes Home launch and return, transfers, and Area scan legs."
              aria-label={`Waypoint-to-waypoint route length ${routeLength.toFixed(1)} meters; excludes Home launch and return, transfers, and Area scan legs`}
            >
              <RulerIcon
                aria-hidden="true"
                className="w-3.5 h-3.5"
              />
              {routeLength.toFixed(1)} m
            </span>
          </SkyTooltip>
          <span aria-hidden="true">·</span>
          <SkyTooltip>
            <span
              className="ms-stat"
              aria-label={`${routeWaypoints.length} waypoints in ${route.label}`}
            >
              <GitMergeIcon
                aria-hidden="true"
                className="w-3.5 h-3.5"
              />
              {routeWaypoints.length}
            </span>
          </SkyTooltip>
          <span aria-hidden="true">·</span>
          <SkyTooltip>
            <span
              className="ms-stat"
              aria-label={`${routeActions} drone actions in ${route.label}`}
            >
              <HandIcon
                aria-hidden="true"
                className="w-3.5 h-3.5"
              />
              {routeActions}
            </span>
          </SkyTooltip>
        </span>
        <div className="ms-route-actions">
          <Menu>
            <SkyTooltip>
              <MenuTrigger
                aria-label={`More options for ${route.label}`}
                className="border-0 bg-transparent p-0"
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <DotsThreeIcon aria-hidden="true" />
              </MenuTrigger>
            </SkyTooltip>
            <MenuPortal>
              <MenuPositioner side="bottom" align="end" sideOffset={4}>
                <MenuPopup>
                  {latestWaypoint ? (
                    <MenuSubmenuRoot>
                      <MenuSubmenuTrigger
                        aria-label={`Add action to latest waypoint in ${route.label}`}
                      >
                        Add action
                      </MenuSubmenuTrigger>
                      <MenuPortal>
                        <MenuPositioner
                          side="right"
                          align="start"
                          sideOffset={4}
                        >
                          <MenuPopup className="ms-insert-action-menu">
                            {ACTION_OPTIONS.map((option) => (
                              <MenuItem
                                key={option.value}
                                onClick={() =>
                                  onInsertActionAt(
                                    latestWaypoint.id,
                                    latestWaypoint.actions.length,
                                    option.value,
                                  )
                                }
                              >
                                {option.label}
                              </MenuItem>
                            ))}
                          </MenuPopup>
                        </MenuPositioner>
                      </MenuPortal>
                    </MenuSubmenuRoot>
                  ) : (
                    <MenuItem disabled>Add action</MenuItem>
                  )}
                  <MenuSeparator />
                  <MenuItem onClick={() => onDeleteRoute(route.id)}>
                    Delete route
                  </MenuItem>
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
                collapsed ? `Expand ${route.label}` : `Collapse ${route.label}`
              }
              data-testid={`ms-collapse-route-${routeIndex}`}
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
        <div className="ms-recon-control-group">
          <div className="ms-recon-control-row pt-0">
            <span className="flex-1 min-w-0">Reconnaissance flight</span>
            <Switch
              className="flex-[0_0_auto]"
              checked={recon.enabled}
              size="sm"
              aria-label={`${route.label} reconnaissance flight`}
              onCheckedChange={onToggleRecon}
            >
              <SwitchThumb size="sm" />
            </Switch>
            <SkyTooltip>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Reconnaissance settings for ${route.label}`}
                onClick={onOpenRecon}
              >
                <GearIcon aria-hidden="true" />
              </Button>
            </SkyTooltip>
          </div>
          {!collapsed ? speedRow : null}
        </div>
      ) : null}
      {worldType === "2D" && recon.enabled ? (
        <ReconCaptureSummary
          waypoints={routeWaypoints}
          settings={recon}
          pathLength={routeLength}
        />
      ) : null}
      {!collapsed ? (
        <>
          {worldType === "2D" ? null : speedRow}
          <RouteWaypointList
            routeId={route.id}
            routeLabel={route.label}
            routeWaypoints={routeWaypoints}
            orderedWaypoints={orderedWaypoints}
            mission={mission}
            recon={recon}
            grabbedWaypointId={grabbedWaypointId}
            selected={selected}
            transfer={transfer}
            onSelect={onSelect}
            onUpdateMission={onUpdateMission}
            onInsertActionAt={onInsertActionAt}
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
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
