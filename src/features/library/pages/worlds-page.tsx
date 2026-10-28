import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { WorldPreviewDialog } from "../cards/world-preview-dialog";
import { WorldThumbnail } from "../cards/world-thumbnail";
import type { WorkspaceWorldRecord } from "../database/workspace-resources-store";
import {
  LibraryCardFrame,
  LibraryEmptyState,
  LibraryPageHeader,
  LibraryPageLayout,
} from "../cards/library-presentation.tsx";

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
        <LibraryPageHeader
          titleId="ms-lib-worlds-title"
          title="Worlds"
          description={
            <p className="ms-lib-sub mt-0 hidden">
              3D reconstructions for {workspaceName}.
            </p>
          }
          actions={
            <Button size="default" variant="default" onClick={onCreate}>
              <PlusIcon aria-hidden="true" /> Add World
            </Button>
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
            className="ms-lib-resource-card"
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
            <span className="ms-lib-card-body flex-1">
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
                  className="self-start"
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
        <LibraryEmptyState
          title="No Worlds yet"
          description="Add a 3D reconstruction to this Workspace."
        />
      ) : null}
      <WorldPreviewDialog
        world={selectedWorld}
        onClose={() => setSelectedWorld(null)}
      />
    </LibraryPageLayout>
  );
}
