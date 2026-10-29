/* Route sequence list: START marker, waypoint and action rows with insert
   affordances, and the transfer row. Route header, speed, recon, and END stay
   in the Route card so DOM order and final-sequence placement are unchanged. */

import { Fragment } from "react";
import { Badge } from "skytrack-ui/badge";
import type {
  CameraActionKind,
  ReconFlightSettings,
  SceneSelection,
  StudioMission,
} from "../../../domain/mission-model";
import type { AIModelCardModel } from "../../../ui/components/ai-model-card";
import { AIWorkflowCard, AIWorkflowStopRow } from "./ai-workflow-card";
import type { DerivedTransfer } from "../../../domain/transfer-planner";
import {
  ActionInsertAffordance,
  SequenceActionRow,
} from "./sequence-action-controls";
import { WaypointRow } from "./waypoint-row";
import { createAIWorkflowAt } from "./ai-workflow-utils";
import {
  SEQUENCE_LIST_ITEM_CLASS,
  type SequenceDropPosition,
} from "./sequence-drag";
import { TransferRow } from "./sequence-transfer";

type Waypoint = StudioMission["waypoints"][number];

export function RouteWaypointList({
  sequenceId,
  sequenceLabel,
  routeWaypoints,
  orderedWaypoints,
  mission,
  recon,
  grabbedWaypointId,
  selected,
  transfer,
  onSelect,
  onUpdateMission,
  onInsertActionAt,
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
  generatedWaypoints = false,
  aiModels,
  onImportAIModel,
  onDeleteAIModel,
}: {
  sequenceId: string;
  sequenceLabel: string;
  routeWaypoints: Waypoint[];
  orderedWaypoints: Waypoint[];
  mission: StudioMission;
  recon: ReconFlightSettings;
  grabbedWaypointId: string | null;
  selected: SceneSelection | null;
  transfer?: DerivedTransfer;
  onSelect: (selection: SceneSelection | null) => void;
  onUpdateMission: (next: StudioMission, label?: string) => void;
  onInsertActionAt: (
    wpId: string,
    actionIndex: number,
    kind: CameraActionKind,
  ) => void;
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
  generatedWaypoints?: boolean;
  aiModels: AIModelCardModel[];
  onImportAIModel: () => void;
  onDeleteAIModel: (modelId: string) => boolean;
}) {
  const lastRouteWaypoint = routeWaypoints.at(-1);
  const workflowSequenceId = generatedWaypoints
    ? sequenceId.replace(/^area:/, "")
    : sequenceId;
  const workflowFor = (waypointId: string, afterActionId: string | null) =>
    (mission.aiWorkflows ?? []).filter(
      (workflow) =>
        workflow.sequenceId === workflowSequenceId &&
        workflow.startWaypointId === waypointId &&
        workflow.startAfterActionId === afterActionId,
    );
  const renderWorkflowsAt = (
    waypoint: Waypoint,
    afterActionId: string | null,
  ) =>
    workflowFor(waypoint.id, afterActionId).map((workflow) => (
      <AIWorkflowCard
        key={workflow.id}
        workflow={workflow}
        waypoints={routeWaypoints}
        models={aiModels}
        sequenceId={sequenceId}
        onChange={(next) =>
          onUpdateMission(
            {
              ...mission,
              aiWorkflows: (mission.aiWorkflows ?? []).map((item) =>
                item.id === workflow.id ? next : item,
              ),
            },
            `${workflow.label} updated.`,
          )
        }
        onImportModel={onImportAIModel}
        onDeleteModel={(modelId) => {
          if (!onDeleteAIModel(modelId)) return false;
          onUpdateMission(
            {
              ...mission,
              aiWorkflows: (mission.aiWorkflows ?? []).map((item) =>
                item.modelId === modelId ? { ...item, modelId: null } : item,
              ),
            },
            "Uploaded AI model removed from this browser.",
          );
          return true;
        }}
        onDelete={() =>
          onUpdateMission(
            {
              ...mission,
              aiWorkflows: (mission.aiWorkflows ?? []).filter(
                (item) => item.id !== workflow.id,
              ),
            },
            `${workflow.label} removed.`,
          )
        }
      />
    ));
  const renderWorkflowStopsAt = (waypoint: Waypoint) =>
    (mission.aiWorkflows ?? [])
      .filter(
        (workflow) =>
          workflow.sequenceId === workflowSequenceId &&
          (workflow.stopWaypointId === waypoint.id ||
            (!workflow.stopWaypointId &&
              waypoint.id === routeWaypoints.at(-1)?.id)),
      )
      .map((workflow) => (
        <AIWorkflowStopRow
          key={`${workflow.id}-stop`}
          workflow={workflow}
          waypoints={routeWaypoints}
          sequenceId={sequenceId}
          waypointId={waypoint.id}
          onMoveAction={onMoveAction}
        />
      ));
  const moveWorkflowStart = (
    workflowId: string,
    targetWaypointId: string,
    position: SequenceDropPosition,
  ) => {
    const workflow = (mission.aiWorkflows ?? []).find(
      (item) =>
        item.id === workflowId && item.sequenceId === workflowSequenceId,
    );
    if (!workflow) return;
    const targetIndex = routeWaypoints.findIndex(
      (waypoint) => waypoint.id === targetWaypointId,
    );
    if (targetIndex < 0) return;
    const startIndex = Math.max(
      0,
      targetIndex - (position === "before" ? 1 : 0),
    );
    const startWaypoint = routeWaypoints[startIndex];
    if (!startWaypoint) return;
    const stopIndex = routeWaypoints.findIndex(
      (waypoint) => waypoint.id === workflow.stopWaypointId,
    );
    const nextStopWaypointId =
      stopIndex < startIndex ? startWaypoint.id : workflow.stopWaypointId;
    if (
      workflow.startWaypointId === startWaypoint.id &&
      workflow.startAfterActionId === null &&
      nextStopWaypointId === workflow.stopWaypointId
    )
      return;
    onUpdateMission(
      {
        ...mission,
        aiWorkflows: (mission.aiWorkflows ?? []).map((item) =>
          item.id === workflow.id
            ? {
                ...item,
                startWaypointId: startWaypoint.id,
                startAfterActionId: null,
                stopWaypointId: nextStopWaypointId,
              }
            : item,
        ),
      },
      `${workflow.label} start moved to waypoint ${startWaypoint.seq}.`,
    );
  };
  const moveWorkflowStop = (
    workflowId: string,
    targetWaypointId: string,
    position: SequenceDropPosition,
  ) => {
    const workflow = (mission.aiWorkflows ?? []).find(
      (item) =>
        item.id === workflowId && item.sequenceId === workflowSequenceId,
    );
    if (!workflow) return;
    const targetIndex = routeWaypoints.findIndex(
      (waypoint) => waypoint.id === targetWaypointId,
    );
    const startIndex = routeWaypoints.findIndex(
      (waypoint) => waypoint.id === workflow.startWaypointId,
    );
    if (targetIndex < 0 || startIndex < 0) return;
    const stopIndex = Math.max(
      startIndex,
      targetIndex - (position === "before" ? 1 : 0),
    );
    const stopWaypoint = routeWaypoints[stopIndex];
    if (!stopWaypoint || stopWaypoint.id === workflow.stopWaypointId) return;
    onUpdateMission(
      {
        ...mission,
        aiWorkflows: (mission.aiWorkflows ?? []).map((item) =>
          item.id === workflow.id
            ? { ...item, stopWaypointId: stopWaypoint.id }
            : item,
        ),
      },
      `${workflow.label} stop moved to waypoint ${stopWaypoint.seq}.`,
    );
  };
  const insertAIWorkflowAt = (wpId: string, actionIndex: number) => {
    const waypointIndex = routeWaypoints.findIndex(
      (waypoint) => waypoint.id === wpId,
    );
    const waypoint = routeWaypoints[waypointIndex];
    if (!waypoint) return;
    const workflow = createAIWorkflowAt({
      sequenceId: workflowSequenceId,
      sequenceType: generatedWaypoints ? "area" : "route",
      waypoint,
      nextWaypointId: routeWaypoints[waypointIndex + 1]?.id,
      actionIndex,
      existingWorkflows: mission.aiWorkflows ?? [],
    });
    onUpdateMission(
      { ...mission, aiWorkflows: [...(mission.aiWorkflows ?? []), workflow] },
      `${workflow.label} added.`,
    );
  };

  return (
    <ol className="list-none m-0 p-0 flex flex-col gap-0">
      <li
        className={`${SEQUENCE_LIST_ITEM_CLASS} flex flex-wrap items-center gap-2 bg-(--accent) min-w-0 py-1.5 px-3 flex-nowrap [list-style:none] border-b border-border last:border-b-0`}
        aria-label={`Sequence start for ${sequenceLabel}`}
      >
        <Badge count="START" status="outline" />
        <span className="flex-[1_1_auto] min-w-0 text-sm text-(--muted-foreground)">
          Drone active
        </span>
      </li>
      {routeWaypoints.map((waypoint) => {
        const index = orderedWaypoints.findIndex(
          (item) => item.id === waypoint.id,
        );
        return (
          <Fragment key={waypoint.id}>
            <WaypointRow
              wp={waypoint}
              sequenceId={sequenceId}
              generated={generatedWaypoints}
              index={index}
              total={orderedWaypoints.length}
              grabbed={grabbedWaypointId === waypoint.id}
              isLastSequenceRow={
                !transfer &&
                waypoint.id === lastRouteWaypoint?.id &&
                waypoint.actions.length === 0
              }
              mission={mission}
              selected={
                selected?.kind === "waypoint" && selected.id === waypoint.id
              }
              onSelect={onSelect}
              onUpdateMission={onUpdateMission}
              onPickUpWaypoint={onPickUpWaypoint}
              onPreviewMoveWaypoint={onPreviewMoveWaypoint}
              onDropPreviewWaypoint={onDropPreviewWaypoint}
              onCancelPreviewWaypoint={onCancelPreviewWaypoint}
              onReorderWaypoint={onReorderWaypoint}
              onMoveAction={onMoveAction}
              onMoveWorkflowStart={moveWorkflowStart}
              onMoveWorkflowStop={moveWorkflowStop}
              onDeleteWaypoint={onDeleteWaypoint}
              onAnnounce={onAnnounce}
            />
            <ActionInsertAffordance
              wpId={waypoint.id}
              actionIndex={0}
              wpSeq={waypoint.seq}
              onInsertAction={onInsertActionAt}
              onInsertAIWorkflow={insertAIWorkflowAt}
            />
            {renderWorkflowsAt(waypoint, null)}
            {waypoint.actions.map((action, actionIndex) => (
              <Fragment key={action.id}>
                <SequenceActionRow
                  action={action}
                  wpId={waypoint.id}
                  wpSeq={waypoint.seq}
                  sequenceId={sequenceId}
                  index={index}
                  isLastSequenceRow={
                    !transfer &&
                    waypoint.id === lastRouteWaypoint?.id &&
                    actionIndex === waypoint.actions.length - 1
                  }
                  onMoveAction={onMoveAction}
                  onReorderWaypoint={onReorderWaypoint}
                  onDeleteAction={onDeleteAction}
                  inheritedPitch={recon.gimbalPitchDeg}
                  onSetPitch={onSetActionPitch}
                />
                <ActionInsertAffordance
                  wpId={waypoint.id}
                  actionIndex={actionIndex + 1}
                  wpSeq={waypoint.seq}
                  onInsertAction={onInsertActionAt}
                  onInsertAIWorkflow={insertAIWorkflowAt}
                />
                {renderWorkflowsAt(waypoint, action.id)}
              </Fragment>
            ))}
            {renderWorkflowStopsAt(waypoint)}
          </Fragment>
        );
      })}
      <TransferRow transfer={transfer} as="li" />
    </ol>
  );
}
