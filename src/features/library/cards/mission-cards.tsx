import {
  GitMergeIcon,
  HandIcon,
  ImagesIcon,
  RulerIcon,
} from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import {
  LibraryCardFrame,
  type LibraryCardAction,
} from "./library-presentation.tsx";
import { SkyTooltip } from "../../../ui/components/sky-tooltip";
import MissionThumbnail from "./mission-thumbnail.tsx";
import MissionMapThumbnail from "./mission-map-thumbnail.tsx";
import type { LibMission } from "../database/store";
import type { SharedMissionFixture } from "../workspace/workspace-data.ts";
import type { MapTileOrigin } from "../../../shared/map-tiles";
import { roundTo } from "../../../shared/number-utils";
import {
  formatArea,
  formatDistance,
  useMeasurementSystem,
} from "../../../shared/measurement-units";
import {
  actionCount,
  missionFromSnapshot,
  missionOrigin,
  polygonAreaM2,
  routeLengthM,
  type StudioMission,
} from "../../../domain/mission-model";
import { LibraryAvatar } from "./library-avatar.tsx";

interface MissionCardRecord {
  id: string;
  name: string;
  editedAgo: string;
  worldType?: "2D" | "3D";
  world?: string;
  worldId?: string;
  missionData?: string;
  origin?: MapTileOrigin;
  starred?: boolean;
  viewOnly?: boolean;
}

export type SharedMission = SharedMissionFixture;

function missionThumbnailOrigin(mission: MissionCardRecord): MapTileOrigin {
  if (mission.missionData) {
    try {
      return missionOrigin(missionFromSnapshot(mission.missionData));
    } catch {
      // Legacy and shared mission cards can lack a saved design snapshot.
    }
  }
  return missionOrigin({ origin: mission.origin });
}

function MissionCardSummary({
  mission,
}: {
  mission: Pick<MissionCardRecord, "missionData" | "worldType">;
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

function MissionCardOwner({ username }: { username: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <LibraryAvatar name={username} testId="ms-lib-card-owner" />
      <span className="text-sm text-muted-foreground">{username}</span>
    </div>
  );
}

function formatCompactEditedAgo(value: string): string {
  const normalized = value.trim().replace(/^Edited\s+/u, "");
  if (/^just now$/iu.test(normalized)) return "Now";
  if (/^yesterday$/iu.test(normalized)) return "1d ago";

  const match = normalized.match(/^(\d+)\s+(minute|hour|day)s?\s+ago$/iu);
  if (!match) return normalized;

  const [, amount, unit] = match;
  const suffix = unit.toLowerCase().startsWith("minute")
    ? "m"
    : unit.toLowerCase().startsWith("hour")
      ? "h"
      : "d";
  return `${amount}${suffix} ago`;
}

function MissionCardFooter({
  username,
  editedAgo,
}: {
  username: string;
  editedAgo: string;
}) {
  return (
    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
      <MissionCardOwner username={username} />
      <time
        aria-label={editedAgo}
        title={editedAgo}
        className="whitespace-nowrap text-right text-sm text-muted-foreground"
      >
        {formatCompactEditedAgo(editedAgo)}
      </time>
    </div>
  );
}

function MissionWorldTypeBadge({ worldType }: { worldType: "2D" }) {
  return (
    <Badge
      count={worldType}
      status="outline"
      data-testid="ms-lib-card-world-type"
      className="inline-flex absolute top-1 left-1"
    />
  );
}

type MissionCardVariant = "project" | "recent" | "shared";

function MissionCardCore({
  variant,
  mission,
  username,
  projectName,
  worldAssetId,
  testId,
  actions = [],
  onToggleStar,
  onOpen,
}: {
  variant: MissionCardVariant;
  mission: MissionCardRecord;
  username: string;
  projectName?: string;
  worldAssetId?: string;
  testId?: string;
  actions?: LibraryCardAction[];
  onToggleStar?: () => void;
  onOpen?: () => void;
}) {
  const title =
    variant === "recent" && projectName
      ? `${projectName} | ${mission.name}`
      : mission.name;
  const thumbnail =
    mission.worldType === "2D" ? (
      <MissionMapThumbnail
        origin={missionThumbnailOrigin(mission)}
        missionName={mission.name}
      />
    ) : (
      <MissionThumbnail worldAssetId={worldAssetId} />
    );
  const worldBadge =
    mission.worldType === "2D" ? (
      <MissionWorldTypeBadge worldType="2D" />
    ) : null;
  const cardBody = (
    <div className="ms-lib-card-body flex-1 justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium">{title}</span>
          {variant === "shared" || mission.viewOnly ? (
            <Badge count="View only" />
          ) : null}
        </div>
        {variant !== "shared" ? <MissionCardSummary mission={mission} /> : null}
      </div>
      <MissionCardFooter username={username} editedAgo={mission.editedAgo} />
    </div>
  );

  if (variant === "shared") {
    return (
      <article
        key={mission.id}
        className="ms-lib-card is-readonly"
        aria-label={mission.name}
      >
        <span className="ms-lib-thumb is-mission" aria-hidden="true">
          {thumbnail}
          {worldBadge}
        </span>
        {cardBody}
      </article>
    );
  }

  return (
    <LibraryCardFrame
      key={mission.id}
      label={title}
      testId={testId ?? `ms-lib-mission-${mission.id}`}
      actions={actions}
      starred={mission.starred}
      onToggleStar={onToggleStar}
      onOpen={onOpen}
    >
      <button
        type="button"
        className="ms-lib-thumb is-mission p-0 [border:0] border-b border-b-border appearance-none cursor-pointer"
        data-testid={testId ? `${testId}-open` : undefined}
        aria-label={`Open ${mission.name}`}
        onClick={onOpen}
      >
        {thumbnail}
        {worldBadge}
      </button>
      {cardBody}
    </LibraryCardFrame>
  );
}

export function MissionCard({
  projectName: _projectName,
  mission,
  worldAssetId,
  username,
  testId,
  actions,
  onToggleStar,
  onOpen,
}: {
  projectName: string;
  mission: LibMission;
  worldAssetId?: string;
  username: string;
  testId: string;
  actions: LibraryCardAction[];
  onToggleStar?: () => void;
  onOpen: () => void;
}) {
  return (
    <MissionCardCore
      variant="project"
      mission={mission}
      worldAssetId={worldAssetId}
      username={username}
      testId={testId}
      actions={actions}
      onToggleStar={onToggleStar}
      onOpen={onOpen}
    />
  );
}

export function RecentMissionCard({
  projectName,
  mission,
  worldAssetId,
  username,
  testId,
  actions,
  onToggleStar,
  onOpen,
}: {
  projectName: string;
  mission: LibMission;
  worldAssetId?: string;
  username: string;
  testId: string;
  actions: LibraryCardAction[];
  onToggleStar?: () => void;
  onOpen: () => void;
}) {
  return (
    <MissionCardCore
      variant="recent"
      mission={mission}
      worldAssetId={worldAssetId}
      username={username}
      projectName={projectName}
      testId={testId}
      actions={actions}
      onToggleStar={onToggleStar}
      onOpen={onOpen}
    />
  );
}

export function SharedMissionCard({
  mission,
  ownerName,
}: {
  mission: SharedMission;
  ownerName: string;
}) {
  return (
    <MissionCardCore
      variant="shared"
      mission={mission}
      username={ownerName}
      testId={`ms-lib-shared-mission-${mission.id}`}
    />
  );
}
