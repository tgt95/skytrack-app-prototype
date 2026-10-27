import type { Dispatch, SetStateAction } from "react";
import { Button } from "skytrack-ui/button";
import type { StudioMission } from "../../../domain/mission-model";
import { DraftAxisInput } from "../controls/design-controls";
import type { PendingMissionPoint } from "../../studio/use-drawing-session";

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
      className=" flex flex-col gap-3 min-w-0 py-3.5 px-3"
      aria-label="Route draft"
    >
      <header className=" min-w-0" data-testid="ms-route-draft-head">
        <div>
          <h2 className="heading ms-inspector-title">Route draft</h2>
          <p className="ms-inspector-sub mt-1.5 leading-[1.45]">
            Click the scene to add waypoints. Add at least 2, then press Enter
            to commit. Press Escape to cancel.
          </p>
        </div>
      </header>
      <p
        className=" m-0 text-(--muted-foreground) text-xs leading-[1.4]"
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
          className=" flex flex-col gap-1.5 m-0 p-0 [list-style:none] [.ms-seq-row&]:py-1.5 [.ms-seq-row&]:px-3 [.ms-seq-row&]:[flex-wrap:unset] [.ms-seq-row&]:bg-(--accent)"
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
                className=" grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 min-w-0 p-2 border border-border rounded-(--radius) bg-(--background)"
                key={`route-draft-${sequence}`}
                data-testid="ms-route-draft-row"
              >
                <span
                  className=" grid place-items-center w-6 h-6 rounded-[50%] bg-(--muted) text-(--foreground) text-xs font-semibold"
                  data-testid="ms-route-draft-seq"
                >
                  {sequence}
                </span>
                <span
                  className="grid grid-cols-3 gap-2 min-w-0 text-(--foreground) text-[0.6875rem] [font-variant-numeric:tabular-nums]"
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
      <div
        className=" flex flex-wrap gap-2 pt-0.5"
        data-testid="ms-route-draft-actions"
      >
        <Button
          className="grow shrink basis-27.5 min-w-0"
          size="sm"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="grow shrink basis-27.5 min-w-0"
          size="sm"
          variant="default"
          onClick={() => onCommit()}
          disabled={pending.length < 2}
        >
          Commit route
        </Button>
      </div>
    </section>
  );
}
