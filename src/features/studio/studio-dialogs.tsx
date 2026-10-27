import { memo, useEffect, useState } from "react";
import type { StudioMission } from "../../domain/mission-model";
import type { WorkspaceWorldRecord } from "../library/database/workspace-resources-store";
import type { WorkspaceDroneProfile } from "../library/database/drone-store";
import { EditMissionDialog } from "./edit-mission-dialog";
import { MissionWorldPickerDialog } from "./mission-world-picker-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";

export type MissionWorldOption = Omit<WorkspaceWorldRecord, "status"> & {
  status: WorkspaceWorldRecord["status"] | "Legacy";
};

interface EditMissionDraft {
  name: string;
  world: string;
  worldId: string;
  vehicle: string;
  droneId: string;
}

interface StudioDialogsProps {
  mission: StudioMission;
  restoreDialogFocus: () => HTMLElement | null;
  worldOptions: MissionWorldOption[];
  droneProfiles: WorkspaceDroneProfile[];
  worldPickerOpen: boolean;
  onWorldPickerOpenChange: (open: boolean) => void;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  shortcutsOpen: boolean;
  onShortcutsOpenChange: (open: boolean) => void;
  onSelectWorld: (worldId: string) => void;
  onSelectWorldType: (worldType: "2D" | "3D") => void;
  onSaveEdit: (draft: EditMissionDraft) => void;
}

function StudioDialogs({
  mission,
  restoreDialogFocus,
  worldOptions,
  droneProfiles,
  worldPickerOpen,
  onWorldPickerOpenChange,
  editOpen,
  onEditOpenChange,
  shortcutsOpen,
  onShortcutsOpenChange,
  onSelectWorld,
  onSelectWorldType,
  onSaveEdit,
}: StudioDialogsProps) {
  const [editName, setEditName] = useState(mission.name);
  const [editWorld, setEditWorld] = useState(mission.world);
  const [editWorldId, setEditWorldId] = useState("");
  const [editVehicle, setEditVehicle] = useState(mission.vehicle);
  const [editDroneId, setEditDroneId] = useState(mission.droneId ?? "");

  useEffect(() => {
    if (!editOpen) return;
    const selectedWorld =
      worldOptions.find((world) => world.id === mission.worldId) ??
      worldOptions.find((world) => world.name === mission.world);
    setEditName(mission.name);
    setEditWorld(mission.world);
    setEditWorldId(selectedWorld?.id ?? "");
    setEditVehicle(mission.vehicle);
    setEditDroneId(
      mission.droneId ??
        droneProfiles.find((profile) => profile.name === mission.vehicle)?.id ??
        "",
    );
  }, [droneProfiles, editOpen, mission, worldOptions]);

  const selectedDrone =
    droneProfiles.find((profile) => profile.id === editDroneId) ??
    droneProfiles.find((profile) => profile.name === editVehicle);
  const editDroneValue = selectedDrone?.id ?? `legacy:${editVehicle}`;
  const editDroneChoices = [
    ...droneProfiles.map((profile) => ({
      value: profile.id,
      label: profile.name,
    })),
    ...(!selectedDrone && editVehicle
      ? [{ value: editDroneValue, label: `${editVehicle} (legacy)` }]
      : []),
  ];
  const selectOptions = worldOptions.map((world) => ({
    value: world.id,
    label: world.name,
  }));

  const saveEdit = () => {
    onSaveEdit({
      name: editName,
      world: editWorld,
      worldId: editWorldId,
      vehicle: editVehicle,
      droneId: editDroneId,
    });
    onEditOpenChange(false);
  };

  const handleEditWorldChange = (value: unknown) => {
    const id = String(value);
    setEditWorldId(id);
    const selected = worldOptions.find((world) => world.id === id);
    if (selected) setEditWorld(selected.name);
  };

  const handleEditDroneChange = (value: unknown) => {
    const profile = droneProfiles.find((item) => item.id === String(value));
    if (profile) {
      setEditDroneId(profile.id);
      setEditVehicle(profile.name);
    }
  };

  return (
    <>
      <MissionWorldPickerDialog
        mission={mission}
        restoreDialogFocus={restoreDialogFocus}
        worldOptions={worldOptions}
        selectOptions={selectOptions}
        worldPickerOpen={worldPickerOpen}
        onWorldPickerOpenChange={onWorldPickerOpenChange}
        onSelectWorld={onSelectWorld}
        onSelectWorldType={onSelectWorldType}
      />
      <EditMissionDialog
        restoreDialogFocus={restoreDialogFocus}
        editOpen={editOpen}
        onEditOpenChange={onEditOpenChange}
        editName={editName}
        editWorldId={editWorldId}
        editDroneValue={editDroneValue}
        worldOptions={worldOptions}
        selectOptions={selectOptions}
        editDroneChoices={editDroneChoices}
        onNameChange={setEditName}
        onWorldChange={handleEditWorldChange}
        onDroneChange={handleEditDroneChange}
        onSave={saveEdit}
      />
      <ShortcutsDialog
        restoreDialogFocus={restoreDialogFocus}
        shortcutsOpen={shortcutsOpen}
        onShortcutsOpenChange={onShortcutsOpenChange}
      />
    </>
  );
}

export default memo(StudioDialogs);
