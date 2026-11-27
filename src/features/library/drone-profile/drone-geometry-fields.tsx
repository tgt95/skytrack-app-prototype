import { TrashIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "skytrack-ui/card";
import { FieldError, FieldLabel, FieldRoot } from "skytrack-ui/field";
import { CheckboxRoot } from "skytrack-ui/checkbox";
import { InputAdornment } from "skytrack-ui/input";
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
} from "skytrack-ui/number-field";
import {
  DRONE_GEOMETRY_FIELDS,
  validateDroneGeometry,
  droneGeometryMass,
  type DroneGeometry,
  type DroneGeometryKey,
  type DronePayloadGeometryKey,
  getDronePayloads,
} from "@/domain/drone-geometry";
import { TextField } from "./drone-profile-fields";

function GeometryField({
  id,
  label,
  value,
  unit,
  step,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  step: number;
  error?: string;
  onChange: (value: number) => void;
}) {
  return (
    <FieldRoot orientation="vertical" invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NumberField
        className="w-full"
        value={Number.isFinite(value) ? value : null}
        onValueChange={(next) => onChange(next ?? Number.NaN)}
        step={step}
      >
        <NumberFieldGroup className="w-full">
          <NumberFieldInput
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className="w-full min-w-0 flex-1"
          />
          <InputAdornment
            position="end"
            className="border-s border-input px-2 text-xs"
          >
            {unit}
          </InputAdornment>
        </NumberFieldGroup>
      </NumberField>
      {error && (
        <FieldError id={`${id}-error`} match={Boolean(error)}>
          {error}
        </FieldError>
      )}
    </FieldRoot>
  );
}

