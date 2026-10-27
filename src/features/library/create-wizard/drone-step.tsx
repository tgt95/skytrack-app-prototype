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
      <div className="ms-lib-form">
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
              <label key={drone.id} className="ms-wizard-radio-row">
                <span className="ms-wizard-thumb" aria-hidden="true">
                  <MissionThumbnail />
                </span>
                <span className="ms-wizard-row-text">
                  {drone.name}
                  <span className="ms-wizard-tags">
                    <span className="ms-wizard-tag">
                      {drone.firmwareFamily === "Unspecified"
                        ? "Firmware not specified"
                        : drone.firmwareFamily}
                    </span>
                    {drone.flightControllerModel ? (
                      <span className="ms-wizard-tag">
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
              <p className="ms-drone-empty-components">
                Add a Drone profile to this Workspace before creating a mission.
              </p>
            ) : null}
          </RadioGroup>
        </FieldRoot>
      </div>
    </TabsPanel>
  );
}
