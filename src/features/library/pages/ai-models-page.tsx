import { FolderOpenIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "skytrack-ui/empty";
import { PageHeader } from "skytrack-ui/page-header";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import type { WorkspaceAIModelRecord } from "@/features/library/database/workspace-resources-store";
import { AIModelCardContent } from "@/ui/components/ai-model-card";
import {
  LibraryCardFrame,
  LibraryPageLayout,
} from "@/features/library/cards/library-presentation.tsx";
import type { AIModelCategory } from "@/features/library/library-types";

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
          <PageHeader
            className="sticky top-0 z-20 ms-lib-page-header flex flex-col gap-2 px-6 pb-0 pt-5 has-tabs border-b"
            data-testid="ms-lib-page-header-row"
            title={
              <span id="ms-lib-aimodels-title" data-testid="ms-lib-page-header-copy">
                AI models
              </span>
            }
            toolbar={
              <div
                className="inline-flex items-center justify-end gap-2 shrink-0"
                data-testid="ms-lib-page-header-actions"
              >
                <div
                  className="inline-flex items-center gap-2"
                  data-testid="ms-ai-model-header-actions"
                >
                  <Button size="default" variant="default" onClick={onImport}>
                    <PlusIcon aria-hidden="true" /> Import model
                  </Button>
                </div>
              </div>
            }
          >
            <TabsList aria-label="AI model categories" className="border-b-0">
              <TabsTab value="all">All ({allModels.length})</TabsTab>
              <TabsTab value="members">
                Members ({workspaceModels.length})
              </TabsTab>
              <TabsTab value="me">Me ({uploadedModels.length})</TabsTab>
            </TabsList>
          </PageHeader>
        }
      >
        <TabsPanel
          className="ms-ai-model-panel w-full p-0 border-0 rounded-none bg-transparent text-inherit shadow-none"
          value={category}
        >
          {visibleModels.length === 0 ? (
            <Empty>
              <EmptyMedia icon={FolderOpenIcon} />
              <EmptyTitle
                data-testid="ms-lib-empty-title"
                role="heading"
                aria-level={2}
              >
                {emptyState.title}
              </EmptyTitle>
              <EmptyDescription>{emptyState.description}</EmptyDescription>
            </Empty>
          ) : (
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
              aria-label={`${workspaceName} AI models ${category}`}
            >
              {visibleModels.map((model) => {
                const isUploadedByMe = model.origin === "user-upload";
                const modelContent = <AIModelCardContent model={model} />;

                return isUploadedByMe ? (
                  <LibraryCardFrame
                    key={model.id}
                    label={model.name}
                    className="ms-lib-resource-card min-h-39"
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
                    className="ms-lib-card relative flex flex-col w-full p-0 border border-border rounded-(--radius) bg-(--card) text-foreground text-left cursor-pointer overflow-hidden hover:border-(--primary) focus-visible:outline-2 focus-visible:outline-(--sidebar-ring) focus-visible:outline-offset-1 [&.is-readonly]:cursor-default ms-lib-resource-card min-h-39"
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
