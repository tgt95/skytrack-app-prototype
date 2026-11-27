import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "skytrack-ui/card";
import { CheckboxRoot } from "skytrack-ui/checkbox";
import { FieldControl, FieldLabel, FieldRoot } from "skytrack-ui/field";
import { InputAdornment } from "skytrack-ui/input";
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
} from "skytrack-ui/number-field";
import {
  DRONE_CAMERA_SLOTS,
  DRONE_SENSOR_TYPES,
  type DroneOnboardingData,
  type DroneSensorProfile,
} from "@/domain/drone-onboarding";
import { SelectField, TextField } from "./drone-profile-fields";

function DataNumberField({
  id,
  label,
  value,
  unit,
  step = 0.01,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  step?: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <FieldRoot orientation="vertical" className="ms-field flex flex-col gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NumberField
        className="w-full"
        value={value}
        onValueChange={onChange}
        step={step}
      >
        <NumberFieldGroup className="w-full border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <NumberFieldInput id={id} className="w-full min-w-0 flex-1" />
          <InputAdornment
            position="end"
            className="border-s border-input px-2 text-xs"
          >
            {unit}
          </InputAdornment>
        </NumberFieldGroup>
      </NumberField>
    </FieldRoot>
  );
}

function ReadonlyDataField({ label, value }: { label: string; value: string }) {
  return (
    <FieldRoot orientation="vertical" className="ms-field flex flex-col gap-1">
      <FieldLabel>{label}</FieldLabel>
      <FieldControl readOnly value={value} />
    </FieldRoot>
  );
}

function DataCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card as="section">
      <CardHeader>
        <CardTitle as="h2">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function SensorRow({
  sensor,
  index,
  onChange,
  onRemove,
}: {
  sensor: DroneSensorProfile;
  index: number;
  onChange: (sensor: DroneSensorProfile) => void;
  onRemove: () => void;
}) {
  const patch = (values: Partial<DroneSensorProfile>) =>
    onChange({ ...sensor, ...values });
  return (
    <section className="flex flex-col gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <strong>{sensor.sensorType}</strong>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Remove sensor ${index + 1}`}
          onClick={onRemove}
        >
          <XIcon aria-hidden="true" /> Remove
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField
          label="Sensor type"
          value={sensor.sensorType}
          options={DRONE_SENSOR_TYPES}
          onChange={(sensorType) => patch({ sensorType })}
        />
        <SelectField
          label="Camera slot"
          value={sensor.cameraSlot}
          options={DRONE_CAMERA_SLOTS}
          onChange={(cameraSlot) => patch({ cameraSlot })}
        />
        <DataNumberField
          id={`sensor-${sensor.id}-frequency`}
          label="Frequency"
          value={sensor.frequencyHz}
          unit="Hz"
          step={1}
          onChange={(frequencyHz) =>
            frequencyHz !== null && patch({ frequencyHz })
          }
        />
        <FieldRoot className="flex flex-row items-center gap-2">
          <FieldLabel className="flex items-center gap-2 font-normal">
            <CheckboxRoot
              checked={sensor.enabled}
              onCheckedChange={(checked) =>
                patch({ enabled: checked === true })
              }
            />
            Sensor on
          </FieldLabel>
        </FieldRoot>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(
          [
            ["positionX", "Position X", "m"],
            ["positionY", "Position Y", "m"],
            ["positionZ", "Position Z", "m"],
            ["yawDeg", "Yaw", "°"],
            ["pitchDeg", "Pitch", "°"],
            ["fovDeg", "FOV", "°"],
            ["nearM", "Near", "m"],
            ["farM", "Far", "m"],
          ] as const
        ).map(([key, label, unit]) => (
          <DataNumberField
            key={key}
            id={`sensor-${sensor.id}-${key}`}
            label={label}
            value={sensor[key]}
            unit={unit}
            onChange={(value) => value !== null && patch({ [key]: value })}
          />
        ))}
      </div>
    </section>
  );
}

