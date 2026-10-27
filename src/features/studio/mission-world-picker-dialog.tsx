import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "skytrack-ui/dialog";
import { FieldLabel, FieldRoot } from "skytrack-ui/field";
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

interface MissionWorldPickerDialogProps {
  restoreDialogFocus: () => HTMLElement | null;
  mission: Pick<StudioMission, "world" | "worldId" | "worldType">;
  worldOptions: { id: string; name: string }[];
  selectOptions: { value: string; label: string }[];
  worldPickerOpen: boolean;
  onWorldPickerOpenChange: (open: boolean) => void;
  onSelectWorld: (worldId: string) => void;
  onSelectWorldType: (worldType: "2D" | "3D") => void;
}

export function MissionWorldPickerDialog({
  restoreDialogFocus,
  mission,
  worldOptions,
  selectOptions,
  worldPickerOpen,
  onWorldPickerOpenChange,
  onSelectWorld,
  onSelectWorldType,
}: MissionWorldPickerDialogProps) {
  return (
    <Dialog open={worldPickerOpen} onOpenChange={onWorldPickerOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          aria-label={
            mission.worldType === "2D"
              ? "Choose mission type"
              : "Choose mission type and world"
          }
          finalFocus={restoreDialogFocus}
          data-testid="ms-world-picker"
        >
          <DialogHeader>
            <DialogTitle className="heading">Choose world</DialogTitle>
          </DialogHeader>
          <FieldRoot>
            <FieldLabel>World type</FieldLabel>
            <Tabs
              value={mission.worldType ?? "3D"}
              onValueChange={(value) => {
                if (value === "2D" || value === "3D") onSelectWorldType(value);
              }}
              className="w-full max-w-none"
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
                  2D photogrammetry missions use reconnaissance planning
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
  );
}
