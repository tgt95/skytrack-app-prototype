import { useState } from "react";
import { FolderOpenIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "skytrack-ui/empty";
import { PageHeader } from "skytrack-ui/page-header";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "skytrack-ui/dialog";
import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import type { WorkspaceAIModelRecord } from "@/features/library/database/workspace-resources-store";
import { AIModelCardContent } from "@/ui/components/ai-model-card";
import { canManageAIModel } from "../workspace/use-ai-model-access";
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
  onSave,
  canEditSharedModels,
  currentUserName,
}: {
  workspaceName: string;
  skytrackModels: WorkspaceAIModelRecord[];
  workspaceModels: WorkspaceAIModelRecord[];
  uploadedModels: WorkspaceAIModelRecord[];
  category: AIModelCategory;
  onCategoryChange: (category: AIModelCategory) => void;
  onImport: () => void;
  onDelete: (modelId: string) => void;
  onSave: (modelId: string, details: { name: string; description: string }) => boolean;
  canEditSharedModels: boolean;
  currentUserName: string;
}) {
  const [activeModel, setActiveModel] = useState<WorkspaceAIModelRecord | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelDescription, setModelDescription] = useState("");
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(false);
  const openModel = (model: WorkspaceAIModelRecord, canEdit: boolean) => {
    setActiveModel(model);
    setModelName(model.name);
    setModelDescription(model.description ?? "");
    setEditing(canEdit);
    setSaveError("");
  };
  const closeModel = () => {
    setActiveModel(null);
    setSaveError("");
  };
  const saveModel = () => {
    if (!activeModel) return;
    const normalizedName = modelName.trim().toLowerCase();
    const duplicate = [...skytrackModels, ...workspaceModels, ...uploadedModels].some(
      (model) =>
        model.id !== activeModel.id &&
        model.name.trim().toLowerCase() === normalizedName,
    );
    if (duplicate) {
      setSaveError("An AI model with this name already exists in the Workspace.");
      return;
    }
    const saved = onSave(activeModel.id, {
      name: modelName,
      description: modelDescription,
    });
    if (saved) closeModel();
    else setSaveError("The model could not be saved. Check the name and try again.");
  };
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
              <TabsTab value="me">My models ({uploadedModels.length})</TabsTab>
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
                const canEdit = canManageAIModel(
                  model,
                  canEditSharedModels,
                  currentUserName,
                );
                const modelContent = <AIModelCardContent model={model} />;

                return (
                  <LibraryCardFrame
                    key={model.id}
                    label={model.name}
                    className={`ms-lib-resource-card min-h-39 ${canEdit ? "" : "is-readonly"}`}
                    testId={`ms-lib-ai-model-${model.id}`}
                    actions={
                      canEdit
                        ? [
                            {
                              id: "edit",
                              label: "Edit",
                              group: "primary",
                              onSelect: () => openModel(model, true),
                            },
                            {
                              id: "remove",
                              label: "Remove",
                              group: "destructive",
                              destructive: true,
                              onSelect: () => onDelete(model.id),
                            },
                          ]
                        : []
                    }
                    onOpen={canEdit ? () => openModel(model, true) : undefined}
                  >
                    {modelContent}
                  </LibraryCardFrame>
                );
              })}
            </div>
          )}
        </TabsPanel>
      </LibraryPageLayout>
      <Dialog
        open={activeModel !== null}
        onOpenChange={(open: boolean) => {
          if (!open) closeModel();
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label={editing ? "Edit AI model" : "AI model details"}>
            <DialogHeader>
              <DialogTitle className="heading">
                {editing ? "Edit AI model" : "AI model details"}
              </DialogTitle>
              {/* <DialogDescription>
                {activeModel?.origin === "skytrack"
                  ? "SkyTrack models are managed by SkyTrack."
                  : editing
                    ? "Update the model name and description."
                    : "This model is managed by a Workspace administrator."}
              </DialogDescription> */}
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <FieldRoot>
                <FieldLabel>Name</FieldLabel>
                <FieldControl
                  value={modelName}
                  onChange={(event) => setModelName(event.currentTarget.value)}
                  disabled={!editing}
                  autoFocus={editing}
                />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel htmlFor="ai-model-description">Description</FieldLabel>
                <textarea
                  id="ai-model-description"
                  value={modelDescription}
                  onChange={(event) => setModelDescription(event.currentTarget.value)}
                  disabled={!editing}
                  rows={4}
                  className="flex w-full min-w-0 rounded-(--radius) border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-(--ring) disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FieldRoot>
              {saveError ? (
                <p className="m-0 text-sm text-destructive" role="alert">
                  {saveError}
                </p>
              ) : null}
            </div>
            <DialogFooter className="flex-row flex-wrap items-center justify-end">
              <DialogClose
                size="default"
                className="w-auto flex-[0_0_auto]"
              >
                {editing ? "Cancel" : "Close"}
              </DialogClose>
              {editing ? (
                <Button
                  size="default"
                  onClick={saveModel}
                  disabled={!modelName.trim()}
                  className="w-auto flex-[0_0_auto]"
                >
                  Save changes
                </Button>
              ) : null}
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </Tabs>
  );
}
