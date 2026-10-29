import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import type {
  DroneFirmwareFamily,
  WorkspaceDroneProfile,
} from "../database/drone-store";
import { NumberField, SelectField, TextField } from "./drone-profile-fields";
import {
  gramsFromDisplay,
  gramsToDisplay,
  millimetersFromDisplay,
  millimetersToDisplay,
  propellerInchesFromDisplay,
  propellerInchesToDisplay,
  smallLengthUnit,
  useMeasurementSystem,
  weightUnit,
} from "../../../shared/measurement-units";

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
  const unitSystem = useMeasurementSystem();
  return (
    <>
      <section
        className="ms-drone-form-section"
        aria-labelledby="ms-drone-platform-title"
      >
        <div className="ms-drone-section-heading">
          <h2
            id="ms-drone-platform-title"
            className="heading m-0 text-sm font-semibold"
          >
            Platform
          </h2>
          <p className="m-0 text-(--muted-foreground) text-xs leading-[1.5]">
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
            className="heading m-0 text-sm font-semibold"
          >
            Frame &amp; fit
          </h2>
          <p className="m-0 text-(--muted-foreground) text-xs leading-[1.5]">
            Record dimensions for reference. The profile does not validate
            component compatibility.
          </p>
        </div>
        <div className="ms-drone-form-grid">
          <NumberField
            label={`Frame size (${smallLengthUnit(unitSystem)})`}
            value={
              profile.frameSizeMm === null
                ? null
                : millimetersToDisplay(profile.frameSizeMm, unitSystem)
            }
            unit={smallLengthUnit(unitSystem)}
            onChange={(value) =>
              onPatch({
                frameSizeMm:
                  value === null
                    ? null
                    : millimetersFromDisplay(value, unitSystem),
              })
            }
          />
          <NumberField
            label={`Maximum propeller diameter (${unitSystem === "imperial" ? "in" : "mm"})`}
            value={
              profile.maxPropDiameterIn === null
                ? null
                : propellerInchesToDisplay(
                    profile.maxPropDiameterIn,
                    unitSystem,
                  )
            }
            unit={unitSystem === "imperial" ? "in" : "mm"}
            onChange={(value) =>
              onPatch({
                maxPropDiameterIn:
                  value === null
                    ? null
                    : propellerInchesFromDisplay(value, unitSystem),
              })
            }
          />
          <TextField
            label="Motor mount pattern"
            value={profile.motorMountPatternMm}
            onChange={(motorMountPatternMm) => onPatch({ motorMountPatternMm })}
            placeholder={`e.g. 12 × 12 ${smallLengthUnit(unitSystem)}`}
          />
          <TextField
            label="Flight controller / stack mount"
            value={profile.stackMountPatternMm}
            onChange={(stackMountPatternMm) => onPatch({ stackMountPatternMm })}
            placeholder={`e.g. 20 × 20 ${smallLengthUnit(unitSystem)}`}
          />
          <NumberField
            label={`Frame weight (${weightUnit(unitSystem)})`}
            value={
              profile.frameWeightG === null
                ? null
                : gramsToDisplay(profile.frameWeightG, unitSystem)
            }
            unit={weightUnit(unitSystem)}
            onChange={(value) =>
              onPatch({
                frameWeightG:
                  value === null ? null : gramsFromDisplay(value, unitSystem),
              })
            }
          />
        </div>
      </section>
    </>
  );
}
