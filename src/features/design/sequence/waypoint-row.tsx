/* Waypoint sequence row: compact X/Y/Z direct-entry fields, pointer and
   keyboard drag reorder, and a trailing delete control. The row only renders
   and raises callbacks; the parent owns reorder preview and commits. */

import { DotsSixVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, type KeyboardEvent } from "react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import type {
  SceneSelection,
  StudioMission,
  Waypoint,
} from "../../../domain/mission-model";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import { CompactAxisField } from "../controls/compact-axis-field";
import {
  hasSequenceDrag,
  readSequenceDragItem,
  SEQUENCE_LIST_ITEM_CLASS,
  sequenceDropPosition,
  writeSequenceDragItem,
  type SequenceDropPosition,
} from "./sequence-drag";

/* Pointer drag commits once per drop. Keyboard reorder is preview-only until
   drop: arrow moves only change the rendered row order held by DesignPanel (no
   mission commit, no undo/redo history change); Space drops the preview as a
   single undoable reorder commit and Escape discards the preview without
   touching the mission or its history. Reorder preserves waypoint identity and
   goes through the existing undo/redo history in the parent only on drop. */
export function WaypointRow(props: {
  wp: Waypoint;
  sequenceId: string;
  generated?: boolean;
  index: number;
  total: number;
  isLastSequenceRow: boolean;
  grabbed: boolean;
  mission: StudioMission;
  selected: boolean;
  onSelect: (sel: SceneSelection | null) => void;
  onUpdateMission: (next: StudioMission, label?: string) => void;
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
  onMoveWorkflowStop?: (
    workflowId: string,
    waypointId: string,
    position: SequenceDropPosition,
  ) => void;
  onMoveWorkflowStart?: (
    workflowId: string,
    waypointId: string,
    position: SequenceDropPosition,
  ) => void;
  onDeleteWaypoint: (id: string) => void;
  onAnnounce: (text: string) => void;
}) {
  const {
    wp,
    sequenceId,
    generated = false,
    index,
    total,
    isLastSequenceRow,
    grabbed,
    mission,
    selected,
    onSelect,
    onUpdateMission,
    onPickUpWaypoint,
    onPreviewMoveWaypoint,
    onDropPreviewWaypoint,
    onCancelPreviewWaypoint,
    onReorderWaypoint,
    onMoveAction,
    onMoveWorkflowStart,
    onMoveWorkflowStop,
    onDeleteWaypoint,
  } = props;
  const [dropPosition, setDropPosition] = useState<SequenceDropPosition | null>(
    null,
  );

  const patchWaypoint = (patch: { x?: number; y?: number; z?: number }) => {
    onUpdateMission({
      ...mission,
      waypoints: mission.waypoints.map((w) =>
        w.id === wp.id ? { ...w, ...patch } : w,
      ),
    });
  };

  const onHandleKeyDown = (event: KeyboardEvent) => {
    // Handled here: stop propagation so the global Esc/tool shortcuts in
    // index.tsx do not double-handle the same keypress (e.g. clearing the
    // selection or overwriting the reorder announcement).
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      event.stopPropagation();
      if (grabbed) onDropPreviewWaypoint(wp.id);
      else onPickUpWaypoint(wp.id);
      return;
    }
    if (!grabbed) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      if (index > 0) onPreviewMoveWaypoint(wp.id, -1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      if (index < total - 1) onPreviewMoveWaypoint(wp.id, 1);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancelPreviewWaypoint(wp.id);
    }
  };

  return (
    <li
      className={[
        `${SEQUENCE_LIST_ITEM_CLASS} flex flex-wrap items-center gap-2 bg-(--card) min-w-0 border-b border-border`,
        selected ? "z-1 border-(--primary) bg-(--accent)" : "",
        grabbed ? "border-(--primary) border-dashed" : "",
        dropPosition === "before"
          ? "[box-shadow:inset_0_0.125rem_0_var(--primary)]"
          : "",
        dropPosition === "after"
          ? "[box-shadow:inset_0_-0.125rem_0_var(--primary)]"
          : "",
        isLastSequenceRow ? "border-b-0" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-selected={selected ? "true" : undefined}
      data-testid={`ms-wp-${wp.seq}`}
      data-wp-id={wp.id}
      onDragOver={(event) => {
        if (!hasSequenceDrag(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropPosition(sequenceDropPosition(event));
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDropPosition(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropPosition(null);
        const item = readSequenceDragItem(event);
        if (!item || item.routeId !== sequenceId) return;
        const position = sequenceDropPosition(event);
        if (item.kind === "waypoint") {
          if (!generated)
            onReorderWaypoint(item.id, index + (position === "after" ? 1 : 0));
        } else if (item.kind === "action") {
          onMoveAction(item.waypointId, item.id, wp.id);
        } else if (item.kind === "ai-workflow-start") {
          onMoveWorkflowStart?.(item.id, wp.id, position);
        } else {
          onMoveWorkflowStop?.(item.id, wp.id, position);
        }
      }}
    >
      <SkyTooltip>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={`flex-[0_0_auto] self-center inline-flex items-center justify-center w-5.5 h-8.5 text-sm border border-transparent rounded-(--radius) bg-transparent text-(--muted-foreground) cursor-grab touch-none hover:bg-(--accent) hover:text-(--foreground) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1${grabbed ? " text-(--primary) cursor-grabbing" : ""}`}
          disabled={generated}
          draggable={!generated}
          aria-label={
            generated
              ? `Generated waypoint ${wp.seq} cannot be reordered`
              : grabbed
                ? `Reorder waypoint ${wp.seq}, grabbed. Arrow keys move, Space drops, Escape cancels.`
                : `Reorder waypoint ${wp.seq}. Press Space to pick up.`
          }
          aria-grabbed={grabbed}
          data-testid={`ms-wp-handle-${wp.seq}`}
          onDragStart={(event) => {
            event.stopPropagation();
            writeSequenceDragItem(event, {
              kind: "waypoint",
              id: wp.id,
              routeId: sequenceId,
            });
          }}
          onDragEnd={() => setDropPosition(null)}
          onKeyDown={onHandleKeyDown}
        >
          <DotsSixVerticalIcon aria-hidden="true" />
        </Button>
      </SkyTooltip>
      <button
        type="button"
        className="flex-[0_0_auto] min-w-7.5 p-0 inline-flex items-center justify-center bg-transparent cursor-pointer focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1"
        aria-pressed={selected}
        aria-label={`Select waypoint ${wp.seq}`}
        onClick={() =>
          onSelect(selected ? null : { kind: "waypoint", id: wp.id })
        }
      >
        <Badge
          count={wp.seq}
          status="default"
          className="w-full"
          // className="h-7 min-w-7.5 rounded-(--radius) px-1 text-xs font-semibold normal-case tracking-normal text-(--muted-foreground)"
        />
      </button>
      <div
        className="flex-[1_1_0] flex flex-row gap-3 pl-1 min-w-0"
        data-testid="ms-seq-fields"
      >
        <CompactAxisField
          label={`Waypoint ${wp.seq} X`}
          short="X"
          value={wp.x}
          className="flex-[1_1_0] min-w-0"
          min={-500}
          max={500}
          step={0.5}
          disabled={generated}
          onChange={(v) => patchWaypoint({ x: v })}
        />
        <CompactAxisField
          label={`Waypoint ${wp.seq} Y`}
          short="Y"
          value={wp.y}
          className="flex-[1_1_0] min-w-0"
          min={-500}
          max={500}
          step={0.5}
          disabled={generated}
          onChange={(v) => patchWaypoint({ y: v })}
        />
        <CompactAxisField
          label={`Waypoint ${wp.seq} altitude`}
          short="Z"
          value={wp.z}
          className="flex-[1_1_0] min-w-0"
          min={0}
          max={150}
          step={0.5}
          onChange={(v) => patchWaypoint({ z: v })}
        />
      </div>
      <div
        className="flex flex-row gap-1 flex-[0_0_auto] self-center ml-auto"
        data-testid="ms-seq-actions"
      >
        <SkyTooltip>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={
              generated
                ? `Generated waypoint ${wp.seq} cannot be deleted`
                : `Delete waypoint ${wp.seq}`
            }
            data-testid={`ms-wp-delete-${wp.seq}`}
            disabled={generated}
            onClick={() => onDeleteWaypoint(wp.id)}
          >
            <TrashIcon aria-hidden="true" />
          </Button>
        </SkyTooltip>
      </div>
    </li>
  );
}
