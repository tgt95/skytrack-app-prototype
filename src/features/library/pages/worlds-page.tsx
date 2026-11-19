import { FolderOpenIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "skytrack-ui/empty";
import { PageHeader } from "skytrack-ui/page-header";
import { WorldPreviewDialog } from "@/features/library/cards/world-preview-dialog";
import { WorldThumbnail } from "@/features/library/cards/world-thumbnail";
import type { WorkspaceWorldRecord } from "@/features/library/database/workspace-resources-store";
import {
  LibraryCardFrame,
  LibraryPageLayout,
} from "@/features/library/cards/library-presentation.tsx";

function worldSourceSummary(world: WorkspaceWorldRecord): string {
  if (world.sourceType === "mission") {
    if (world.sourceMissionLabel)
      return `Source 2D mission · ${world.sourceMissionLabel}`;
    return world.sourceMissionId ? "Photogrammetry mission" : "";
  }
  if (world.sourceType === "flight-reference") {
    return world.sourceFlightReference
      ? `Flight reference · ${world.sourceFlightReference}`
      : "";
  }
  return "";
}

function worldReconstructionSummary(world: WorkspaceWorldRecord): string {
  return world.reconstructionReference.trim()
    ? `Reconstruction · ${world.reconstructionReference}`
    : "";
}

export function WorldsPage({
  workspaceName,
  worlds,
  onCreate,
  onEdit,
  onDelete,
}: {
  workspaceName: string;
  worlds: WorkspaceWorldRecord[];
  onCreate: () => void;
  onEdit: (world: WorkspaceWorldRecord) => void;
  onDelete: (worldId: string) => void;
}) {
  const [selectedWorld, setSelectedWorld] =
    useState<WorkspaceWorldRecord | null>(null);

  return (
    <LibraryPageLayout
      titleId="ms-lib-worlds-title"
      header={
        <PageHeader
          className="sticky top-0 z-20 ms-lib-page-header flex flex-col gap-2 px-6 pb-4 pt-5"
          data-testid="ms-lib-page-header-row"
          title={
            <span id="ms-lib-worlds-title" data-testid="ms-lib-page-header-copy">
              Worlds
            </span>
          }
          toolbar={
            <div className="inline-flex items-center justify-end gap-2 shrink-0" data-testid="ms-lib-page-header-actions">
              <Button size="default" variant="default" onClick={onCreate}>
                <PlusIcon aria-hidden="true" /> Add World
              </Button>
            </div>
          }
        />
      }
    >
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
        aria-label={`${workspaceName} 3D Worlds`}
      >
        {worlds.map((world) => (
          <LibraryCardFrame
            key={world.id}
            label={world.name}
            className="ms-lib-resource-card min-h-39"
            testId={`ms-lib-world-${world.id}`}
            onOpen={() => setSelectedWorld(world)}
            actions={[
              {
                id: "edit",
                label: "Edit",
                group: "primary",
                onSelect: () => onEdit(world),
              },
              {
                id: "delete",
                label: "Delete",
                group: "destructive",
                destructive: true,
                onSelect: () => onDelete(world.id),
              },
            ]}
          >
            <WorldThumbnail
              assetId={world.glbAssetId}
              worldName={world.name}
              onPreview={() => setSelectedWorld(world)}
            />
            <span className="ms-lib-card-body flex flex-col gap-1 p-3 flex-1">
              <span className="text-sm font-medium">{world.name}</span>
              <span className="text-xs text-muted-foreground leading-[1.5]">
                3D World ·{" "}
                {world.location && world.location !== "Sample terrain"
                  ? world.location
                  : "Terrain ready"}
              </span>
              {world.glbFileName ? (
                <span className="text-xs text-muted-foreground leading-[1.5]">
                  {world.glbFileName}
                  {world.glbFileSize
                    ? ` · ${(world.glbFileSize / 1_000_000).toFixed(1)} MB`
                    : ""}
                </span>
              ) : null}
              {world.status !== "Sample" ? (
                <Badge
                  count={world.status}
                  status="secondary"
                  size="sm"
                  className="self-start rounded-(--radius)"
                />
              ) : null}
              {worldSourceSummary(world) ? (
                <span className="text-sm text-muted-foreground">
                  {worldSourceSummary(world)}
                </span>
              ) : null}
              {worldReconstructionSummary(world) ? (
                <span className="text-sm text-muted-foreground">
                  {worldReconstructionSummary(world)}
                </span>
              ) : null}
            </span>
          </LibraryCardFrame>
        ))}
      </div>
      {worlds.length === 0 ? (
        <Empty>
          <EmptyMedia icon={FolderOpenIcon} />
          <EmptyTitle
            data-testid="ms-lib-empty-title"
            role="heading"
            aria-level={2}
          >
            No Worlds yet
          </EmptyTitle>
          <EmptyDescription>Add a 3D reconstruction to this Workspace.</EmptyDescription>
        </Empty>
      ) : null}
      <WorldPreviewDialog
        world={selectedWorld}
        onClose={() => setSelectedWorld(null)}
      />
    </LibraryPageLayout>
  );
}
