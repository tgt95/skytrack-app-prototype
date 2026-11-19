import {
  FieldLabel,
  FieldRoot,
} from "skytrack-ui/field";
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

export interface SourceMissionOption {
  id: string;
  projectName: string;
  missionName: string;
}

export function SourceMissionField({
  missions,
  value,
  onChange,
}: {
  missions: SourceMissionOption[];
  value: string;
  onChange: (id: string, label: string) => void;
}) {
  return (
    <FieldRoot className="ms-field flex flex-col gap-1 ms-drone-form-wide col-span-full [@media_(max-width:_45rem)]:col-auto">
      <FieldLabel>Source 2D mission</FieldLabel>
      <Select<string>
        items={missions.map((mission) => ({
          value: mission.id,
          label: `${mission.projectName} · ${mission.missionName}`,
        }))}
        value={value}
        onValueChange={(next: unknown) => {
          const id = String(next);
          const selected = missions.find((mission) => mission.id === id);
          onChange(
            id,
            selected ? `${selected.projectName} · ${selected.missionName}` : "",
          );
        }}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              missions.length
                ? "Select a saved 2D mission"
                : "No saved 2D missions in this Workspace"
            }
          />
          <SelectIcon />
        </SelectTrigger>
        <SelectPortal>
          <SelectPositioner side="bottom" align="start" sideOffset={4}>
            <SelectPopup>
              <SelectList>
                {missions.map((mission) => (
                  <SelectItem key={mission.id} value={mission.id}>
                    <SelectItemIndicator />
                    <SelectItemText>
                      {mission.projectName} · {mission.missionName}
                    </SelectItemText>
                  </SelectItem>
                ))}
              </SelectList>
            </SelectPopup>
          </SelectPositioner>
        </SelectPortal>
      </Select>
    </FieldRoot>
  );
}
