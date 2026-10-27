import StudioLibrary, {
  type LibraryEntry,
  type LibrarySection,
} from "../library/library";

export interface StudioLibraryRouteProps {
  announce: string;
  section: LibrarySection;
  projectId: string | null;
  templateId: string | null;
  sharedMissionId: string | null;
  sharedProjectId: string | null;
  onNavigate: (section: LibrarySection, projectId: string | null) => void;
  onOpenTemplate: (templateId: string | null) => void;
  onOpenSharedAccounts: (missionId: string | null) => void;
  onOpenSharedProject: (projectId: string | null) => void;
  onOpenMission: (entry: LibraryEntry) => void;
  onAnnounce: (message: string) => void;
  onLogout: () => void;
}

export default function StudioLibraryRoute({
  announce,
  section,
  projectId,
  templateId,
  sharedMissionId,
  sharedProjectId,
  onNavigate,
  onOpenTemplate,
  onOpenSharedAccounts,
  onOpenSharedProject,
  onOpenMission,
  onAnnounce,
  onLogout,
}: StudioLibraryRouteProps) {
  return (
    <div className="ms-root" data-testid="ms-root">
      <StudioLibrary
        announce={announce}
        section={section}
        projectId={projectId}
        templateId={templateId}
        sharedMissionId={sharedMissionId}
        sharedProjectId={sharedProjectId}
        onNavigate={onNavigate}
        onOpenTemplate={onOpenTemplate}
        onOpenSharedAccounts={onOpenSharedAccounts}
        onOpenSharedProject={onOpenSharedProject}
        onOpenMission={onOpenMission}
        onAnnounce={onAnnounce}
        onLogout={onLogout}
      />
    </div>
  );
}
