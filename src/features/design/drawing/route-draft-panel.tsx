import type { Dispatch, SetStateAction } from "react";
import { PathIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import type { StudioMission } from "@/domain/mission-model";
import { DraftAxisInput } from "@/features/design/controls/design-controls";
import type { PendingMissionPoint } from "@/features/studio/use-drawing-session";

interface RouteDraftPanelProps {
  mission: StudioMission;
  pending: PendingMissionPoint[];
  routeDraftZ: number;
  setPending: Dispatch<SetStateAction<PendingMissionPoint[]>>;
  onCancel: () => void;
  onCommit: () => void;
}

export default function RouteDraftPanel({
  mission,
  pending,
  routeDraftZ,
  setPending,
  onCancel,
  onCommit,
}: RouteDraftPanelProps) {
  return (
    <section
      className="ms-inspector box-border flex h-full min-h-0 w-full min-w-0 flex-col gap-0 overflow-hidden"
      aria-label="New route"
    >
      <header
        className="sticky top-0 z-2 w-full min-w-0 border-b border-border bg-(--card) p-4"
        data-testid="ms-route-draft-head"
      >
        <h2 className="m-0 flex items-center gap-2 text-lg font-semibold">
          <PathIcon
            aria-hidden="true"
            className="w-4 h-4 text-foreground shrink-0"
          />
          New route
        </h2>
      </header>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4">
        <p className="m-0 text-sm text-muted-foreground leading-[1.5]">
          Click the map to add waypoints. Add at least 2 to create the route.
        </p>
        <p
          className="m-0 text-sm text-muted-foreground leading-[1.5]"
          role="status"
          aria-live="polite"
          data-testid="ms-route-draft-count"
        >
          {pending.length < 2
            ? `${pending.length} of 2 minimum waypoints. Add ${2 - pending.length} more to commit.`
            : `${pending.length} waypoints ready to commit.`}
        </p>
        {pending.length > 0 ? (
          <ol
            className="flex flex-col gap-1.5 m-0 p-0 [list-style:none]"
            aria-label="Pending route waypoints"
          >
            {pending.map((point, index) => {
              const pointZ = point.z ?? routeDraftZ;
              const sequence = mission.waypoints.length + index + 1;
              const updatePoint = (change: Partial<PendingMissionPoint>) => {
                setPending((previous) =>
                  previous.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, ...change } : item,
                  ),
                );
              };
              return (
                <li
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 min-w-0 p-2 border border-border rounded-(--radius) bg-(--background)"
                  key={`route-draft-${sequence}`}
                  data-testid="ms-route-draft-row"
                >
                  <span
                    className="grid place-items-center w-6 h-6 rounded-full bg-(--muted) text-foreground text-xs font-semibold"
                    data-testid="ms-route-draft-seq"
                  >
                    {sequence}
                  </span>
                  <span
                    className="grid grid-cols-3 gap-2 min-w-0 text-foreground text-[0.6875rem] [font-variant-numeric:tabular-nums]"
                    role="group"
                    aria-label={`Pending waypoint ${sequence} coordinates`}
                  >
                    <DraftAxisInput
                      label={`Pending waypoint ${sequence} X`}
                      axis="X"
                      value={point.x}
                      min={-2000}
                      max={2000}
                      precision={0.1}
                      onChange={(x) => updatePoint({ x })}
                    />
                    <DraftAxisInput
                      label={`Pending waypoint ${sequence} Y`}
                      axis="Y"
                      value={point.y}
                      min={-2000}
                      max={2000}
                      precision={0.1}
                      onChange={(y) => updatePoint({ y })}
                    />
                    <DraftAxisInput
                      label={`Pending waypoint ${sequence} altitude`}
                      axis="Z"
                      value={pointZ}
                      min={0}
                      max={Number.POSITIVE_INFINITY}
                      precision={0.01}
                      onChange={(z) => updatePoint({ z })}
                    />
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
      <footer
        className="sticky bottom-0 flex w-full min-w-0 justify-end gap-2 border-t border-border bg-card p-3"
        data-testid="ms-route-draft-actions"
      >
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={onCommit}
          disabled={pending.length < 2}
        >
          Commit route
        </Button>
      </footer>
    </section>
  );
}
