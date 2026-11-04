import type { ReactNode } from "react";
import { Button } from "skytrack-ui/button";
import type { LibMission, LibProject, LibTemplate } from "./database/store";
import type { WorkspaceDroneProfile } from "./database/drone-store";
import type {
  WorkspaceAIModelRecord,
  WorkspaceWorldRecord,
} from "./database/workspace-resources-store";
import {
  LibraryEmptyState,
  LibraryPageHeader,
  LibraryPageLayout,
} from "./cards/library-presentation.tsx";
import type { SharedProject, SharedMission } from "./library-cards";
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
  onOpenTemplate: (templateId: string | null) => void;
  onOpenTemplateDetail: (templateId: string) => void;
  onUseTemplate: (template: LibTemplate) => void;
  onCreateWorld: () => void;
  onEditWorld: (world: WorkspaceWorldRecord) => void;
  onDeleteWorld: (worldId: string) => void;
  onCreateDrone: () => void;
  onEditDrone: (drone: WorkspaceDroneProfile) => void;
  onDeleteDrone: (droneId: string) => void;
  onImportAIModel: () => void;
  onDeleteAIModel: (modelId: string) => void;
  onGoHome: () => void;
}

export default function LibraryMainContent({
  section,
  sharedView,
  activeSharedProject,
  activeProject,
  workspaceName,
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
  onOpenTemplate,
  onOpenTemplateDetail,
  onUseTemplate,
  onCreateWorld,
  onEditWorld,
  onDeleteWorld,
  onCreateDrone,
  onEditDrone,
  onDeleteDrone,
  onImportAIModel,
  onDeleteAIModel,
  onGoHome,
}: LibraryMainContentProps) {
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
          onNavigateProjects={() => onNavigate("projects", null)}
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
          onOpenTemplate={(id) => {
            onNavigate("templates", null);
            onOpenTemplateDetail(id);
          }}
        />
      ) : section === "download" ? (
        <DownloadPage onGoHome={() => onNavigate("home", null)} />
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
          workspaceName={workspaceName}
          drones={workspaceDrones}
          onCreate={onCreateDrone}
          onEdit={onEditDrone}
          onDelete={onDeleteDrone}
        />
      ) : section === "starred" ? (
        <StarredPage
          missions={starredMissions}
          renderMission={(entry, testId) =>
            renderMissionCard(
              entry.projectId,
              entry.project,
              entry.mission,
              testId,
            )
          }
        />
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
          onBack={() => onOpenTemplate(null)}
          onUseTemplate={onUseTemplate}
          onOpenTemplate={onOpenTemplateDetail}
        />
      ) : section === "learn" ? (
        <LearnPage />
      ) : section === "aimodels" ? (
        <AIModelsPage
          workspaceName={workspaceName}
          skytrackModels={skytrackAIModels}
          workspaceModels={workspaceAIModels}
          uploadedModels={uploadedAIModels}
          category={category}
          onCategoryChange={onCategoryChange}
          onImport={onImportAIModel}
          onDelete={onDeleteAIModel}
        />
      ) : section === "logs" ? (
        <LibraryPageLayout
          titleId="ms-lib-logs-title"
          header={
            <LibraryPageHeader titleId="ms-lib-logs-title" title="Logs" />
          }
        >
          <LibraryEmptyState
            title="No logs yet"
            description="Flight and build activity will appear here."
          />
        </LibraryPageLayout>
      ) : section === "notifications" ? (
        <NotificationsPage />
      ) : (
        <LibraryPageLayout
          titleId="ms-lib-placeholder-title"
          sectionClassName="ms-placeholder max-w-130 border border-border rounded-(--radius) bg-(--card) py-5 px-5.5 flex flex-col gap-2"
          header={
            <LibraryPageHeader
              titleId="ms-lib-placeholder-title"
              title={section}
            />
          }
        >
          <p className="ms-hint m-0 text-xs text-(--muted-foreground) leading-[1.5]">No {section.toLowerCase()} available.</p>
          <Button size="sm" variant="outline" onClick={onGoHome}>
            Back to Home
          </Button>
        </LibraryPageLayout>
      )}
    </section>
  );
}
