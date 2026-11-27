import type { WorkspaceDroneProfile } from "@/features/library/database/drone-store";
import type { LibraryResourceEditor } from "@/features/library/workspace/use-library-resource-editors";
import { DronesPage } from "./drones-page";
import DroneProfileEditorPage from "../drone-profile/drone-profile-editor-page";

export function DronesRoutePage({
  drones,
  editor,
  onCreate,
  onEdit,
  onDelete,
  onCancel,
  onSave,
}: {
  drones: WorkspaceDroneProfile[];
  editor: LibraryResourceEditor<WorkspaceDroneProfile>;
  onCreate: () => void;
  onEdit: (drone: WorkspaceDroneProfile) => void;
  onDelete: (droneId: string) => void;
  onCancel: () => void;
  onSave: (profile: WorkspaceDroneProfile) => void;
}) {
  if (editor) {
    return (
      <DroneProfileEditorPage
        mode={editor.mode}
        profile={editor.profile}
        onCancel={onCancel}
        onSave={onSave}
      />
    );
  }

  return (
    <DronesPage
      drones={drones}
      onCreate={onCreate}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
