import {
  CameraIcon,
  DotsSixVerticalIcon,
  PlusIcon,
  ScanIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useState, type DragEvent, type KeyboardEvent } from "react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuTrigger,
} from "skytrack-ui/menu";
import { NumberField, NumberFieldInput } from "skytrack-ui/number-field";
import {
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipProvider,
  TooltipTrigger,
} from "skytrack-ui/tooltip";
import {
  type CameraActionKind,
  type SceneSelection,
  type StudioMission,
  type Waypoint,
} from "../../domain/mission-model";
import { SkyTooltip } from "../../shared/sky-tooltip";

export const ACTION_OPTIONS: { value: CameraActionKind; label: string }[] = [
  { value: "photo", label: "Photo capture" },
  { value: "video-start", label: "Camera Start recording" },
  { value: "video-stop", label: "Camera Stop recording" },
  { value: "lidar-scan", label: "LiDAR scan" },
];

const SEQUENCE_DRAG_MIME = "application/x-skytrack-sequence-item";
const SEQUENCE_LIST_ITEM_BASE_CLASS =
  "relative rounded-[0] first:[border-top-left-radius:var(--radius)] first:[border-top-right-radius:var(--radius)] last:[border-bottom-left-radius:var(--radius)] last:[border-bottom-right-radius:var(--radius)]";
export const SEQUENCE_LIST_ITEM_CLASS = `${SEQUENCE_LIST_ITEM_BASE_CLASS} mt-[-0.0625rem] first:mt-[0]`;
type SequenceDragItem =
  | { kind: "waypoint"; id: string; routeId: string }
  | { kind: "action"; id: string; waypointId: string; routeId: string };
export type SequenceDropPosition = "before" | "after";

function sequenceDropPosition(
  event: DragEvent<HTMLElement>,
): SequenceDropPosition {
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
}

function hasSequenceDrag(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes(SEQUENCE_DRAG_MIME);
}

function readSequenceDragItem(
  event: DragEvent<HTMLElement>,
): SequenceDragItem | null {
  try {
    const value = JSON.parse(
      event.dataTransfer.getData(SEQUENCE_DRAG_MIME),
    ) as SequenceDragItem;
    if (value && (value.kind === "waypoint" || value.kind === "action"))
      return value;
  } catch {
    // Ignore malformed or external drag payloads.
  }
  return null;
}

function writeSequenceDragItem(
  event: DragEvent<HTMLElement>,
  item: SequenceDragItem,
) {
  event.dataTransfer.setData(SEQUENCE_DRAG_MIME, JSON.stringify(item));
  event.dataTransfer.effectAllowed = "move";
}

export function ActionInsertAffordance(props: {
  wpId: string;
  actionIndex: number;
  wpSeq: number;
  onInsertAction: (
    wpId: string,
    actionIndex: number,
    kind: CameraActionKind,
  ) => void;
}) {
  const { wpId, actionIndex, wpSeq, onInsertAction } = props;
  return (
    <li
      className={`ms-insert-action-zone ${SEQUENCE_LIST_ITEM_BASE_CLASS} relative h-0 p-[0.4375rem_0] m-[-0.4375rem_0] flex items-center justify-start z-2 [list-style:none] overflow-visible [.ms-seq-list_>_&]:mt-[-0.4375rem]`}
      data-testid={`ms-insert-action-${wpId}-${actionIndex}`}
    >
      <div
        className=" absolute top-[50%] left-0 right-0 h-[0.125rem] transform-[translateY(-50%)] bg-(--primary) opacity-[0] pointer-events-none [transition:opacity_120ms_ease] [.ms-insert-action-zone:hover_&]:opacity-[0.75] [.ms-insert-action-zone:focus-within_&]:opacity-[0.75]"
        aria-hidden="true"
        data-testid="ms-insert-action-line"
      />
      <Menu>
        <SkyTooltip>
          <MenuTrigger
            className=" absolute top-0 left-[0.75rem] z-3 w-[1rem] h-[1rem] p-0 transform-[translate(0,-25%)] rounded-(--radius) bg-(--card) text-(--primary) [border:0.09375rem_solid_var(--primary)] inline-flex items-center justify-center opacity-[0] cursor-pointer [transition:opacity_120ms_ease,transform_120ms_ease] [.ms-insert-action-zone:hover_&]:opacity-[1] [.ms-insert-action-zone:hover_&]:transform-[scale(1.08)] [.ms-insert-action-zone:focus-within_&]:opacity-[1] [.ms-insert-action-zone:focus-within_&]:transform-[scale(1.08)]"
            aria-label={`Insert drone action at waypoint ${wpSeq} position ${actionIndex + 1}`}
          >
            <PlusIcon aria-hidden="true" className="w-[0.75rem] h-[0.75rem]" />
          </MenuTrigger>
        </SkyTooltip>
        <MenuPortal>
          <MenuPositioner side="bottom" align="center" sideOffset={4}>
            <MenuPopup className="ms-insert-action-menu">
              {ACTION_OPTIONS.map((option) => (
                <MenuItem
                  key={option.value}
                  onClick={() =>
                    onInsertAction(wpId, actionIndex, option.value)
                  }
                >
                  <span
                    className=" mr-[0.375rem] text-[0.8125rem]"
                    data-testid="ms-action-tag-mini"
                  >
                    {option.value === "lidar-scan" ? (
                      <ScanIcon
                        aria-hidden="true"
                        className="w-[0.875rem] h-[0.875rem] [vertical-align:-0.125rem]"
                      />
                    ) : (
                      <CameraIcon
                        aria-hidden="true"
                        className="w-[0.875rem] h-[0.875rem] [vertical-align:-0.125rem]"
                      />
                    )}
                  </span>
                  <span>{option.label}</span>
                </MenuItem>
              ))}
            </MenuPopup>
          </MenuPositioner>
        </MenuPortal>
      </Menu>
    </li>
  );
}

