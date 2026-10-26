import {
  DroneIcon,
  GlobeHemisphereWestIcon,
  PackageIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "skytrack-ui/tabs";
import type { WorkspaceDroneProfile } from "./database/drone-store";
import type {
  WorkspaceAIModelRecord,
  WorkspaceWorldRecord,
} from "./database/workspace-resources-store";
import {
  LibraryCardFrame,
  LibraryEmptyState,
  LibraryPageHeader,
  LibraryPageLayout,
} from "./library-presentation";
import { LibraryAvatar } from "./library-cards";
import type { AIModelCategory } from "./library-types";

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
            <Button size="sm" variant="default" onClick={onCreate}>
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
            <span className="ms-lib-resource-icon">
              <GlobeHemisphereWestIcon
                aria-hidden="true"
                className="w-[2.25rem] h-[2.25rem]"
              />
            </span>
            <span className="ms-lib-card-body flex-1">
              <span className="text-sm font-medium">
                {world.name}
              </span>
              <span className="text-xs text-muted-foreground leading-[1.5]">
                3D World ·{" "}
                {world.location && world.location !== "Sample terrain"
                  ? world.location
                  : "Terrain ready"}
              </span>
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
    </LibraryPageLayout>
  );
}

export function DronesPage({
  workspaceName,
  drones,
  onCreate,
  onEdit,
  onDelete,
}: {
  workspaceName: string;
  drones: WorkspaceDroneProfile[];
  onCreate: () => void;
  onEdit: (drone: WorkspaceDroneProfile) => void;
  onDelete: (droneId: string) => void;
}) {
  return (
    <LibraryPageLayout
      titleId="ms-lib-drones-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-drones-title"
          title="Drones"
          description={
            <p className="ms-lib-sub mt-0 hidden">
              Reference builds and hardware profiles for {workspaceName}.
            </p>
          }
          actions={
            <Button size="sm" variant="default" onClick={onCreate}>
              <PlusIcon aria-hidden="true" /> Add Drone
            </Button>
          }
        />
      }
    >
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
        aria-label="Drones"
      >
        {drones.map((drone) => (
          <LibraryCardFrame
            key={drone.id}
            label={drone.name}
            className="ms-lib-resource-card  relative cursor-default"
            actions={[
              {
                id: "edit",
                label: "Edit",
                group: "primary",
                onSelect: () => onEdit(drone),
              },
              {
                id: "delete",
                label: "Delete",
                group: "destructive",
                destructive: true,
                onSelect: () => onDelete(drone.id),
              },
            ]}
            data-testid="ms-lib-drone-profile-card"
          >
            <span className="ms-lib-resource-icon">
              <DroneIcon
                aria-hidden="true"
                className="w-[2.25rem] h-[2.25rem]"
              />
            </span>
            <span className="ms-lib-card-body flex-1">
              <span className="text-sm font-medium">
                {drone.name}
              </span>
              <span className="text-xs text-muted-foreground leading-[1.5]">
                {drone.firmwareFamily === "Unspecified"
                  ? "Flight firmware not specified"
                  : `${drone.firmwareFamily} flight firmware`}
              </span>
              <span className="text-sm text-muted-foreground">
                {drone.flightControllerModel ||
                  "Flight controller not specified"}
              </span>
              <span
                className=" text-(--muted-foreground) text-[0.6875rem] leading-[1.45]"
                data-testid="ms-lib-drone-component-count"
              >
                {drone.components.length} hardware components
              </span>
            </span>
          </LibraryCardFrame>
        ))}
      </div>
    </LibraryPageLayout>
  );
}

