/* Sequence-row drag payloads and shared row classes.
   Payload shape and malformed-drag handling stay identical to the previous
   inline implementation in `sequence-controls.tsx`. */

import type { DragEvent } from "react";

const SEQUENCE_DRAG_MIME = "application/x-skytrack-sequence-item";
export const SEQUENCE_LIST_ITEM_BASE_CLASS =
  "relative rounded-[0] first:[border-top-left-radius:var(--radius)] first:[border-top-right-radius:var(--radius)] last:[border-bottom-left-radius:var(--radius)] last:[border-bottom-right-radius:var(--radius)]";
export const SEQUENCE_LIST_ITEM_CLASS = SEQUENCE_LIST_ITEM_BASE_CLASS;

export type SequenceDragItem =
  | { kind: "waypoint"; id: string; routeId: string }
  | { kind: "action"; id: string; waypointId: string; routeId: string };
export type SequenceDropPosition = "before" | "after";

export function sequenceDropPosition(
  event: DragEvent<HTMLElement>,
): SequenceDropPosition {
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
}

export function hasSequenceDrag(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes(SEQUENCE_DRAG_MIME);
}

export function readSequenceDragItem(
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

export function writeSequenceDragItem(
  event: DragEvent<HTMLElement>,
  item: SequenceDragItem,
) {
  event.dataTransfer.setData(SEQUENCE_DRAG_MIME, JSON.stringify(item));
  event.dataTransfer.effectAllowed = "move";
}
