import { useRef } from "react";
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
import { Tabs, TabsList, TabsTab } from "skytrack-ui/tabs";

interface EditMissionDialogProps {
  restoreDialogFocus: () => HTMLElement | null;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  editName: string;
  editWorldType: "2D" | "3D";
  editWorldId: string;
  editDroneValue: string;
  worldOptions: { id: string; name: string }[];
  selectOptions: { value: string; label: string }[];
  editDroneChoices: { value: string; label: string }[];
  onNameChange: (value: string) => void;
  onWorldTypeChange: (worldType: "2D" | "3D") => void;
  onWorldChange: (value: unknown) => void;
  onDroneChange: (value: unknown) => void;
  onSave: () => void;
}

export function EditMissionDialog({
  restoreDialogFocus,
  editOpen,
  onEditOpenChange,
  editName,
  editWorldType,
  editWorldId,
  editDroneValue,
  worldOptions,
  selectOptions,
  editDroneChoices,
  onNameChange,
  onWorldTypeChange,
  onWorldChange,
  onDroneChange,
  onSave,
}: EditMissionDialogProps) {
  const missionNameRef = useRef<HTMLInputElement | null>(null);

  return (
    <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          aria-label="Edit mission"
          initialFocus={missionNameRef}
          finalFocus={restoreDialogFocus}
        >
          <DialogHeader>
            <DialogTitle className="heading">Edit Mission</DialogTitle>
            <DialogDescription>
              Mission name, world type, World, and vehicle.
            </DialogDescription>
          </DialogHeader>
          <FieldRoot className="ms-field">
            <FieldLabel>Mission name</FieldLabel>
            <FieldControl
              ref={missionNameRef}
              value={editName}
              onValueChange={(value: unknown) => onNameChange(String(value))}
              placeholder="Mission name"
            />
          </FieldRoot>
          <FieldRoot className="ms-field">
            <FieldLabel>World type</FieldLabel>
            <Tabs
              value={editWorldType}
              onValueChange={(value) => {
                if (value === "2D" || value === "3D") {
                  onWorldTypeChange(value);
                }
              }}
              className="w-full max-w-none"
              data-testid="ms-edit-world-type-tabs"
            >
              <TabsList
                variant="filled"
                className="w-full"
                aria-label="Mission World type"
              >
                <TabsTab
                  value="2D"
                  variant="filled"
                  data-testid="ms-edit-world-type-2d"
                >
                  2D Photogrammetry
                </TabsTab>
                <TabsTab
                  value="3D"
                  variant="filled"
                  data-testid="ms-edit-world-type-3d"
                >
                  3D Mission
                </TabsTab>
              </TabsList>
            </Tabs>
            {editWorldType === "2D" ? (
              <span className="text-sm text-muted-foreground">
                2D photogrammetry missions use reconnaissance planning.
              </span>
            ) : null}
          </FieldRoot>
          {editWorldType === "3D" ? (
            <FieldRoot className="ms-field">
              <FieldLabel>World</FieldLabel>
              <Select<string>
                items={selectOptions}
                value={editWorldId}
                onValueChange={onWorldChange}
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
          ) : null}
          <FieldRoot className="ms-field">
            <FieldLabel>Drone</FieldLabel>
            <Select<string>
              items={editDroneChoices}
              value={editDroneValue}
              onValueChange={onDroneChange}
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
            <DialogClose className="w-auto flex-[0_0_auto]">Cancel</DialogClose>
            <Button onClick={onSave} className="w-auto flex-[0_0_auto]">
              Save
            </Button>
          </DialogFooter>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
