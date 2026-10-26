import { memo, useEffect, useState } from "react";
import { Badge } from "skytrack-ui/badge";
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
import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import {
  Select,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "skytrack-ui/select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "skytrack-ui/tabs";
import type { StudioMission } from "../../domain/mission-model";
import type { WorkspaceWorldRecord } from "../library/database/workspace-resources-store";
import type { WorkspaceDroneProfile } from "../library/database/drone-store";

export type MissionWorldOption = Omit<WorkspaceWorldRecord, "status"> & {
  status: WorkspaceWorldRecord["status"] | "Legacy";
};

const SHORTCUT_GROUPS: {
  title: string;
  shortcuts: { keys: string; what: string }[];
}[] = [
  {
    title: "Workspace & tools",
    shortcuts: [
      { keys: "1 / 2", what: "Design / Simulation stage" },
      {
        keys: "A / R / N / H",
        what: "Area / Route / Avoid-zone / Home tool (Design)",
      },
      { keys: "C", what: "Toggle Design / Code view (Design)" },
      {
        keys: "Esc",
        what: "Close settings, cancel drawing, then clear selection",
      },
    ],
  },
  {
    title: "Simulation",
    shortcuts: [
      { keys: "Space", what: "Start / Abort simulation" },
      { keys: "P", what: "Pause / Resume simulation" },
      { keys: "D / E", what: "Mission details / Events tab" },
      { keys: "L", what: "Go to Console tab, Code mode only" },
      { keys: "V", what: "Toggle LiDAR preview" },
    ],
  },
  {
    title: "Scene & view",
    shortcuts: [
      { keys: "+ / −", what: "Zoom 3D scene" },
      { keys: "0", what: "Reset camera" },
      { keys: "F", what: "Focus vehicle / selected point" },
      { keys: "\\", what: "Collapse / expand inspector" },
    ],
  },
  {
    title: "Editing & history",
    shortcuts: [
      { keys: "Delete", what: "Delete selection (Design)" },
      {
        keys: "Z + drag · ⇧ + drag · drag",
        what: "Waypoint altitude (Z or Shift, ground-clamped) · move waypoint, Z kept (Design)",
      },
      { keys: "Ctrl/⌘+S", what: "Save local state" },
      { keys: "Ctrl/⌘+Z · ⇧+Ctrl/⌘+Z", what: "Undo / redo design edit" },
    ],
  },
];

interface EditMissionDraft {
  name: string;
  world: string;
  worldId: string;
  vehicle: string;
  droneId: string;
}

interface StudioDialogsProps {
  mission: StudioMission;
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

  return (
    <>
      <Dialog open={worldPickerOpen} onOpenChange={onWorldPickerOpenChange}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup
            aria-label={
              mission.worldType === "2D"
                ? "Choose mission type"
                : "Choose mission type and world"
            }
            data-testid="ms-world-picker"
          >
            <DialogHeader>
              <DialogTitle className="heading">
                {mission.worldType === "2D"
                  ? "Choose mission type"
                  : "Choose mission type and world"}
              </DialogTitle>
              <DialogDescription>
                Photogrammetry missions use reconnaissance planning. Legacy 3D
                missions keep the original design flow.
              </DialogDescription>
            </DialogHeader>
            <FieldRoot className="ms-field">
              <FieldLabel>Mission type and World</FieldLabel>
              <Tabs
                value={mission.worldType ?? "3D"}
                onValueChange={(value) => {
                  if (value === "2D" || value === "3D")
                    onSelectWorldType(value);
                }}
                className=" gap-4 w-full max-w-none"
                data-testid="ms-world-type-tabs"
              >
                <TabsList
                  variant="filled"
                  className=" w-full"
                  aria-label="Mission type"
                >
                  <TabsTab
                    value="2D"
                    variant="filled"
                    className="ms-world-type-tab"
                  >
                    2D Photogrammetry
                  </TabsTab>
                  <TabsTab
                    value="3D"
                    variant="filled"
                    className="ms-world-type-tab"
                  >
                    3D Mission
                  </TabsTab>
                </TabsList>
                <TabsPanel value="2D" className="ms-world-type-panel pb-2">
                  <span className="text-sm text-muted-foreground">
                    Photogrammetry missions use reconnaissance planning
                  </span>
                  <span className="ms-sr">
                    2D photogrammetry does not require selecting a World.
                  </span>
                </TabsPanel>
                <TabsPanel value="3D" className="ms-world-type-panel pb-2">
                  <FieldRoot className="ms-field">
                    <FieldLabel>World</FieldLabel>
                    <Select<string>
                      items={selectOptions}
                      value={
                        worldOptions.find(
                          (world) =>
                            world.id === mission.worldId ||
                            world.name === mission.world,
                        )?.id ?? ""
                      }
                      onValueChange={(value: unknown) =>
                        onSelectWorld(String(value))
                      }
                    >
                      <SelectTrigger data-testid="ms-world-picker-select">
                        <SelectValue />
                        <SelectIcon />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectPositioner
                          side="bottom"
                          align="start"
                          sideOffset={4}
                        >
                          <SelectPopup>
                            <SelectList>
                              {worldOptions.map((world) => (
                                <SelectItem key={world.id} value={world.id}>
                                  <SelectItemIndicator />
                                  <SelectItemText>{world.name}</SelectItemText>
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                  </FieldRoot>
                </TabsPanel>
              </Tabs>
            </FieldRoot>
            <DialogFooter>
              <DialogClose className="w-auto flex-[0_0_auto]">Done</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup aria-label="Edit mission">
            <DialogHeader>
              <DialogTitle className="heading">Edit Mission</DialogTitle>
              <DialogDescription>World and vehicle.</DialogDescription>
            </DialogHeader>
            <FieldRoot className="ms-field">
              <FieldLabel>Mission name</FieldLabel>
              <FieldControl
                value={editName}
                onValueChange={(value: unknown) => setEditName(String(value))}
                placeholder="Mission name"
              />
            </FieldRoot>
            <FieldRoot className="ms-field">
              <FieldLabel>World</FieldLabel>
              <Select<string>
                items={selectOptions}
                value={editWorldId}
                onValueChange={(value: unknown) => {
                  const id = String(value);
                  setEditWorldId(id);
                  const selected = worldOptions.find(
                    (world) => world.id === id,
                  );
                  if (selected) setEditWorld(selected.name);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner side="bottom" align="start" sideOffset={4}>
                    <SelectPopup>
                      <SelectList>
                        {worldOptions.map((world) => (
                          <SelectItem key={world.id} value={world.id}>
                            <SelectItemIndicator />
                            <SelectItemText>{world.name}</SelectItemText>
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </Select>
            </FieldRoot>
            <FieldRoot className="ms-field">
              <FieldLabel>Vehicle</FieldLabel>
              <Select<string>
                items={editDroneChoices}
                value={editDroneValue}
                onValueChange={(value: unknown) => {
                  const profile = droneProfiles.find(
                    (item) => item.id === String(value),
                  );
                  if (profile) {
                    setEditDroneId(profile.id);
                    setEditVehicle(profile.name);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner side="bottom" align="start" sideOffset={4}>
                    <SelectPopup>
                      <SelectList>
                        {editDroneChoices.map((drone) => (
                          <SelectItem key={drone.value} value={drone.value}>
                            <SelectItemIndicator />
                            <SelectItemText>{drone.label}</SelectItemText>
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </Select>
            </FieldRoot>
            <DialogFooter>
              <DialogClose className="w-auto flex-[0_0_auto]">
                Cancel
              </DialogClose>
              <Button onClick={saveEdit} className="w-auto flex-[0_0_auto]">
                Save
              </Button>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={onShortcutsOpenChange}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup
            aria-label="Keyboard shortcuts"
            className=" w-[min(56rem,calc(100vw-2rem))] max-w-none max-h-[calc(100dvh-2rem)] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle className="heading">Keyboard shortcuts</DialogTitle>
              <DialogDescription>
                Shortcuts are ignored while typing in fields or the code editor.
              </DialogDescription>
            </DialogHeader>
            <div
              className=" grid grid-cols-[minmax(0,1fr)] gap-[1.25rem]"
              data-testid="ms-shortcut-groups"
            >
              {SHORTCUT_GROUPS.map((group) => (
                <section
                  key={group.title}
                  className=" min-w-0"
                  aria-labelledby={`ms-shortcuts-${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
                  data-testid="ms-shortcut-group"
                >
                  <h3
                    id={`ms-shortcuts-${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
                    className="heading m-[0_0_0.625rem] pt-[0.625rem] [border-top:0.0625rem_solid_var(--border)] text-[0.9375rem] font-semibold leading-[1.4]"
                  >
                    {group.title}
                  </h3>
                  <ul className="ms-shortcuts [list-style:none] m-0 p-0 flex flex-col gap-[0.625rem]">
                    {group.shortcuts.map((shortcut) => (
                      <li
                        key={shortcut.keys}
                        className={
                          ' flex min-w-0 gap-[0.75rem] items-center justify-between text-[0.875rem] leading-[1.4] **:data-[slot="badge-count"]:flex-[0_0_auto] **:data-[slot="badge-count"]:whitespace-nowrap'
                        }
                        data-testid="ms-shortcut-row"
                      >
                        <span>{shortcut.what}</span>
                        <Badge count={shortcut.keys} status="outline" />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <DialogFooter>
              <DialogClose className="w-auto flex-[0_0_auto]">
                Close
              </DialogClose>
            </DialogFooter>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}

export default memo(StudioDialogs);
