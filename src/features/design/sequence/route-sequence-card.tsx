import { ArrowCounterClockwiseIcon, GearIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Switch, SwitchThumb } from "skytrack-ui/switch";
import { CompactAxisField } from "../controls/compact-axis-field";
import type { SequenceDropPosition } from "./sequence-drag";
import type { AIModelCardModel } from "../../../ui/components/ai-model-card";
import { ReconCaptureSummary } from "../panels/reconnaissance-inspector";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import {
  getMissionRoutes,
  dist3,
  type ReconFlightSettings,
  type SceneSelection,
  type StudioMission,
  type MissionRouteMeta,
  type CameraActionKind,
} from "../../../domain/mission-model";
import type { DerivedTransfer } from "../../../domain/transfer-planner";
import { EndMissionControl } from "./sequence-transfer";
import { RouteWaypointList } from "./route-waypoint-list";
import { InspectorField } from "../controls/inspector-field";
import { RouteSequenceCardHeader } from "./route-sequence-card-header";

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
  aiModels: AIModelCardModel[];
  onImportAIModel: () => void;
  onDeleteAIModel: (modelId: string) => boolean;
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
  aiModels,
  onImportAIModel,
  onDeleteAIModel,
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
      (waypoint.routeId === route.id ||
        (!waypoint.routeId && routeIndex === 0)),
  );
  const routeLength = routeWaypoints
    .slice(1)
    .reduce(
      (sum, waypoint, index) => sum + dist3(routeWaypoints[index], waypoint),
      0,
    );
  const routeActions = routeWaypoints.reduce(
    (sum, waypoint) => sum + waypoint.actions.length,
    0,
  );
  const latestWaypoint = routeWaypoints.at(-1);
  const speed = route.targetSpeedMS ?? mission.targetSpeedMS;
  const speedRow = (
    <InspectorField
      label="Target speed"
      labelId={`ms-speed-label-${route.id}`}
      // labelClassName={
      //   worldType === "2D"
      //     ? "flex-1 min-w-0 text-xs leading-normal font-semibold text-(--muted-foreground)"
      //     : "min-w-0 text-xs leading-normal font-medium"
      // }
      className="flex-row items-center justify-between gap-3 min-h-10.5 py-2 px-3 text-(--muted-foreground) text-xs font-semibold"
    >
      <span className="flex shrink-0 items-center gap-1.5">
        <CompactAxisField
          label={`${route.label} target speed in meters per second`}
          short=""
          value={speed}
          min={0.5}
          max={15}
          step={0.5}
          inputSize="xs"
          inputWidth="fixed"
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
    </InspectorField>
  );

  return (
    <section
      className="border border-border rounded-(--radius) bg-(--background) p-0 gap-3 [&:has([data-selected=true])]:border-(--primary)"
      aria-label={`${route.label} sequence, ${routeWaypoints.length} waypoints, ${routeActions} actions`}
    >
      <RouteSequenceCardHeader
        route={route}
        routeIndex={routeIndex}
        routeLength={routeLength}
        waypointCount={routeWaypoints.length}
        actionCount={routeActions}
        latestWaypoint={latestWaypoint}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        onDeleteRoute={onDeleteRoute}
        onInsertActionAt={onInsertActionAt}
      />
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
          </InspectorField>
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
            sequenceId={route.id}
            sequenceLabel={route.label}
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
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
