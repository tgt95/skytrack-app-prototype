import { FolderIcon } from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import {
  LibraryCardFrame,
  type LibraryCardAction,
} from "./library-presentation.tsx";
import { getTemplateThumbnail } from "./template-thumbnails.ts";
import type { LibProject, LibTemplate } from "../database/store";
import { SHARED_PROJECTS } from "../workspace/workspace-data.ts";
import { LibraryAvatar } from "./library-avatar.tsx";

export {
  MissionCard,
  RecentMissionCard,
  SharedMissionCard,
  type SharedMission,
} from "./mission-cards.tsx";
export { LibraryAvatar } from "./library-avatar.tsx";

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
        className="ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-(--muted-foreground) bg-(--background) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) is-project"
        data-testid={`ms-lib-project-${project.id}-open`}
        aria-label={`Open ${project.name}`}
        onClick={onOpen}
      >
        <FolderIcon aria-hidden="true" className="w-9 h-9" />
      </button>
      <div className="ms-lib-card-body flex flex-col gap-1 p-3">
        <span className="text-sm font-medium">{project.name}</span>
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
          `ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-(--muted-foreground) bg-(--background) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) is-template is-photo ${tint}`,
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
            className="ms-template-thumbnail absolute inset-0 block w-full h-full object-cover rounded-(--radius)"
          />
        ) : (
          <span
            className=" block w-[72%] h-[56%] [border:0.0625rem_solid_color-mix(in_srgb,var(--foreground)_25%,transparent)] rounded-(--radius) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--foreground)_18%,transparent)_0_0.0625rem,transparent_0.0625rem_1.375rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--foreground)_18%,transparent)_0_0.0625rem,transparent_0.0625rem_1rem),color-mix(in_srgb,var(--foreground)_8%,transparent)] [.ms-lib-thumb.is-photo_&]:w-[34%] [.ms-lib-thumb.is-photo_&]:h-[30%] [.ms-lib-thumb.is-photo_&]:[border:0] [.ms-lib-thumb.is-photo_&]:rounded-full [.ms-lib-thumb.is-photo_&]:bg-[radial-gradient(circle_at_50%_42%,color-mix(in_srgb,var(--primary)_55%,transparent)_0_26%,transparent_27%),linear-gradient(180deg,transparent_46%,color-mix(in_srgb,var(--primary)_30%,transparent)_46%_54%,transparent_54%),linear-gradient(90deg,transparent_48%,color-mix(in_srgb,var(--primary)_30%,transparent)_48%_52%,transparent_52%)] [.ms-lib-thumb.is-photo_&]:opacity-[0.8]"
            aria-hidden="true"
            data-testid="ms-lib-thumb-art"
          />
        )}
      </button>
      <span className="ms-lib-card-body flex flex-col gap-1 p-3">
        <span className="text-sm font-medium">{template.title}</span>
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

export type SharedProject = (typeof SHARED_PROJECTS)[number];

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
        className="ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-(--muted-foreground) bg-(--background) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) is-project"
        data-testid={`ms-lib-shared-project-${project.id}-open`}
        aria-label={`Open shared project ${project.name}`}
        onClick={onOpen}
      >
        <FolderIcon aria-hidden="true" className="w-9 h-9" />
      </button>
      <div className="ms-lib-card-body flex flex-col gap-1 p-3 flex-1 justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium">{project.name}</span>
            <Badge className="rounded-(--radius)" count="View only" />
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
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span
            className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground"
            data-testid="ms-lib-shared-owner"
          >
            <LibraryAvatar
              name={project.owner}
              initials={project.ownerInitials}
              className="size-6 shrink-0"
            />
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