export function DroneOnboardingFields({
  section,
  data,
  totalMassKg,
  onPatch,
  onAddSensor,
  onRemoveSensor,
  onPatchSensor,
}: {
  section: "sensors" | "calibration" | "appearance";
  data: DroneOnboardingData;
  totalMassKg: number;
  onPatch: (patch: Partial<DroneOnboardingData>) => void;
  onAddSensor: () => void;
  onRemoveSensor: (id: string) => void;
  onPatchSensor: (sensor: DroneSensorProfile) => void;
}) {
  const patchCalibration = (
    patch: Partial<DroneOnboardingData["calibration"]>,
  ) => onPatch({ calibration: { ...data.calibration, ...patch } });
  return (
    <div className="flex flex-col gap-4">
      {section === "sensors" && (
        <>
          <DataCard title="Sensors">
            <p className="m-0 text-muted-foreground text-sm">
              Sensor positions and orientation are measured from the unloaded
              body centre.
            </p>
            {data.sensors.map((sensor, index) => (
              <SensorRow
                key={sensor.id}
                sensor={sensor}
                index={index}
                onChange={onPatchSensor}
                onRemove={() => onRemoveSensor(sensor.id)}
              />
            ))}
            <Button type="button" variant="secondary" onClick={onAddSensor}>
              <PlusIcon aria-hidden="true" /> Add sensor
            </Button>
          </DataCard>
          <DataCard title="Sensor noise">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <TextField
                label="IMU noise / bias drift"
                value={data.sensorNoise.imuNoiseBiasDrift}
                onChange={(imuNoiseBiasDrift) =>
                  onPatch({
                    sensorNoise: { ...data.sensorNoise, imuNoiseBiasDrift },
                  })
                }
                placeholder="Not set"
              />
              <TextField
                label="GPS error margin"
                value={data.sensorNoise.gpsErrorMargin}
                onChange={(gpsErrorMargin) =>
                  onPatch({
                    sensorNoise: { ...data.sensorNoise, gpsErrorMargin },
                  })
                }
                placeholder="Not set"
              />
              <TextField
                label="System latency"
                value={data.sensorNoise.systemLatency}
                onChange={(systemLatency) =>
                  onPatch({
                    sensorNoise: { ...data.sensorNoise, systemLatency },
                  })
                }
                placeholder="Not set"
              />
            </div>
          </DataCard>
        </>
      )}
      {section === "calibration" && (
        <DataCard title="Calibration">
          <SelectField
            label="Calibration source"
            value={data.calibration.source}
            options={["derived", "measured"] as const}
            formatOption={(value) =>
              value === "derived" ? "Derived from geometry" : "Measured"
            }
            onChange={(source) => patchCalibration({ source })}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReadonlyDataField
              label="Takeoff mass with battery and payload"
              value={`${totalMassKg.toFixed(2)} kg`}
            />
            {data.calibration.source === "measured" && (
              <TextField
                label="Measured on"
                value={data.calibration.measuredOn}
                onChange={(measuredOn) => patchCalibration({ measuredOn })}
                type="date"
              />
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(
              [
                ["centerOfMassX", "CoG X", "m"],
                ["centerOfMassY", "CoG Y", "m"],
                ["centerOfMassZ", "CoG Z", "m"],
                ["ixx", "Ixx", "kg·m²"],
                ["iyy", "Iyy", "kg·m²"],
                ["izz", "Izz", "kg·m²"],
              ] as const
            ).map(([key, label, unit]) =>
              data.calibration.source === "measured" ? (
                <DataNumberField
                  key={key}
                  id={`calibration-${key}`}
                  label={label}
                  value={data.calibration[key]}
                  unit={unit}
                  onChange={(value) => patchCalibration({ [key]: value })}
                />
              ) : (
                <ReadonlyDataField key={key} label={label} value="—" />
              ),
            )}
          </div>
        </DataCard>
      )}
      {section === "appearance" && (
        <DataCard title="Appearance">
          <ReadonlyDataField
            label="Model representation"
            value="Generated (8-bit)"
          />
          <ReadonlyDataField label="Size control" value="Match profile" />
        </DataCard>
      )}
    </div>
  );
}
