export interface DroneGeometry {
  baseMassKg: number;
  bodyX: number;
  bodyY: number;
  bodyZ: number;
  hubX: number;
  hubY: number;
  rotorZ: number;
  propellerDiameter: number;
  maxRpm: number;
  thrustPerRotorN: number;
  gearX: number;
  gearY: number;
  gearZ: number;
  skidSpacing: number;
  payload: {
    massKg: number;
    boxX: number;
    boxY: number;
    boxZ: number;
    positionX: number;
    positionY: number;
    positionZ: number;
  } | null;
}

export const DEFAULT_DRONE_GEOMETRY: DroneGeometry = {
  baseMassKg: 2,
  bodyX: 0.26,
  bodyY: 0.18,
  bodyZ: 0.1,
  hubX: 0.22,
  hubY: 0.22,
  rotorZ: 0.08,
  propellerDiameter: 0.24,
  maxRpm: 10000,
  thrustPerRotorN: 12,
  gearX: 0.3,
  gearY: 0.02,
  gearZ: 0.02,
  skidSpacing: 0.24,
  payload: null,
};

export type DroneGeometryKey = Exclude<keyof DroneGeometry, "payload">;
export type DronePayloadGeometryKey = keyof NonNullable<
  DroneGeometry["payload"]
>;

export const DRONE_GEOMETRY_FIELDS: Record<
  DroneGeometryKey,
  {
    label: string;
    unit: string;
    step: number;
    min?: number;
    max?: number;
  }
> = {
  baseMassKg: { label: "Total mass", unit: "kg", step: 0.1, min: 0.01 },
  bodyX: { label: "Body X", unit: "m", step: 0.01, min: 0.02, max: 2 },
  bodyY: { label: "Body Y", unit: "m", step: 0.01, min: 0.02, max: 2 },
  bodyZ: { label: "Body Z", unit: "m", step: 0.01, min: 0.02, max: 2 },
  hubX: {
    label: "Hub ±X from body datum",
    unit: "m",
    step: 0.01,
    min: 0.02,
    max: 5,
  },
  hubY: {
    label: "Hub ±Y from body datum",
    unit: "m",
    step: 0.01,
    min: 0.02,
    max: 5,
  },
  rotorZ: {
    label: "Rotor plane Z from body datum",
    unit: "m",
    step: 0.01,
    min: -2,
    max: 2,
  },
  propellerDiameter: {
    label: "Propeller diameter",
    unit: "m",
    step: 0.01,
    min: 0.03,
    max: 3,
  },
  maxRpm: {
    label: "Maximum rotor RPM",
    unit: "RPM",
    step: 100,
    min: 1,
    max: 100000,
  },
  thrustPerRotorN: {
    label: "Max thrust / rotor",
    unit: "N",
    step: 0.5,
    min: 0.1,
    max: 10000,
  },
  gearX: { label: "Gear X", unit: "m", step: 0.01, min: 0.03, max: 3 },
  gearY: { label: "Gear Y", unit: "m", step: 0.005, min: 0.005, max: 1 },
  gearZ: { label: "Gear Z", unit: "m", step: 0.005, min: 0.005, max: 1 },
  skidSpacing: {
    label: "Skid center spacing",
    unit: "m",
    step: 0.01,
    min: 0.03,
    max: 3,
  },
};

export type DroneGeometryErrors = Partial<
  Record<
    DroneGeometryKey | "rotorClearance" | `payload.${DronePayloadGeometryKey}`,
    string
  >
>;

export function isDroneGeometry(value: unknown): value is DroneGeometry {
  if (!value || typeof value !== "object") return false;
  const geometry = value as Partial<DroneGeometry>;
  const numericKeys = Object.keys(DRONE_GEOMETRY_FIELDS) as DroneGeometryKey[];
  if (
    !numericKeys.every(
      (key) =>
        typeof geometry[key] === "number" && Number.isFinite(geometry[key]),
    )
  )
    return false;
  if (geometry.payload === null) return true;
  if (!geometry.payload || typeof geometry.payload !== "object") return false;
  return [
    "massKg",
    "boxX",
    "boxY",
    "boxZ",
    "positionX",
    "positionY",
    "positionZ",
  ].every((key) => {
    const field = geometry.payload?.[key as DronePayloadGeometryKey];
    return typeof field === "number" && Number.isFinite(field);
  });
}

export function validateDroneGeometry(
  geometry: DroneGeometry,
): DroneGeometryErrors {
  const errors: DroneGeometryErrors = {};
  for (const [key, meta] of Object.entries(DRONE_GEOMETRY_FIELDS) as [
    DroneGeometryKey,
    (typeof DRONE_GEOMETRY_FIELDS)[DroneGeometryKey],
  ][]) {
    const value = geometry[key];
    if (
      !Number.isFinite(value) ||
      (key !== "rotorZ" && value <= 0) ||
      (meta.min !== undefined && value < meta.min) ||
      (meta.max !== undefined && value > meta.max)
    ) {
      errors[key] =
        meta.min !== undefined && meta.max !== undefined
          ? `Enter a value from ${meta.min} to ${meta.max}.`
          : "Enter a valid value.";
    }
  }
  const minimumRotorZ = geometry.bodyZ / 2 + 0.015;
  if (Math.abs(geometry.rotorZ) < minimumRotorZ) {
    errors.rotorClearance = `Rotor plane must be at least ${minimumRotorZ.toFixed(3)} m above or below the body datum.`;
  }
  if (geometry.payload) {
    for (const key of ["massKg", "boxX", "boxY", "boxZ"] as const) {
      if (
        !Number.isFinite(geometry.payload[key]) ||
        geometry.payload[key] <= 0
      ) {
        errors[`payload.${key}`] = "Enter a value greater than 0.";
      }
    }
  }
  return errors;
}

export function droneGeometryMass(geometry: DroneGeometry): number {
  return geometry.baseMassKg + (geometry.payload?.massKg ?? 0);
}

export function droneGeometryThrustRatio(geometry: DroneGeometry): number {
  return (geometry.thrustPerRotorN * 4) / (droneGeometryMass(geometry) * 9.81);
}