export function SequenceActionBadge({ kind }: { kind: CameraActionKind }) {
  const isLidar = kind === "lidar-scan";
  const description = {
    photo: "Captures a photo.",
    "video-start": "Starts camera recording.",
    "video-stop": "Stops camera recording.",
    "lidar-scan": "Scans the area with LiDAR.",
  }[kind];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
          <Badge
            count={
              isLidar ? (
                <ScanIcon aria-hidden="true" />
              ) : (
                <CameraIcon aria-hidden="true" />
              )
            }
            status="outline"
            size="sm"
          />
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="left" sideOffset={8}>
            <TooltipPopup>
              <TooltipArrow />
              {description}
            </TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SequenceActionRow(props: {
  action: {
    id: string;
    kind: CameraActionKind;
    label: string;
    gimbalPitchDeg?: number;
  };
  wpId: string;
  wpSeq: number;
  routeId: string;
  index: number;
  inheritedPitch: number;
  onMoveAction: (
    fromWpId: string,
    actionId: string,
    toWpId: string,
    toActionId?: string,
    position?: SequenceDropPosition,
  ) => void;
  onReorderWaypoint: (id: string, toIndex: number) => void;
  onDeleteAction: (wpId: string, actionId: string) => void;
  onSetPitch: (wpId: string, actionId: string, pitch: number) => void;
}) {
  const {
    action,
    wpId,
    wpSeq,
    routeId,
    index,
    inheritedPitch,
    onMoveAction,
    onReorderWaypoint,
    onDeleteAction,
    onSetPitch,
  } = props;
  const [dropPosition, setDropPosition] = useState<SequenceDropPosition | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    setDropPosition(null);
    const item = readSequenceDragItem(event);
    if (!item || item.routeId !== routeId) return;
    const position = sequenceDropPosition(event);
    if (item.kind === "waypoint") {
      onReorderWaypoint(item.id, index + (position === "after" ? 1 : 0));
    } else {
      onMoveAction(item.waypointId, item.id, wpId, action.id, position);
    }
  };

  return (
    <li
      className={`ms-seq-action-row ${SEQUENCE_LIST_ITEM_CLASS}${dropPosition ? ` is-drop-${dropPosition}` : ""}${dragging ? " is-grabbed" : ""}`}
      data-testid={`ms-action-row-${action.id}`}
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
      onDrop={handleDrop}
    >
      <SkyTooltip>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={`ms-drag-handle${dragging ? " text-(--primary) cursor-grabbing" : ""}`}
          draggable
          aria-label={`Drag to reorder ${action.label} at waypoint ${wpSeq}`}
          data-testid={`ms-action-handle-${action.id}`}
          onDragStart={(event) => {
            event.stopPropagation();
            writeSequenceDragItem(event, {
              kind: "action",
              id: action.id,
              waypointId: wpId,
              routeId,
            });
            setDragging(true);
          }}
          onDragEnd={() => {
            setDragging(false);
            setDropPosition(null);
          }}
        >
          <DotsSixVerticalIcon aria-hidden="true" />
        </Button>
      </SkyTooltip>
      <SequenceActionBadge kind={action.kind} />
      <span className="ms-action-label">{action.label}</span>
      {action.kind === "photo" ? (
        <label className="ms-action-camera-angle">
          <span className="text-(--muted-foreground)">Pitch</span>
          <NumberField
            value={action.gimbalPitchDeg ?? inheritedPitch}
            min={-90}
            max={0}
            step={1}
            onValueChange={(value) => {
              if (typeof value === "number" && Number.isFinite(value))
                onSetPitch(wpId, action.id, value);
            }}
          >
            <NumberFieldInput
              className="text-right"
              aria-label={`Gimbal pitch at waypoint ${wpSeq}`}
            />
          </NumberField>
          <span>°</span>
        </label>
      ) : null}
      <SkyTooltip>
        <Button
          size="icon-sm"
          variant="ghost"
          className="mr-[0.25rem]"
          aria-label={`Remove ${action.label} from waypoint ${wpSeq}`}
          onClick={() => onDeleteAction(wpId, action.id)}
        >
          <TrashIcon aria-hidden="true" />
        </Button>
      </SkyTooltip>
    </li>
  );
}

