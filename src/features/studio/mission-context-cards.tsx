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
      className=" absolute top-2 left-2 flex flex-row items-stretch gap-2 w-max max-w-[min(40rem,calc(100%-1.5rem))] pointer-events-none [@media_(max-width:_61.25rem)]:top-2 [@media_(max-width:_61.25rem)]:left-2 [@media_(max-width:_61.25rem)]:gap-1.5 [@media_(max-width:_61.25rem)]:max-w-[min(32.5rem,calc(100%-1rem))] [@media_(max-width:_61.25rem)]:flex-wrap"
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
          className=" flex-[0_0_auto] self-stretch w-px my-1 mx-2 bg-(--border) [@media_(max-width:_61.25rem)]:my-1 [@media_(max-width:_61.25rem)]:mx-1.5"
          aria-hidden="true"
          data-testid="ms-drone-divider"
        />
        <SkyTooltip>
          <button
            type="button"
            className="ms-drone-add flex-[0_0_auto] self-center inline-flex items-center justify-center w-8 h-8 p-0 [border:0] rounded-(--radius) bg-transparent text-(--muted-foreground) text-base cursor-not-allowed disabled:opacity-[0.55] [@media_(max-width:_61.25rem)]:w-8 [@media_(max-width:_61.25rem)]:h-8"
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
          className="ms-drone-trigger  self-stretch h-auto focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1"
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
