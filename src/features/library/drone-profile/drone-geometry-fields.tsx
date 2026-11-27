import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "skytrack-ui/card";
import { FieldError, FieldLabel, FieldRoot } from "skytrack-ui/field";
import { InputAdornment } from "skytrack-ui/input";
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
} from "skytrack-ui/number-field";
import {
  DRONE_GEOMETRY_FIELDS,
  validateDroneGeometry,
  type DroneGeometry,
  type DroneGeometryKey,
  type DronePayloadGeometryKey,
} from "@/domain/drone-geometry";

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
      <FieldLabel htmlFor={id} className="text-muted-foreground">
        {label}
      </FieldLabel>
      <NumberField
        className="w-full"
        value={Number.isFinite(value) ? value : null}
        onValueChange={(next) => onChange(next ?? Number.NaN)}
        step={step}
      >
        <NumberFieldGroup className="w-full border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-destructive/20">
          <NumberFieldInput
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className="w-full min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
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
  errors,
  onPatch,
  onAddPayload,
  onRemovePayload,
}: {
  geometry: DroneGeometry;
  errors: ReturnType<typeof validateDroneGeometry>;
  onPatch: (patch: Partial<DroneGeometry>) => void;
  onAddPayload: () => void;
  onRemovePayload: () => void;
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
        <div className="grid gap-4">
          <p className="m-0 text-muted-foreground">
            Geometry uses metres; mass uses kilograms; motor speed uses RPM.
          </p>
          <GeometryField
            id="geometry-base-mass"
            label="Total mass incl. payloads"
            value={geometry.baseMassKg + (geometry.payload?.massKg ?? 0)}
            unit="kg"
            step={0.1}
            error={errors.baseMassKg}
            onChange={(value) =>
              onPatch({ baseMassKg: value - (geometry.payload?.massKg ?? 0) })
            }
          />
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
      <GeometryCard title="Payload">
        {geometry.payload ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <strong>Payload 1</strong>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemovePayload}
              >
                Remove payload
              </Button>
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
                ] as DronePayloadGeometryKey[]
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
                    id={`geometry-payload-${key}`}
                    label={meta.label}
                    value={geometry.payload![key]}
                    unit={meta.unit}
                    step={meta.step}
                    error={errors[`payload.${key}`]}
                    onChange={(value) =>
                      onPatch({
                        payload: { ...geometry.payload!, [key]: value },
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <Button type="button" variant="secondary" onClick={onAddPayload}>
            <PlusIcon aria-hidden="true" /> Add payload (+0.2 kg total)
          </Button>
        )}
      </GeometryCard>
    </div>
  );
}
