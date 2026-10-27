/* Waypoint sequence row: compact X/Y/Z direct-entry fields, pointer and
   keyboard drag reorder, and a trailing delete control. The row only renders
   and raises callbacks; the parent owns reorder preview and commits. */

import { DotsSixVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, type KeyboardEvent } from "react";
import { Button } from "skytrack-ui/button";
import type {
  SceneSelection,
  StudioMission,
  Waypoint,
} from "../../domain/mission-model";
import { SkyTooltip } from "../../ui/components/sky-tooltip";
import { CompactAxisField } from "./compact-axis-field";
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
  routeId: string;
  index: number;
  total: number;
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
  onDeleteWaypoint: (id: string) => void;
  onAnnounce: (text: string) => void;
}) {
  const {
    wp,
    routeId,
    index,
    total,
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
        `ms-seq-row ${SEQUENCE_LIST_ITEM_CLASS}${selected ? " is-selected" : ""}${dropPosition ? ` is-drop-${dropPosition}` : ""}${grabbed ? " is-grabbed" : ""}`,
        "[.ms-object-block&:where(.is-selected)]:border-(--primary) [.ms-seq-list_>_li&:where(.is-selected)]:z-1 [.ms-seq-row&:where(.is-selected)]:border-(--primary) [.ms-seq-row&:where(.is-selected)]:bg-(--accent) [.ms-zone-row&:where(.is-selected)]:border-(--primary) [.ms-zone-row&:where(.is-selected)]:bg-(--accent)",
      ]
        .filter(Boolean)
        .join(" ")}
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
        if (!item || item.routeId !== routeId) return;
        const position = sequenceDropPosition(event);
        if (item.kind === "waypoint") {
          onReorderWaypoint(item.id, index + (position === "after" ? 1 : 0));
        } else {
          onMoveAction(item.waypointId, item.id, wp.id);
        }
      }}
    >
      <SkyTooltip>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={`ms-drag-handle${grabbed ? " text-(--primary) cursor-grabbing" : ""}`}
          draggable
          aria-label={
            grabbed
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
              routeId,
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
        className="ms-seq-badge  [.ms-seq-badge&]:cursor-pointer"
        aria-pressed={selected}
        aria-label={`Select waypoint ${wp.seq}`}
        onClick={() =>
          onSelect(selected ? null : { kind: "waypoint", id: wp.id })
        }
      >
        {wp.seq}
      </button>
      <div
        className=" flex-[1_1_0] flex flex-row gap-3 pl-1 min-w-0"
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
        className=" flex flex-row gap-1 flex-[0_0_auto] self-center ml-auto"
        data-testid="ms-seq-actions"
      >
        <SkyTooltip>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Delete waypoint ${wp.seq}`}
            data-testid={`ms-wp-delete-${wp.seq}`}
            onClick={() => onDeleteWaypoint(wp.id)}
          >
            <TrashIcon aria-hidden="true" />
          </Button>
        </SkyTooltip>
      </div>
    </li>
  );
}
