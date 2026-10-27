import {
  DRONE_DATA_SOURCE_TYPES,
  type DroneDataSourceType,
  type WorkspaceDroneProfile,
} from "../database/drone-store";
import { NumberField, SelectField, TextField } from "./drone-profile-fields";

export function DronePerformanceSourceSection({
  profile,
  onPatch,
}: {
  profile: WorkspaceDroneProfile;
  onPatch: (patch: Partial<WorkspaceDroneProfile>) => void;
}) {
  return (
    <>
      <section
        className="ms-drone-form-section"
        aria-labelledby="ms-drone-performance-title"
      >
        <div className="ms-drone-section-heading">
          <h2
            id="ms-drone-performance-title"
            className="heading m-0 text-[0.875rem] font-semibold"
          >
            Performance &amp; payload
          </h2>
          <p className="m-0 text-(--muted-foreground) text-[0.75rem] leading-[1.5]">
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
            label="Maximum speed"
            value={profile.maxSpeedMps}
            unit="m/s"
            onChange={(maxSpeedMps) => onPatch({ maxSpeedMps })}
          />
          <NumberField
            label="Maximum takeoff weight"
            value={profile.maxTakeoffWeightKg}
            unit="kg"
            onChange={(maxTakeoffWeightKg) => onPatch({ maxTakeoffWeightKg })}
          />
          <NumberField
            label="Maximum payload"
            value={profile.maxPayloadKg}
            unit="kg"
            onChange={(maxPayloadKg) => onPatch({ maxPayloadKg })}
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
            className="heading m-0 text-[0.875rem] font-semibold"
          >
            Profile source
          </h2>
          <p className="m-0 text-(--muted-foreground) text-[0.75rem] leading-[1.5]">
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
