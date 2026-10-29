import {
  DRONE_DATA_SOURCE_TYPES,
  type DroneDataSourceType,
  type WorkspaceDroneProfile,
} from "../database/drone-store";
import { NumberField, SelectField, TextField } from "./drone-profile-fields";
import {
  massFromDisplay,
  massToDisplay,
  massUnit,
  speedFromDisplay,
  speedToDisplay,
  speedUnit,
  useMeasurementSystem,
} from "../../../shared/measurement-units";

export function DronePerformanceSourceSection({
  profile,
  onPatch,
}: {
  profile: WorkspaceDroneProfile;
  onPatch: (patch: Partial<WorkspaceDroneProfile>) => void;
}) {
  const unitSystem = useMeasurementSystem();
  return (
    <>
      <section
        className="ms-drone-form-section"
        aria-labelledby="ms-drone-performance-title"
      >
        <div className="ms-drone-section-heading">
          <h2
            id="ms-drone-performance-title"
            className="heading m-0 text-sm font-semibold"
          >
            Performance &amp; payload
          </h2>
          <p className="m-0 text-(--muted-foreground) text-xs leading-[1.5]">
            Optional descriptive values. Leave unknown values blank.
          </p>
        </div>
        <div className="ms-drone-form-grid">
          <NumberField
            label="Maximum flight time"
            value={profile.maxFlightTimeMin}
            unit="min"
            onChange={(maxFlightTimeMin) => onPatch({ maxFlightTimeMin })}
          />
          <NumberField
            label={`Maximum speed (${speedUnit(unitSystem)})`}
            value={
              profile.maxSpeedMps === null
                ? null
                : speedToDisplay(profile.maxSpeedMps, unitSystem)
            }
            unit={speedUnit(unitSystem)}
            onChange={(value) =>
              onPatch({
                maxSpeedMps:
                  value === null ? null : speedFromDisplay(value, unitSystem),
              })
            }
          />
          <NumberField
            label={`Maximum takeoff weight (${massUnit(unitSystem)})`}
            value={
              profile.maxTakeoffWeightKg === null
                ? null
                : massToDisplay(profile.maxTakeoffWeightKg, unitSystem)
            }
            unit={massUnit(unitSystem)}
            onChange={(value) =>
              onPatch({
                maxTakeoffWeightKg:
                  value === null ? null : massFromDisplay(value, unitSystem),
              })
            }
          />
          <NumberField
            label={`Maximum payload (${massUnit(unitSystem)})`}
            value={
              profile.maxPayloadKg === null
                ? null
                : massToDisplay(profile.maxPayloadKg, unitSystem)
            }
            unit={massUnit(unitSystem)}
            onChange={(value) =>
              onPatch({
                maxPayloadKg:
                  value === null ? null : massFromDisplay(value, unitSystem),
              })
            }
          />
        </div>
      </section>

      <section
        className="ms-drone-form-section"
        aria-labelledby="ms-drone-profile-source-title"
      >
        <div className="ms-drone-section-heading">
          <h2
            id="ms-drone-profile-source-title"
            className="heading m-0 text-sm font-semibold"
          >
            Profile source
          </h2>
          <p className="m-0 text-(--muted-foreground) text-xs leading-[1.5]">
            Track the source for platform and performance values. Use component
            sources for component-specific facts.
          </p>
        </div>
        <div className="ms-drone-form-grid">
          <SelectField<DroneDataSourceType>
            label="Data source status"
            value={profile.profileSourceType}
            options={DRONE_DATA_SOURCE_TYPES}
            onChange={(profileSourceType) => onPatch({ profileSourceType })}
          />
          <TextField
            label="Source label"
            value={profile.profileSourceLabel}
            onChange={(profileSourceLabel) => onPatch({ profileSourceLabel })}
            placeholder="e.g. Owner-provided drone profile"
          />
          <TextField
            label="Source date"
            value={profile.profileSourceDate}
            onChange={(profileSourceDate) => onPatch({ profileSourceDate })}
            type="date"
          />
          <TextField
            label="Source URL"
            value={profile.profileSourceUrl}
            onChange={(profileSourceUrl) => onPatch({ profileSourceUrl })}
            placeholder="https://"
            type="url"
          />
        </div>
      </section>
    </>
  );
}