function GeometryCard({
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
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DroneGeometryFields({
  geometry,
  displayName,
  profileCode,
  errors,
  onPatch,
  onPatchProfile,
}: {
  geometry: DroneGeometry;
  displayName: string;
  profileCode: string;
  errors: ReturnType<typeof validateDroneGeometry>;
  onPatch: (patch: Partial<DroneGeometry>) => void;
  onPatchProfile: (patch: { name?: string; profileCode?: string }) => void;
}) {
  const groups: { title: string; fields: DroneGeometryKey[] }[] = [
    { title: "Body box", fields: ["bodyX", "bodyY", "bodyZ"] },
    {
      title: "Rotor hubs and motor",
      fields: [
        "hubX",
        "hubY",
        "rotorZ",
        "propellerDiameter",
        "maxRpm",
        "thrustPerRotorN",
      ],
    },
    {
      title: "Landing gear · two box skids",
      fields: ["gearX", "gearY", "gearZ", "skidSpacing"],
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <GeometryCard title="Profile">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            id="ms-drone-name"
            label="Display name"
            value={displayName}
            onChange={(name) => onPatchProfile({ name })}
            placeholder="e.g. My quad-X"
          />
          <TextField
            label="Profile ID"
            value={profileCode}
            onChange={(profileCode) => onPatchProfile({ profileCode })}
            placeholder="e.g. my_quad"
          />
          <div className="grid gap-4 md:col-span-2">
            <p className="m-0 text-muted-foreground">
              Geometry uses metres; mass uses kilograms; motor speed uses RPM.
            </p>
            <GeometryField
              id="geometry-base-mass"
              label="Total mass incl. payloads"
              value={droneGeometryMass(geometry)}
              unit="kg"
              step={0.1}
              error={errors.baseMassKg}
              onChange={(value) =>
                onPatch({
                  baseMassKg:
                    value -
                    getDronePayloads(geometry).reduce(
                      (sum, payload) => sum + payload.massKg,
                      0,
                    ),
                })
              }
            />
          </div>
        </div>
      </GeometryCard>
      <GeometryCard title="Advanced motor / propeller">
        <div className="flex flex-col gap-4">
          <FieldRoot className="flex flex-row items-center gap-2">
            <FieldLabel className="flex items-center gap-2 font-normal">
              <CheckboxRoot
                checked={Boolean(geometry.advancedMotor?.enabled)}
                onCheckedChange={(checked) =>
                  onPatch({
                    advancedMotor:
                      checked === true
                        ? {
                            enabled: true,
                            fixedMotorMassKg: 0.03,
                            rotatingMassKg: 0.02,
                            rotorInertiaKgM2: 1.44e-4,
                            motorSpinUpS: 0.0125,
                            motorSpinDownS: 0.025,
                            reactionTorquePerThrust: 0.05,
                          }
                        : null,
                  })
                }
              />
              Use component masses and rotor inertia
            </FieldLabel>
          </FieldRoot>
          {geometry.advancedMotor?.enabled && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(
                [
                  ["fixedMotorMassKg", "Fixed motor mass / rotor", "kg", 0.001],
                  ["rotatingMassKg", "Rotating mass / rotor", "kg", 0.001],
                  ["rotorInertiaKgM2", "Rotor inertia Jr", "kg·m²", 0.000001],
                  ["motorSpinUpS", "Motor spin-up time constant", "s", 0.001],
                  [
                    "motorSpinDownS",
                    "Motor spin-down time constant",
                    "s",
                    0.001,
                  ],
                  [
                    "reactionTorquePerThrust",
                    "Reaction torque / thrust",
                    "m",
                    0.01,
                  ],
                ] as const
              ).map(([key, label, unit, step]) => (
                <GeometryField
                  key={key}
                  id={`geometry-advanced-${key}`}
                  label={label}
                  value={geometry.advancedMotor![key]}
                  unit={unit}
                  step={step}
                  error={errors.advancedMotor}
                  onChange={(value) =>
                    onPatch({
                      advancedMotor: {
                        ...geometry.advancedMotor!,
                        [key]: value,
                      },
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </GeometryCard>
      {groups.map((group) => (
        <GeometryCard key={group.title} title={group.title}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {group.fields.map((key) => {
              const meta = DRONE_GEOMETRY_FIELDS[key];
              return (
                <GeometryField
                  key={key}
                  id={`geometry-${key}`}
                  label={meta.label}
                  value={geometry[key]}
                  unit={meta.unit}
                  step={meta.step}
                  error={
                    errors[key] ??
                    (key === "rotorZ" ? errors.rotorClearance : undefined)
                  }
                  onChange={(value) => onPatch({ [key]: value })}
                />
              );
            })}
          </div>
        </GeometryCard>
      ))}
    </div>
  );
}

export function DronePayloadFields({
  geometry,
  errors,
  onAddPayload,
  onRemovePayload,
  onPatchPayload,
}: {
  geometry: DroneGeometry;
  errors: ReturnType<typeof validateDroneGeometry>;
  onAddPayload: () => void;
  onRemovePayload: (index: number) => void;
  onPatchPayload: (
    index: number,
    patch: Partial<NonNullable<DroneGeometry["payload"]>>,
  ) => void;
}) {
  const payloads = getDronePayloads(geometry);
  return (
    <div className="flex flex-col gap-4">
      <GeometryCard title="Payloads">
        {payloads.length > 0 ? (
          <div className="grid gap-6">
            <p className="m-0 text-muted-foreground text-sm">
              Payload mass is included in total mass. Positions are measured
              from the unloaded body centre.
            </p>
            {payloads.map((payload, index) => (
              <section
                key={payload.id ?? `payload-${index}`}
                className="grid gap-4 p-4 bg-muted rounded-(--radius)"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-base font-medium text-foreground">
                    {payload.name?.trim() || `Payload ${index + 1}`}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onRemovePayload(index)}
                  >
                    <TrashIcon />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField
                    label="Name"
                    value={payload.name ?? `Payload ${index + 1}`}
                    onChange={(name) => onPatchPayload(index, { name })}
                    placeholder={`Payload ${index + 1}`}
                  />
                  <TextField
                    label="Description"
                    value={payload.description ?? ""}
                    onChange={(description) =>
                      onPatchPayload(index, { description })
                    }
                    placeholder="e.g. Downward camera, spray tank"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(
                    [
                      "massKg",
                      "boxX",
                      "boxY",
                      "boxZ",
                      "positionX",
                      "positionY",
                      "positionZ",
                    ] as Exclude<
                      DronePayloadGeometryKey,
                      "id" | "name" | "description"
                    >[]
                  ).map((key) => {
                    const meta =
                      key === "massKg"
                        ? { label: "Payload mass", unit: "kg", step: 0.1 }
                        : {
                            label: key
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (char) => char.toUpperCase()),
                            unit: "m",
                            step: 0.01,
                          };
                    return (
                      <GeometryField
                        key={key}
                        id={`geometry-payload-${index}-${key}`}
                        label={meta.label}
                        value={payload[key]}
                        unit={meta.unit}
                        step={meta.step}
                        error={errors[`payload.${index}.${key}`]}
                        onChange={(value) =>
                          onPatchPayload(index, { [key]: value })
                        }
                      />
                    );
                  })}
                </div>
              </section>
            ))}
            <Button type="button" variant="outline" onClick={onAddPayload}>
              <PlusIcon aria-hidden="true" /> Add fixed payload (+0.2 kg total)
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={onAddPayload}>
            <PlusIcon aria-hidden="true" /> Add fixed payload (+0.2 kg total)
          </Button>
        )}
      </GeometryCard>
    </div>
  );
}
