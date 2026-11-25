import { useState, type ReactNode } from "react";
import { FolderOpenIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
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
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "skytrack-ui/empty";
import { PageHeader } from "skytrack-ui/page-header";
import type { LibMission, LibProject, LibTemplate } from "./database/store";
import type { WorkspaceDroneProfile } from "./database/drone-store";
import type {
  WorkspaceAIModelRecord,
  WorkspaceWorldRecord,
} from "./database/workspace-resources-store";
import { LibraryPageLayout } from "./cards/library-presentation.tsx";
import {
  TemplateAttribution,
  type SharedProject,
  type SharedMission,
} from "./library-cards";
import { getTemplateThumbnail } from "./cards/template-thumbnails.ts";
import { HomePage } from "./pages/home-page";
import RecentPage from "./pages/recent-page";
import StarredPage from "./pages/starred-page";
import TemplatesPage from "./pages/templates-page";
import { NotificationsPage } from "./pages/notifications-page";
import {
  SharedAccountsPage,
  SharedProjectPage,
  SharedWithMePage,
} from "./pages/shared-pages";
import {
  AIModelsPage,
  DronesPage,
  WorldsPage,
} from "./workspace-resource-pages";
import { ProjectDetailPage, ProjectsPage } from "./project-pages";
import DownloadPage from "./pages/download-page";
import LearnPage from "./pages/learn-page";
import type { AIModelCategory, LibrarySection } from "./library-types";

type MissionEntry = { projectId: string; project: string; mission: LibMission };

interface LibraryMainContentProps {
  section: LibrarySection;
  sharedView: { project: string; mission: string } | null;
  activeSharedProject: SharedProject | null;
  activeProject: LibProject | null;
  workspaceName: string;
  canEditSharedModels: boolean;
  currentUserName: string;
  workspaceProjects: LibProject[];
  workspaceWorlds: WorkspaceWorldRecord[];
  workspaceDrones: WorkspaceDroneProfile[];
  skytrackAIModels: WorkspaceAIModelRecord[];
  workspaceAIModels: WorkspaceAIModelRecord[];
  uploadedAIModels: WorkspaceAIModelRecord[];
  sharedProjects: SharedProject[];
  category: AIModelCategory;
  onCategoryChange: (category: AIModelCategory) => void;
  homeMissions: MissionEntry[];
  starredMissions: MissionEntry[];
  templates: LibTemplate[];
  activeTemplate: LibTemplate | null;
  filteredTemplates: LibTemplate[];
  query: string;
  debouncedQuery: string;
  onQueryChange: (query: string) => void;
  renderMissionCard: (
    projectId: string,
    projectName: string,
    mission: LibMission,
    key: string,
  ) => ReactNode;
  renderRecent: (entry: MissionEntry, testId: string) => ReactNode;
  renderProjectCard: (project: LibProject) => ReactNode;
  renderTemplate: (
    template: LibTemplate,
    testId: string,
    onOpen: () => void,
    hideMeta?: boolean,
  ) => ReactNode;
  renderSharedProject: (project: SharedProject) => ReactNode;
  renderSharedMission: (mission: SharedMission, ownerName: string) => ReactNode;
  onNavigate: (section: LibrarySection, projectId: string | null) => void;
  onCreateMission: (projectId?: string, title?: string) => void;
  onCreateProject: () => void;
  onRenameProject: (project: LibProject) => void;
  onDeleteProject: (project: LibProject) => void;
  onOpenSharedAccounts: (missionId: string | null) => void;
  onOpenSharedProject: (projectId: string | null) => void;
  onUseTemplate: (template: LibTemplate) => void;
  onCreateWorld: () => void;
  onEditWorld: (world: WorkspaceWorldRecord) => void;
  onDeleteWorld: (worldId: string) => void;
  onCreateDrone: () => void;
  onEditDrone: (drone: WorkspaceDroneProfile) => void;
  onDeleteDrone: (droneId: string) => void;
  onImportAIModel: () => void;
  onDeleteAIModel: (modelId: string) => void;
  onSaveAIModel: (
    modelId: string,
    details: { name: string; description: string },
  ) => boolean;
  onGoHome: () => void;
}

export default function LibraryMainContent({
  section,
  sharedView,
  activeSharedProject,
  activeProject,
  workspaceName,
  canEditSharedModels,
  currentUserName,
  workspaceProjects,
  workspaceWorlds,
  workspaceDrones,
  skytrackAIModels,
  workspaceAIModels,
  uploadedAIModels,
  sharedProjects,
  category,
  onCategoryChange,
  homeMissions,
  starredMissions,
  templates,
  activeTemplate,
  filteredTemplates,
  query,
  debouncedQuery,
  onQueryChange,
  renderMissionCard,
  renderRecent,
  renderProjectCard,
  renderTemplate,
  renderSharedProject,
  renderSharedMission,
  onNavigate,
  onCreateMission,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onOpenSharedAccounts,
  onOpenSharedProject,
  onUseTemplate,
  onCreateWorld,
  onEditWorld,
  onDeleteWorld,
  onCreateDrone,
  onEditDrone,
  onDeleteDrone,
  onImportAIModel,
  onDeleteAIModel,
  onSaveAIModel,
  onGoHome,
}: LibraryMainContentProps) {
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null,
  );
  const previewTemplate =
    templates.find((template) => template.id === previewTemplateId) ?? null;
  const label = sharedView
    ? "Shared accounts"
    : activeSharedProject
      ? "Shared project detail"
      : activeProject
        ? "Project detail"
        : section === "home"
          ? "Home"
          : "Library";

  return (
    <section
      className={
        "ms-route-content [view-transition-name:ms-route-content] min-h-0 flex-[1_1_auto] min-w-0 overflow-y-auto overscroll-contain flex flex-col gap-0"
      }
      data-section={section}
      aria-label={label}
    >
      {sharedView ? (
        <SharedAccountsPage
          missionName={sharedView.mission}
          projectName={sharedView.project}
          onBack={() => onOpenSharedAccounts(null)}
        />
      ) : activeSharedProject ? (
        <SharedProjectPage
          project={activeSharedProject}
          onBack={() => onOpenSharedProject(null)}
          renderMission={renderSharedMission}
        />
      ) : activeProject ? (
        <ProjectDetailPage
          project={activeProject}
          onCreateMission={onCreateMission}
          onRenameProject={onRenameProject}
          onDeleteProject={onDeleteProject}
          renderMissionCard={renderMissionCard}
        />
      ) : section === "home" ? (
        <HomePage
          missions={homeMissions}
          templates={templates}
          renderRecent={renderRecent}
          renderTemplate={renderTemplate}
          onViewAll={() => onNavigate("templates", null)}
          onOpenTemplate={setPreviewTemplateId}
        />
      ) : section === "download" ? (
        <DownloadPage />
      ) : section === "recent" ? (
        <RecentPage missions={homeMissions} renderMission={renderRecent} />
      ) : section === "projects" ? (
        <ProjectsPage
          workspaceName={workspaceName}
          projects={workspaceProjects}
          renderProjectCard={renderProjectCard}
          onCreateProject={onCreateProject}
        />
      ) : section === "worlds" ? (
        <WorldsPage
          workspaceName={workspaceName}
          worlds={workspaceWorlds}
          onCreate={onCreateWorld}
          onEdit={onEditWorld}
          onDelete={onDeleteWorld}
        />
      ) : section === "drones" ? (
        <DronesPage
          drones={workspaceDrones}
          onCreate={onCreateDrone}
          onEdit={onEditDrone}
          onDelete={onDeleteDrone}
        />
      ) : section === "starred" ? (
        <StarredPage missions={starredMissions} renderMission={renderRecent} />
      ) : section === "shared" ? (
        <SharedWithMePage
          projects={sharedProjects}
          renderProject={renderSharedProject}
        />
      ) : section === "templates" ? (
        <TemplatesPage
          activeTemplate={activeTemplate}
          templates={filteredTemplates}
          query={query}
          debouncedQuery={debouncedQuery}
          renderTemplate={renderTemplate}
          onQueryChange={onQueryChange}
          onUseTemplate={onUseTemplate}
          onOpenTemplate={setPreviewTemplateId}
        />
      ) : section === "learn" ? (
        <LearnPage />
      ) : section === "aimodels" ? (
        <AIModelsPage
          workspaceName={workspaceName}
          canEditSharedModels={canEditSharedModels}
          currentUserName={currentUserName}
          skytrackModels={skytrackAIModels}
          workspaceModels={workspaceAIModels}
          uploadedModels={uploadedAIModels}
          category={category}
          onCategoryChange={onCategoryChange}
          onImport={onImportAIModel}
          onDelete={onDeleteAIModel}
          onSave={onSaveAIModel}
        />
      ) : section === "logs" ? (
        <LibraryPageLayout
          titleId="ms-lib-logs-title"
          header={
            <PageHeader
              className="sticky top-0 z-20 ms-lib-page-header flex flex-col gap-2 px-6 pb-4 pt-5"
              data-testid="ms-lib-page-header-row"
              title={
                <span
                  id="ms-lib-logs-title"
                  data-testid="ms-lib-page-header-copy"
                >
                  Logs
                </span>
              }
            />
          }
        >
          <Empty>
            <EmptyMedia icon={FolderOpenIcon} />
            <EmptyTitle
              data-testid="ms-lib-empty-title"
              role="heading"
              aria-level={2}
            >
              No logs yet
            </EmptyTitle>
            <EmptyDescription>
              Flight and build activity will appear here.
            </EmptyDescription>
          </Empty>
        </LibraryPageLayout>
      ) : section === "notifications" ? (
        <NotificationsPage />
      ) : (
        <LibraryPageLayout
          titleId="ms-lib-placeholder-title"
          sectionClassName="ms-placeholder max-w-130 border border-border rounded-(--radius) bg-(--card) py-5 px-5.5 flex flex-col gap-2"
          header={
            <PageHeader
              className="sticky top-0 z-20 ms-lib-page-header flex flex-col gap-2 px-6 pb-4 pt-5"
              data-testid="ms-lib-page-header-row"
              title={
                <span
                  id="ms-lib-placeholder-title"
                  data-testid="ms-lib-page-header-copy"
                >
                  {section}
                </span>
              }
            />
          }
        >
          <p className="ms-hint m-0 text-xs text-muted-foreground leading-[1.5]">
            No {section.toLowerCase()} available.
          </p>
          <Button size="sm" variant="outline" onClick={onGoHome}>
            Back to Home
          </Button>
        </LibraryPageLayout>
      )}
      <Dialog
        open={previewTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewTemplateId(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup
            aria-label="Mission template preview"
            className="max-h-[min(90dvh,100%)] overflow-y-auto sm:max-w-3xl"
            data-testid="ms-lib-template-preview-dialog"
          >
            {previewTemplate ? (
              <>
                <DialogHeader>
                  <DialogTitle>{previewTemplate.title}</DialogTitle>
                  <DialogDescription>{previewTemplate.desc}</DialogDescription>
                </DialogHeader>
                <div className="relative aspect-video overflow-hidden rounded-(--radius) border border-border bg-(--muted)">
                  <img
                    src={getTemplateThumbnail(previewTemplate.id)}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
                <TemplateAttribution byline={previewTemplate.byline} />
                <DialogFooter>
                  <DialogClose size="default">Close</DialogClose>
                  <Button
                    size="default"
                    onClick={() => {
                      onUseTemplate(previewTemplate);
                      setPreviewTemplateId(null);
                    }}
                  >
                    Use template
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </section>
  );
}
