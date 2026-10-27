import { PackageIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "skytrack-ui/tabs";
import type { WorkspaceAIModelRecord } from "../database/workspace-resources-store";
import {
  LibraryCardFrame,
  LibraryEmptyState,
  LibraryPageHeader,
  LibraryPageLayout,
} from "../library-presentation";
import { LibraryAvatar } from "../library-avatar";
import type { AIModelCategory } from "../library-types";

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
                <Button size="default" variant="default" onClick={onImport}>
                  <PlusIcon aria-hidden="true" /> Import model
                </Button>
              </div>
            }
            footerVariant="tabs"
            stickyHeader
            footer={
              <TabsList aria-label="AI model categories">
                <TabsTab value="all">
                  All ({allModels.length})
                </TabsTab>
                <TabsTab value="members">
                  Members ({workspaceModels.length})
                </TabsTab>
                <TabsTab value="me">
                  Me ({uploadedModels.length})
                </TabsTab>
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
                      <span className="text-sm font-medium">{model.name}</span>
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
