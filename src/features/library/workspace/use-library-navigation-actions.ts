import type { LibProject, LibTemplate } from "../database/store";
import { getWorkspace, saveActiveWorkspaceId } from "./workspace-data.ts";
import type { LibrarySection } from "../library-types";
import type { DroneProfileEditorRoute } from "../router";

export type LibraryNavigate = (
  section: LibrarySection,
  projectId: string | null,
  droneEditor?: DroneProfileEditorRoute,
) => void;

export function useLibraryNavigationActions({
  onNavigate,
  onAnnounce,
  setActiveWorkspaceId,
  workspaceProjects,
  openCreateWizard,
  onOpenTemplate,
}: {
  onNavigate: LibraryNavigate;
  onAnnounce: (message: string) => void;
  setActiveWorkspaceId: (id: string) => void;
  workspaceProjects: LibProject[];
  openCreateWizard: (projectId?: string, title?: string) => void;
  onOpenTemplate: (templateId: string | null) => void;
}) {
  const goto = (next: LibrarySection) => {
    onNavigate(next, null);
    onAnnounce(`${next === "home" ? "Home" : next} opened.`);
  };

  const switchWorkspace = (id: string) => {
    const nextWorkspace = getWorkspace(id);
    setActiveWorkspaceId(nextWorkspace.id);
    saveActiveWorkspaceId(nextWorkspace.id);
    onNavigate("projects", null);
    onAnnounce(`${nextWorkspace.name} selected. Workspace resources updated.`);
  };

  const useTemplate = (template: LibTemplate) => {
    const target = workspaceProjects[0];
    if (!target) {
      onAnnounce("Create a project first.");
      return;
    }
    onOpenTemplate(null);
    openCreateWizard(target.id, template.title);
    onAnnounce(`${template.title} added to ${target.name}.`);
  };

  return { goto, switchWorkspace, useTemplate };
}
