import {
  ImagesIcon,
  FolderIcon,
  GitMergeIcon,
  HandIcon,
  RulerIcon,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "skytrack-ui/avatar";
import { Badge } from "skytrack-ui/badge";
import {
  LibraryCardFrame,
  type LibraryCardAction,
} from "./library-presentation";
import { SkyTooltip } from "../../shared/sky-tooltip";
import MissionThumbnail from "./mission-thumbnail";
import MissionMapThumbnail from "./mission-map-thumbnail";
import { getTemplateThumbnail } from "./template-thumbnails";
import type { LibMission, LibProject, LibTemplate } from "./database/store";
import { SHARED_PROJECTS } from "./workspace-data";
import type { MapTileOrigin } from "../../shared/map-tiles";
import { formatMetricArea, roundTo } from "../../shared/number-utils";
import {
  actionCount,
  missionFromSnapshot,
  missionOrigin,
  routeLengthM,
  type StudioMission,
} from "../../domain/mission-model";

interface MissionCardRecord {
  id: string;
  name: string;
  editedAgo: string;
  worldType?: "2D" | "3D";
  world?: string;
  missionData?: string;
  origin?: MapTileOrigin;
  starred?: boolean;
  viewOnly?: boolean;
}

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

function polygonArea(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) / 2;
}

function MissionCardSummary({
  mission,
}: {
  mission: Pick<MissionCardRecord, "missionData" | "worldType">;
}) {
  if (!mission.missionData) return null;

  let snapshot: StudioMission;
  try {
    snapshot = missionFromSnapshot(mission.missionData);
  } catch {
    return null;
  }

  const areaM2 = roundTo(
    snapshot.areas.reduce((total, area) => total + polygonArea(area.points), 0),
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
              hasArea ? `${areaM2} square meters` : `${lengthM} meters`
            }
            title={hasArea ? "Area" : "Route length"}
          >
            <RulerIcon aria-hidden="true" className="size-4" />
            {hasArea ? formatMetricArea(areaM2) : `${lengthM} m`}
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

export function LibraryAvatar({
  name,
  testId,
}: {
  name: string;
  testId?: string;
}) {
  const firstName = name.trim().split(/\s+/u)[0];
  const initial = firstName?.[0]?.toLocaleUpperCase() ?? "?";
  return (
    <Avatar aria-hidden="true" className="size-6" data-testid={testId}>
      <AvatarFallback className="text-[0.625rem] font-bold">
        {initial}
      </AvatarFallback>
    </Avatar>
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
  if (/^just now$/iu.test(normalized)) return "now";
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
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-(--border) pt-3">
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
  testId,
  actions = [],
  onToggleStar,
  onOpen,
}: {
  variant: MissionCardVariant;
  mission: MissionCardRecord;
  username: string;
  projectName?: string;
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
      <MissionThumbnail />
    );
  const worldBadge =
    mission.worldType === "2D" ? (
      <MissionWorldTypeBadge worldType="2D" />
    ) : null;
  const cardBody = (
    <div className="ms-lib-card-body flex-1 justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-[1.4]">{title}</span>
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
        className="ms-lib-thumb is-mission p-0 [border:0] [border-bottom:0.0625rem_solid_var(--border)] appearance-none cursor-pointer"
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
  username,
  testId,
  actions,
  onToggleStar,
  onOpen,
}: {
  projectName: string;
  mission: LibMission;
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
      username={username}
      testId={testId}
      actions={actions}
      onToggleStar={onToggleStar}
      onOpen={onOpen}
    />
  );
}

export function ProjectCard({
  project,
  actions,
  onOpen,
}: {
  project: LibProject;
  actions: LibraryCardAction[];
  onOpen: () => void;
}) {
  return (
    <LibraryCardFrame
      key={project.id}
      label={project.name}
      testId={`ms-lib-project-${project.id}`}
      actions={actions}
      onOpen={onOpen}
    >
      <button
        type="button"
        className="ms-lib-thumb is-project"
        data-testid={`ms-lib-project-${project.id}-open`}
        aria-label={`Open ${project.name}`}
        onClick={onOpen}
      >
        <FolderIcon aria-hidden="true" className="w-[2.25rem] h-[2.25rem]" />
      </button>
      <div className="ms-lib-card-body">
        <span className="text-sm font-medium leading-[1.4]">
          {project.name}
        </span>
        <span className="text-sm text-muted-foreground">
          {project.missions.length} mission
          {project.missions.length === 1 ? "" : "s"}
        </span>
      </div>
    </LibraryCardFrame>
  );
}

export function TemplateCard({
  template,
  testId,
  onOpen,
  hideMeta = false,
}: {
  template: LibTemplate;
  testId: string;
  onOpen: () => void;
  hideMeta?: boolean;
}) {
  const tint = `tint-${template.id.charCodeAt(1) % 6}`;
  const thumbnail = getTemplateThumbnail(template.id);
  return (
    <LibraryCardFrame
      key={template.id}
      label={template.title}
      testId={testId}
      actions={[
        { id: "open", label: "Open", group: "primary", onSelect: onOpen },
      ]}
      onOpen={onOpen}
    >
      <button
        type="button"
        className={[
          `ms-lib-thumb is-template is-photo ${tint}`,
          "[.ms-lib-thumb&]:bg-none [.ms-lib-thumb&]:bg-[linear-gradient(180deg,transparent_0_42%,color-mix(in_srgb,var(--primary)_14%,transparent)_42%_100%),linear-gradient(115deg,color-mix(in_srgb,var(--primary)_22%,var(--muted))_0_38%,var(--muted)_38%_62%,color-mix(in_srgb,var(--foreground)_10%,var(--muted))_62%_100%)]",
        ]
          .filter(Boolean)
          .join(" ")}
        data-testid={`${testId}-open`}
        aria-label={`Open ${template.title}`}
        onClick={onOpen}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            aria-hidden="true"
            className="ms-template-thumbnail"
          />
        ) : (
          <span
            className=" block w-[72%] h-[56%] [border:0.0625rem_solid_color-mix(in_srgb,var(--foreground)_25%,transparent)] rounded-(--radius) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--foreground)_18%,transparent)_0_0.0625rem,transparent_0.0625rem_1.375rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--foreground)_18%,transparent)_0_0.0625rem,transparent_0.0625rem_1rem),color-mix(in_srgb,var(--foreground)_8%,transparent)] [.ms-lib-thumb.is-photo_&]:w-[34%] [.ms-lib-thumb.is-photo_&]:h-[30%] [.ms-lib-thumb.is-photo_&]:[border:0] [.ms-lib-thumb.is-photo_&]:rounded-[50%] [.ms-lib-thumb.is-photo_&]:bg-[radial-gradient(circle_at_50%_42%,color-mix(in_srgb,var(--primary)_55%,transparent)_0_26%,transparent_27%),linear-gradient(180deg,transparent_46%,color-mix(in_srgb,var(--primary)_30%,transparent)_46%_54%,transparent_54%),linear-gradient(90deg,transparent_48%,color-mix(in_srgb,var(--primary)_30%,transparent)_48%_52%,transparent_52%)] [.ms-lib-thumb.is-photo_&]:opacity-[0.8]"
            aria-hidden="true"
            data-testid="ms-lib-thumb-art"
          />
        )}
      </button>
      <span className="ms-lib-card-body">
        <span className="text-sm font-medium leading-[1.4]">
          {template.title}
        </span>
        <span className="text-xs text-muted-foreground leading-[1.5]">
          {template.desc}
        </span>
        {hideMeta ? null : (
          <span className="text-sm text-muted-foreground">
            {template.byline}
          </span>
        )}
      </span>
    </LibraryCardFrame>
  );
}

