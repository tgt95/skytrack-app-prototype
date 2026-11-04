import { RadioGroup, RadioRoot } from "skytrack-ui/radio";
import { FieldLabel, FieldRoot } from "skytrack-ui/field";
import { TabsPanel } from "skytrack-ui/tabs";
import type { WorkspaceDroneProfile } from "../database/drone-store";
import MissionThumbnail from "../cards/mission-thumbnail.tsx";

type DroneStepProps = {
  drones: WorkspaceDroneProfile[];
  droneId: string;
  onDroneSelect: (droneId: string) => void;
};

export function DroneStep({ drones, droneId, onDroneSelect }: DroneStepProps) {
  return (
    <TabsPanel value="3">
      <div className="ms-lib-form flex flex-col gap-3 py-1 px-0">
        <FieldRoot name="wizard-drone">
          <FieldLabel id="ms-wizard-drone-label">
            Drone list
          </FieldLabel>
          <RadioGroup
            value={droneId}
            onValueChange={(value: unknown) => onDroneSelect(String(value))}
            aria-labelledby="ms-wizard-drone-label"
            className='w-full'
          >
            {drones.map((drone) => (
              <label key={drone.id} className="ms-wizard-radio-row flex items-center gap-2.5 w-full box-border py-2.5 px-3 border border-border rounded-(--radius) bg-(--card) cursor-pointer text-[0.8125rem] hover:border-(--primary) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1 focus-within:outline-2 focus-within:outline-(--primary) focus-within:outline-offset-1">
                <span className="ms-wizard-thumb flex-[0_0_auto] w-10 h-10 rounded-none bg-(--muted) overflow-hidden" aria-hidden="true">
                  <MissionThumbnail />
                </span>
                <span className="ms-wizard-row-text flex-[1_1_auto] min-w-0 font-medium">
                  {drone.name}
                  <span className="ms-wizard-tags flex gap-1.5 mt-1">
                    <span className="ms-wizard-tag text-[0.6875rem] font-semibold py-0.25 px-2 rounded-(--radius) bg-(--muted) text-(--muted-foreground)">
                      {drone.firmwareFamily === "Unspecified"
                        ? "Firmware not specified"
                        : drone.firmwareFamily}
                    </span>
                    {drone.flightControllerModel ? (
                      <span className="ms-wizard-tag text-[0.6875rem] font-semibold py-0.25 px-2 rounded-(--radius) bg-(--muted) text-(--muted-foreground)">
                        {drone.flightControllerModel}
                      </span>
                    ) : null}
                  </span>
                </span>
                <RadioRoot
                  value={drone.id}
                  aria-label={drone.name}
                />
              </label>
            ))}
            {drones.length === 0 ? (
              <p className="ms-drone-empty-components m-0 text-(--muted-foreground) text-xs leading-[1.5]">
                Add a Drone profile to this Workspace before creating a mission.
              </p>
            ) : null}
          </RadioGroup>
        </FieldRoot>
      </div>
    </TabsPanel>
  );
}
