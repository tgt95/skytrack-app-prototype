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
} from "../../domain/mission-model";
import type { DerivedTransfer } from "../../domain/transfer-planner";
import {
  ActionInsertAffordance,
  SequenceActionRow,
} from "./sequence-action-controls";
import { WaypointRow } from "./waypoint-row";
import {
  SEQUENCE_LIST_ITEM_CLASS,
  type SequenceDropPosition,
} from "./sequence-drag";
import { TransferRow } from "./sequence-transfer";

type Waypoint = StudioMission["waypoints"][number];

export function RouteWaypointList({
  routeId,
  routeLabel,
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
}: {
  routeId: string;
  routeLabel: string;
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
}) {
  return (
    <ol className="ms-seq-list">
      <li
        className={`ms-seq-row ${SEQUENCE_LIST_ITEM_CLASS} [.ms-seq-row:not(.ms-end,&)]:p-1 [.ms-seq-row&]:py-1.5 [.ms-seq-row&]:px-3 [.ms-seq-row&]:[flex-wrap:unset] [.ms-seq-row&]:bg-(--accent)`}
        aria-label={`Sequence start for ${routeLabel}`}
      >
        <Badge
          count="START"
          status="outline"
          size="sm"
          className="ms-seq-static-accent border-(--border) text-(--muted-foreground) text-[0.625rem]"
        />
        <span className="ms-seq-marker-label">Drone active</span>
      </li>
      {routeWaypoints.map((waypoint) => {
        const index = orderedWaypoints.findIndex(
          (item) => item.id === waypoint.id,
        );
        return (
          <Fragment key={waypoint.id}>
            <WaypointRow
              wp={waypoint}
              routeId={routeId}
              index={index}
              total={orderedWaypoints.length}
              grabbed={grabbedWaypointId === waypoint.id}
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
              onDeleteWaypoint={onDeleteWaypoint}
              onAnnounce={onAnnounce}
            />
            <ActionInsertAffordance
              wpId={waypoint.id}
              actionIndex={0}
              wpSeq={waypoint.seq}
              onInsertAction={onInsertActionAt}
            />
            {waypoint.actions.map((action, actionIndex) => (
              <Fragment key={action.id}>
                <SequenceActionRow
                  action={action}
                  wpId={waypoint.id}
                  wpSeq={waypoint.seq}
                  routeId={routeId}
                  index={index}
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
                />
              </Fragment>
            ))}
          </Fragment>
        );
      })}
      <TransferRow transfer={transfer} as="li" />
    </ol>
  );
}
