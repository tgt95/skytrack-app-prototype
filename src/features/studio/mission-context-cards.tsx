import {
  CaretDownIcon,
  DroneIcon,
  MapTrifoldIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import {
  Select,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectTrigger,
} from "skytrack-ui/select";
import type { StudioMission } from "../../domain/mission-model";
import { SkyTooltip } from "../../ui/components/sky-tooltip";

export interface DroneChoice {
  value: string;
  label: string;
}

interface MissionContextCardsProps {
  mission: StudioMission;
  droneChoices: DroneChoice[];
  selectedDroneValue: string;
  onSelectVehicle: (droneId: string, label: string) => void;
  onOpenWorldPicker: () => void;
}

export function MissionContextCards({
  mission,
  droneChoices,
  selectedDroneValue,
  onSelectVehicle,
  onOpenWorldPicker,
}: MissionContextCardsProps) {
  return (
    <div
      className=" absolute top-[0.5rem] left-[0.5rem] flex flex-row items-stretch gap-[0.5rem] w-max max-w-[min(40rem,calc(100%-1.5rem))] pointer-events-none [@media_(max-width:_61.25rem)]:top-[0.5rem] [@media_(max-width:_61.25rem)]:left-[0.5rem] [@media_(max-width:_61.25rem)]:gap-[0.375rem] [@media_(max-width:_61.25rem)]:max-w-[min(32.5rem,calc(100%-1rem))] [@media_(max-width:_61.25rem)]:flex-wrap"
      role="group"
      aria-label="Mission context"
    >
      <div
        className="ms-drone-card pointer-events-auto"
        data-testid="ms-drone-card"
      >
        <Select<string>
          items={droneChoices}
          value={selectedDroneValue}
          onValueChange={(value: unknown) => {
            const selected = droneChoices.find(
              (choice) => choice.value === String(value),
            );
            if (selected)
              onSelectVehicle(
                selected.value,
                selected.label.replace(/ \(legacy\)$/, ""),
              );
          }}
        >
          <SelectTrigger
            className="ms-drone-trigger"
            data-testid="ms-drone-select"
            aria-label={`Vehicle: ${mission.vehicle}`}
          >
            <span className="ms-drone-thumb" aria-hidden="true">
              <DroneIcon />
            </span>
            <span className="ms-drone-meta">
              <span className="ms-drone-name-row">
                <span className="ms-drone-name" title={mission.vehicle}>
                  {mission.vehicle}
                </span>
                <CaretDownIcon aria-hidden="true" className="ms-drone-caret" />
              </span>
              <span className="ms-drone-routes">All routes</span>
            </span>
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner side="bottom" align="start" sideOffset={4}>
              <SelectPopup>
                <SelectList>
                  {droneChoices.map((drone) => (
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
        <span
          className=" flex-[0_0_auto] self-stretch w-px m-[0.25rem_0.5rem] bg-(--border) [@media_(max-width:_61.25rem)]:m-[0.25rem_0.375rem]"
          aria-hidden="true"
          data-testid="ms-drone-divider"
        />
        <SkyTooltip>
          <button
            type="button"
            className="ms-drone-add flex-[0_0_auto] self-center inline-flex items-center justify-center w-[2rem] h-[2rem] p-0 [border:0] rounded-(--radius) bg-transparent text-(--muted-foreground) text-[1rem] cursor-not-allowed disabled:opacity-[0.55] [@media_(max-width:_61.25rem)]:w-[2rem] [@media_(max-width:_61.25rem)]:h-[2rem]"
            data-testid="ms-drone-add"
            disabled
            aria-label="Add drone"
            title="Add drone"
          >
            <PlusIcon aria-hidden="true" />
          </button>
        </SkyTooltip>
      </div>
      <div
        className="ms-drone-card  pointer-events-auto"
        data-testid="ms-drone-card"
      >
        <Button
          type="button"
          variant="ghost"
          className="ms-drone-trigger  self-stretch h-auto focus-visible:[outline:0.125rem_solid_var(--primary)] focus-visible:outline-offset-1"
          data-testid="ms-world-select"
          aria-label={`Choose world and mission type; current world ${mission.world}, ${mission.worldType ?? "3D"}`}
          onClick={onOpenWorldPicker}
        >
          <span className="ms-drone-thumb" aria-hidden="true">
            <MapTrifoldIcon />
          </span>
          <span className="ms-drone-meta justify-center">
            <span className="ms-drone-name-row">
              <span className="ms-drone-name" title={mission.world}>
                {mission.world}
              </span>
              <CaretDownIcon aria-hidden="true" className="ms-drone-caret" />
            </span>
            <span className="ms-drone-routes">{mission.worldType ?? "3D"}</span>
          </span>
        </Button>
      </div>
    </div>
  );
}