export function RecentMissionCard({
  projectName,
  mission,
  username,
  testId,
  actions,
  onToggleStar,
  onOpen,
}: {
  projectName: string;
  mission: LibMission;
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
      username={username}
      projectName={projectName}
      testId={testId}
      actions={actions}
      onToggleStar={onToggleStar}
      onOpen={onOpen}
    />
  );
}

export type SharedProject = (typeof SHARED_PROJECTS)[number];
export type SharedMission = SharedProject["missions"][number];

export function SharedProjectCard({
  project,
  onOpen,
}: {
  project: SharedProject;
  onOpen: () => void;
}) {
  return (
    <LibraryCardFrame
      key={project.id}
      label={project.name}
      testId={`ms-lib-shared-project-${project.id}`}
      actions={[
        { id: "open", label: "Open", group: "primary", onSelect: onOpen },
      ]}
      onOpen={onOpen}
    >
      <button
        type="button"
        className="ms-lib-thumb is-project"
        data-testid={`ms-lib-shared-project-${project.id}-open`}
        aria-label={`Open shared project ${project.name}`}
        onClick={onOpen}
      >
        <FolderIcon aria-hidden="true" className="w-[2.25rem] h-[2.25rem]" />
      </button>
      <div className="ms-lib-card-body flex-1 justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium leading-[1.4]">
              {project.name}
            </span>
            <Badge count="View only" />
          </div>
          <span className="text-sm text-muted-foreground">
            {project.missions.length} mission
            {project.missions.length === 1 ? "" : "s"}
          </span>
          <span
            className="text-muted-foreground text-[0.6875rem]"
            data-testid="ms-lib-shared-context"
          >
            {project.missions
              .map((mission) => `${mission.worldType} · ${mission.world}`)
              .join(" / ")}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-(--border) pt-3">
          <span
            className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground"
            data-testid="ms-lib-shared-owner"
          >
            <Avatar aria-hidden="true" className="size-6 shrink-0">
              <AvatarFallback className="text-[0.625rem] font-bold">
                {project.ownerInitials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">
              {project.owner} · {project.workspace}
            </span>
          </span>
          <span className="whitespace-nowrap text-right text-sm text-muted-foreground">
            {project.sharedAgo}
          </span>
        </div>
      </div>
    </LibraryCardFrame>
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
