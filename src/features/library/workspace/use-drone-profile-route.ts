import { useEffect } from "react";
import type { WorkspaceDroneProfile } from "@/features/library/database/drone-store";
import { newDroneProfile } from "@/features/library/database/drone-store";
import type { LibraryResourceEditor } from "./use-library-resource-editors";

type DroneEditorRoute = { mode: "create" } | { mode: "edit"; droneId: string };

export function useDroneProfileRoute({
  route,
  editor,
  setEditor,
  workspaceId,
  profiles,
  createId,
  onNavigate,
  onAnnounce,
}: {
  route: DroneEditorRoute | null;
  editor: LibraryResourceEditor<WorkspaceDroneProfile>;
  setEditor: (next: LibraryResourceEditor<WorkspaceDroneProfile>) => void;
  workspaceId: string;
  profiles: WorkspaceDroneProfile[];
  createId: () => string;
  onNavigate: () => void;
  onAnnounce: (message: string) => void;
}) {
  useEffect(() => {
    if (!route) {
      if (editor) setEditor(null);
      return;
    }
    if (route.mode === "create") {
      if (editor?.mode !== "create") {
        setEditor({
          mode: "create",
          profile: newDroneProfile(createId(), workspaceId),
        });
      }
      return;
    }
    const profile = profiles.find((item) => item.id === route.droneId);
    if (!profile) {
      setEditor(null);
      onAnnounce("Drone profile not found. Returned to Drones.");
      onNavigate();
      return;
    }
    if (editor?.mode !== "edit" || editor.profile.id !== profile.id) {
      setEditor({ mode: "edit", profile });
    }
  }, [
    createId,
    editor,
    onAnnounce,
    onNavigate,
    profiles,
    route,
    setEditor,
    workspaceId,
  ]);
}
