import { useEffect, useState } from "react";
import {
  FolderSimpleIcon,
  GitMergeIcon,
  HandIcon,
  ImagesIcon,
  RulerIcon,
} from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Avatar, AvatarFallback } from "skytrack-ui/avatar";
import {
  LibraryCardFrame,
  type LibraryCardAction,
} from "./library-presentation.tsx";
import { SkyTooltip } from "@/ui/components/sky-tooltip";
import MissionThumbnail from "./mission-thumbnail.tsx";
import MissionMapThumbnail from "./mission-map-thumbnail.tsx";
import type { LibMission } from "@/features/library/database/store";
import type { SharedMissionFixture } from "@/features/library/workspace/workspace-data.ts";
import type { MapTileOrigin } from "@/shared/map-tiles";
import { roundTo } from "@/shared/number-utils";
import { getNameInitials } from "@/shared/name-initials";
import {
  formatArea,
  formatDistance,
  useMeasurementSystem,
} from "@/shared/measurement-units";
import {
  actionCount,
  missionFromSnapshot,
  missionOrigin,
  polygonAreaM2,
  routeLengthM,
  type StudioMission,
} from "@/domain/mission-model";

interface MissionCardRecord {
  id: string;
  name: string;
  updatedAt: string | null;
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
      <Avatar
        aria-hidden="true"
        className="size-6"
        data-testid="ms-lib-card-owner"
      >
        <AvatarFallback>{getNameInitials(username)}</AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground">{username}</span>
    </div>
  );
}

function formatCompactUpdatedAt(value: string | null, now: number): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "—";

  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < 60_000) return "Now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  if (elapsed < 7 * 86_400_000) return `${Math.floor(elapsed / 86_400_000)}d`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year:
      timestamp < new Date(now).setFullYear(new Date(now).getFullYear() - 1)
        ? "numeric"
        : undefined,
  }).format(timestamp);
}

function MissionCardFooter({
  username,
  updatedAt,
}: {
  username: string;
  updatedAt: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const timestamp = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  const fullDate = Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp)
    : "Edit time unavailable";

  return (
    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
      <MissionCardOwner username={username} />
      <time
        dateTime={
          Number.isFinite(timestamp) ? (updatedAt ?? undefined) : undefined
        }
        aria-label={fullDate}
        title={fullDate}
        className="whitespace-nowrap text-right text-sm text-muted-foreground"
      >
        {formatCompactUpdatedAt(updatedAt, now)}
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
      className="inline-flex absolute top-1 left-1 rounded-(--radius)"
    />
  );
}

type MissionCardVariant = "project" | "recent" | "shared";

function MissionCardCore({
  variant,
  mission,
  username,
  projectName,
  projectHref,
  worldAssetId,
  testId,
  actions = [],
  onToggleStar,
  onOpen,
  onOpenProject,
}: {
  variant: MissionCardVariant;
  mission: MissionCardRecord;
  username: string;
  projectName?: string;
  projectHref?: string;
  worldAssetId?: string;
  testId?: string;
  actions?: LibraryCardAction[];
  onToggleStar?: () => void;
  onOpen?: () => void;
  onOpenProject?: () => void;
}) {
  const title = mission.name;
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
    <div className="ms-lib-card-body flex flex-col gap-1 p-3 flex-1 justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium">{title}</div>
          {variant === "shared" || mission.viewOnly ? (
            <Badge className="rounded-(--radius)" count="View only" />
          ) : null}
        </div>
        {variant !== "shared" ? <MissionCardSummary mission={mission} /> : null}
        {variant === "recent" && projectName ? (
          <a
            href={projectHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
            data-testid="ms-lib-card-project"
            aria-label={`Open project ${projectName}`}
            onClick={(event) => {
              event.stopPropagation();
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              event.preventDefault();
              onOpenProject?.();
            }}
          >
            <FolderSimpleIcon aria-hidden="true" className="size-4" />
            {projectName}
          </a>
        ) : null}
      </div>
      <MissionCardFooter username={username} updatedAt={mission.updatedAt} />
    </div>
  );

  if (variant === "shared") {
    return (
      <article
        key={mission.id}
        className="ms-lib-card relative flex flex-col w-full p-0 border border-border rounded-(--radius) bg-card text-foreground text-left cursor-pointer overflow-hidden hover:border-primary focus-visible:outline-2 focus-visible:outline-sidebar-ring focus-visible:outline-offset-1 [&.is-readonly]:cursor-default is-readonly"
        aria-label={mission.name}
      >
        <span
          className="ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-muted-foreground bg-background bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) is-mission"
          aria-hidden="true"
        >
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
        className="ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-muted-foreground bg-(--background) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) is-mission p-0 [border:0] border-b border-b-border appearance-none cursor-pointer"
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
  projectHref,
  mission,
  worldAssetId,
  username,
  testId,
  actions,
  onToggleStar,
  onOpen,
  onOpenProject,
}: {
  projectName: string;
  projectHref: string;
  mission: LibMission;
  worldAssetId?: string;
  username: string;
  testId: string;
  actions: LibraryCardAction[];
  onToggleStar?: () => void;
  onOpen: () => void;
  onOpenProject: () => void;
}) {
  return (
    <MissionCardCore
      variant="recent"
      mission={mission}
      worldAssetId={worldAssetId}
      username={username}
      projectName={projectName}
      projectHref={projectHref}
      testId={testId}
      actions={actions}
      onToggleStar={onToggleStar}
      onOpen={onOpen}
      onOpenProject={onOpenProject}
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