export function CompactAxisField({
  label,
  short,
  value,
  min,
  max,
  step,
  inputSize = "compact",
  className,
  axisClassName,
  onChange,
}: {
  label: string;
  short: string;
  value: number;
  min: number;
  max: number;
  step: number;
  inputSize?: "compact" | "xs";
  className?: string;
  axisClassName?: string;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  // Render-phase sync: an external value change (undo, reorder, reset) drops
  // any in-progress text so the field never shows a stale edit.
  const [syncedValue, setSyncedValue] = useState(value);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setText(null);
  }
  const display = text ?? String(value);
  const commit = (v: number) => {
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
  };
  return (
    <label className={["ms-axis-compact", className].filter(Boolean).join(" ")}>
      <span
        className={["ms-axis flex-[0_0_auto]", axisClassName]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        {short}
      </span>
      <NumberField
        value={value}
        min={min}
        max={max}
        step={step}
        className={
          " in-[.ms-data-right]:flex-[0_0_4rem] in-[.ms-data-right]:w-[4rem] flex-[1_1_auto] min-w-0 gap-0"
        }
        onValueChange={(next) => {
          if (typeof next === "number" && Number.isFinite(next)) {
            setText(String(next));
            commit(next);
          }
        }}
        data-testid="ms-axis-number-field"
      >
        <NumberFieldInput
          className="w-full min-w-0"
          size={inputSize}
          aria-label={label}
          value={display}
          onChange={(event) => {
            setText(event.target.value);
            commit(Number.parseFloat(event.currentTarget.value));
          }}
          onBlur={(event) => {
            setText(null);
            const v = Number.parseFloat(event.currentTarget.value);
            if (Number.isFinite(v)) {
              const clamped = Math.min(max, Math.max(min, v));
              if (clamped !== value) onChange(clamped);
            }
          }}
        />
      </NumberField>
    </label>
  );
}

/* Waypoint sequence row: one-line compact X/Y/Z direct-entry fields, pointer
   + keyboard drag reorder via the leading handle, and a trailing More menu
   whose only item is Delete. Keyboard reorder is preview-only until drop:
   arrow moves only change the rendered row order held by DesignPanel (no
   mission commit, no undo/redo history change); Space drops the preview as a
   single undoable reorder commit and Escape discards the preview without
   touching the mission or its history. Pointer drag commits once per drop.
   Reorder preserves waypoint identity and goes through the existing undo/redo
   history in the parent only on drop. */
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
        className=" flex-[1_1_0] flex flex-row gap-[0.75rem] pl-[0.25rem] min-w-0"
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
        className=" flex flex-row gap-[0.25rem] flex-[0_0_auto] self-center ml-auto"
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
