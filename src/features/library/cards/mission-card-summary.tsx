import {
  GitMergeIcon,
  HandIcon,
  ImagesIcon,
  RulerIcon,
} from "@phosphor-icons/react";
import { SkyTooltip } from "@/ui/components/sky-tooltip";
import type { LibMission } from "@/features/library/database/store";
import { roundTo } from "@/shared/number-utils";
import {
  formatArea,
  formatDistance,
  useMeasurementSystem,
} from "@/shared/measurement-units";
import {
  actionCount,
  missionFromSnapshot,
  polygonAreaM2,
  routeLengthM,
  type StudioMission,
} from "@/domain/mission-model";

export function MissionCardSummary({
  mission,
}: {
  mission: Pick<LibMission, "missionData" | "worldType">;
}) {
  const unitSystem = useMeasurementSystem();
  if (!mission.missionData) return null;

  let snapshot: StudioMission;
  try {
    snapshot = missionFromSnapshot(mission.missionData);
  } catch {
    return null;
  }

  const areaM2 = roundTo(
    snapshot.areas.reduce(
      (total, area) => total + polygonAreaM2(area.points),
      0,
    ),
  );
  const waypointCount = snapshot.waypoints.length;
  const actions = actionCount(snapshot);
  const photos = snapshot.waypoints.reduce(
    (total, waypoint) =>
      total +
      waypoint.actions.filter((action) => action.kind === "photo").length,
    0,
  );
  const worldType = snapshot.worldType ?? mission.worldType;
  const hasArea = areaM2 > 0;
  const lengthM = hasArea ? 0 : roundTo(routeLengthM(snapshot));

  return (
    <span
      className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground"
      data-testid="ms-lib-card-summary"
      aria-label="Mission summary"
    >
      {hasArea || lengthM > 0 ? (
        <SkyTooltip>
          <span
            className="inline-flex items-center gap-1"
            aria-label={
              hasArea
                ? formatArea(areaM2, unitSystem)
                : formatDistance(lengthM, unitSystem, 0)
            }
            title={hasArea ? "Area" : "Route length"}
          >
            <RulerIcon aria-hidden="true" className="size-4" />
            {hasArea
              ? formatArea(areaM2, unitSystem)
              : formatDistance(lengthM, unitSystem, 0)}
          </span>
        </SkyTooltip>
      ) : null}
      {hasArea || lengthM > 0 ? <span aria-hidden="true">·</span> : null}
      <SkyTooltip>
        <span
          className="inline-flex items-center gap-1"
          aria-label={`${waypointCount} waypoints`}
          title="Waypoints"
        >
          <GitMergeIcon aria-hidden="true" className="size-4" />
          {waypointCount}
        </span>
      </SkyTooltip>
      <span aria-hidden="true">·</span>
      <SkyTooltip>
        <span
          className="inline-flex items-center gap-1"
          aria-label={`${actions} drone actions`}
          title="Actions"
        >
          <HandIcon aria-hidden="true" className="size-4" />
          {actions}
        </span>
      </SkyTooltip>
      {worldType ? (
        <>
          <span aria-hidden="true">·</span>
          <SkyTooltip>
            <span
              className="inline-flex items-center gap-1"
              aria-label={`${photos} total photos captured`}
              title="Photos"
            >
              <ImagesIcon aria-hidden="true" className="size-4" />
              {photos}
            </span>
          </SkyTooltip>
        </>
      ) : null}
    </span>
  );
}