export function AIModelsPage({
  workspaceName,
  skytrackModels,
  workspaceModels,
  uploadedModels,
  category,
  onCategoryChange,
  onImport,
  onDelete,
}: {
  workspaceName: string;
  skytrackModels: WorkspaceAIModelRecord[];
  workspaceModels: WorkspaceAIModelRecord[];
  uploadedModels: WorkspaceAIModelRecord[];
  category: AIModelCategory;
  onCategoryChange: (category: AIModelCategory) => void;
  onImport: () => void;
  onDelete: (modelId: string) => void;
}) {
  const allModels = [...skytrackModels, ...workspaceModels, ...uploadedModels];
  const visibleModels =
    category === "members"
      ? workspaceModels
      : category === "me"
        ? uploadedModels
        : allModels;
  const emptyState =
    category === "members"
      ? {
          title: "No member models available",
          description:
            "Models uploaded by other Workspace members will appear here.",
        }
      : category === "me"
        ? {
            title: "No uploaded models yet",
            description:
              "Import a model package to add it to your personal list.",
          }
        : {
            title: "No AI models available",
            description:
              "AI models available to this Workspace will appear here.",
          };

  return (
    <Tabs
      className="w-full max-w-none gap-0"
      value={category}
      onValueChange={(value: unknown) => {
        if (value === "all" || value === "members" || value === "me") {
          onCategoryChange(value);
        }
      }}
      data-testid="ms-ai-model-tabs"
    >
      <LibraryPageLayout
        titleId="ms-lib-aimodels-title"
        header={
          <LibraryPageHeader
            titleId="ms-lib-aimodels-title"
            title="AI models"
            actions={
              <div
                className=" inline-flex items-center gap-[0.5rem]"
                data-testid="ms-ai-model-header-actions"
              >
                <Button size="sm" variant="default" onClick={onImport}>
                  <PlusIcon aria-hidden="true" /> Import model
                </Button>
              </div>
            }
            footerVariant="tabs"
            stickyHeader
            footer={
              <TabsList variant="standard" aria-label="AI model categories">
                <TabsTab variant="standard" value="all">
                  All ({allModels.length})
                </TabsTab>
                <TabsTab variant="standard" value="members">
                  Members ({workspaceModels.length})
                </TabsTab>
                <TabsTab variant="standard" value="me">
                  Me ({uploadedModels.length})
                </TabsTab>
                <TabsIndicator variant="underline" />
              </TabsList>
            }
          />
        }
      >
        <TabsPanel
          className="ms-ai-model-panel w-full p-0 border-0 rounded-none bg-transparent text-inherit shadow-none"
          value={category}
        >
          {visibleModels.length === 0 ? (
            <LibraryEmptyState
              title={emptyState.title}
              description={emptyState.description}
            />
          ) : (
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
              aria-label={`${workspaceName} AI models ${category}`}
            >
              {visibleModels.map((model) => {
                const isUploadedByMe = model.origin === "user-upload";
                const attribution =
                  model.origin === "skytrack"
                    ? "SkyTrack"
                    : isUploadedByMe
                      ? "You"
                      : model.uploadedBy
                        ? model.uploadedBy
                        : "Workspace member";
                const modelContent = (
                  <>
                    <span className="ms-lib-resource-icon">
                      <PackageIcon
                        aria-hidden="true"
                        className="w-[2.25rem] h-[2.25rem]"
                      />
                    </span>
                    <span className="ms-lib-card-body flex-1">
                      <span className="text-sm font-medium">
                        {model.name}
                      </span>
                      <span className="text-xs text-muted-foreground leading-[1.5]">
                        {isUploadedByMe
                          ? model.packageFileName || model.assetReference
                          : `${model.version ? `Version ${model.version}` : "Version not specified"}${model.task ? ` · ${model.task}` : ""}`}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {isUploadedByMe
                          ? `${model.packageFileSize ? `${(model.packageFileSize / (1024 * 1024)).toFixed(1)} MB` : "Package size unavailable"} · ${model.status}`
                          : `${model.inputModality || "Input modality not specified"}${model.compatibility ? ` · ${model.compatibility}` : ""}`}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <LibraryAvatar
                          name={attribution}
                          testId={`ms-lib-ai-model-avatar-${model.id}`}
                        />
                        <span>{attribution}</span>
                      </span>
                    </span>
                  </>
                );

                return isUploadedByMe ? (
                  <LibraryCardFrame
                    key={model.id}
                    label={model.name}
                    className="ms-lib-resource-card"
                    testId={`ms-lib-ai-model-${model.id}`}
                    actions={[
                      {
                        id: "remove",
                        label: "Remove",
                        group: "destructive",
                        destructive: true,
                        onSelect: () => onDelete(model.id),
                      },
                    ]}
                  >
                    {modelContent}
                  </LibraryCardFrame>
                ) : (
                  <article
                    key={model.id}
                    className="ms-lib-card ms-lib-resource-card"
                    data-testid={`ms-lib-ai-model-${model.id}`}
                  >
                    {modelContent}
                  </article>
                );
              })}
            </div>
          )}
        </TabsPanel>
      </LibraryPageLayout>
    </Tabs>
  );
}
