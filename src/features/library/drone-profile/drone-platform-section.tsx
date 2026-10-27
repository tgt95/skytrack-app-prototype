import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import type {
  DroneFirmwareFamily,
  WorkspaceDroneProfile,
} from "../database/drone-store";
import { NumberField, SelectField, TextField } from "./drone-profile-fields";

const FIRMWARE_FAMILIES: DroneFirmwareFamily[] = [
  "PX4",
  "ArduPilot",
  "DJI",
  "Other",
  "Unspecified",
];

export function DronePlatformSection({
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
        aria-labelledby="ms-drone-platform-title"
      >
        <div className="ms-drone-section-heading">
          <h2
            id="ms-drone-platform-title"
            className="heading m-0 text-[0.875rem] font-semibold"
          >
            Platform
          </h2>
          <p className="m-0 text-(--muted-foreground) text-[0.75rem] leading-[1.5]">
            Leave details blank when they have not been confirmed.
          </p>
        </div>
        <div className="ms-drone-form-grid">
          <FieldRoot className="ms-field">
            <FieldLabel>Drone name</FieldLabel>
            <FieldControl
              value={profile.name}
              onValueChange={(value: unknown) =>
                onPatch({ name: String(value) })
              }
              placeholder="e.g. Mini-Pro"
            />
          </FieldRoot>
          <TextField
            label="Primary use case"
            value={profile.missionUseCase}
            onChange={(missionUseCase) => onPatch({ missionUseCase })}
            placeholder="e.g. Mapping, inspection, long endurance"
          />
          <SelectField<DroneFirmwareFamily>
            label="Flight firmware"
            value={profile.firmwareFamily}
            options={FIRMWARE_FAMILIES}
            onChange={(firmwareFamily) => onPatch({ firmwareFamily })}
          />
          <FieldRoot className="ms-field">
            <FieldLabel>Flight controller</FieldLabel>
            <FieldControl
              value={profile.flightControllerModel}
              onValueChange={(value: unknown) =>
                onPatch({ flightControllerModel: String(value) })
              }
              placeholder="Not specified"
            />
          </FieldRoot>
          <FieldRoot className="ms-field">
            <FieldLabel>Firmware version</FieldLabel>
            <FieldControl
              value={profile.firmwareVersion}
              onValueChange={(value: unknown) =>
                onPatch({ firmwareVersion: String(value) })
              }
              placeholder="Not specified"
            />
          </FieldRoot>
          <FieldRoot className="ms-field ms-drone-form-wide">
            <FieldLabel>Airframe</FieldLabel>
            <FieldControl
              value={profile.airframe}
              onValueChange={(value: unknown) =>
                onPatch({ airframe: String(value) })
              }
              placeholder="Not specified"
            />
          </FieldRoot>
          <FieldRoot className="ms-field ms-drone-form-wide">
            <FieldLabel>Reference build note</FieldLabel>
            <FieldControl
              value={profile.referenceBuildNote}
              onValueChange={(value: unknown) =>
                onPatch({ referenceBuildNote: String(value) })
              }
              placeholder="Optional note"
            />
          </FieldRoot>
        </div>
      </section>

      <section
        className="ms-drone-form-section"
        aria-labelledby="ms-drone-fit-title"
      >
        <div className="ms-drone-section-heading">
          <h2
            id="ms-drone-fit-title"
            className="heading m-0 text-[0.875rem] font-semibold"
          >
            Frame &amp; fit
          </h2>
          <p className="m-0 text-(--muted-foreground) text-[0.75rem] leading-[1.5]">
            Record dimensions for reference. The profile does not validate
            component compatibility.
          </p>
        </div>
        <div className="ms-drone-form-grid">
          <NumberField
            label="Frame size"
            value={profile.frameSizeMm}
            unit="mm"
            onChange={(frameSizeMm) => onPatch({ frameSizeMm })}
          />
          <NumberField
            label="Maximum propeller diameter"
            value={profile.maxPropDiameterIn}
            unit="in"
            onChange={(maxPropDiameterIn) => onPatch({ maxPropDiameterIn })}
          />
          <TextField
            label="Motor mount pattern"
            value={profile.motorMountPatternMm}
            onChange={(motorMountPatternMm) => onPatch({ motorMountPatternMm })}
            placeholder="e.g. 12 × 12 mm"
          />
          <TextField
            label="Flight controller / stack mount"
            value={profile.stackMountPatternMm}
            onChange={(stackMountPatternMm) => onPatch({ stackMountPatternMm })}
            placeholder="e.g. 20 × 20 mm"
          />
          <NumberField
            label="Frame weight"
            value={profile.frameWeightG}
            unit="g"
            onChange={(frameWeightG) => onPatch({ frameWeightG })}
          />
        </div>
      </section>
    </>
  );
}
