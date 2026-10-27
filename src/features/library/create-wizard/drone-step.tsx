import { RadioGroup, RadioRoot } from "skytrack-ui/radio";
import { TabsPanel } from "skytrack-ui/tabs";
import type { WorkspaceDroneProfile } from "../database/drone-store";
import MissionThumbnail from "../mission-thumbnail";

type DroneStepProps = {
  drones: WorkspaceDroneProfile[];
  droneId: string;
  onDroneSelect: (droneId: string) => void;
};

export function DroneStep({ drones, droneId, onDroneSelect }: DroneStepProps) {
  return (
    <TabsPanel value="3" className="ms-wizard-panel">
      <div className="ms-lib-form">
        <div className="ms-field">
          <span className="ms-field-label" id="ms-wizard-drone-label">
            Drone list
          </span>
          <RadioGroup
            value={droneId}
            onValueChange={(value: unknown) => onDroneSelect(String(value))}
            aria-labelledby="ms-wizard-drone-label"
            className="ms-wizard-radio-list"
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
                  className="order-3 ml-auto flex-[0_0_auto] rounded-(--radius)"
                />
              </label>
            ))}
            {drones.length === 0 ? (
              <p className="ms-drone-empty-components">
                Add a Drone profile to this Workspace before creating a mission.
              </p>
            ) : null}
          </RadioGroup>
        </div>
      </div>
    </TabsPanel>
  );
}
