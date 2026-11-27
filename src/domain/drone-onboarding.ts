import {
  DEFAULT_DRONE_PID_GAINS,
  normalizeDronePidGains,
  type DronePidGains,
} from "./drone-tuning";

export const DRONE_SENSOR_TYPES = [
  "RGB camera",
  "Depth camera",
  "Rangefinder",
] as const;

export const DRONE_CAMERA_SLOTS = [
  "Front Left",
  "Front",
  "Front Right",
  "Left",
  "Ground",
  "Right",
  "Back Left",
  "Back",
  "Back Right",
] as const;

export interface DroneSensorProfile {
  id: string;
  sensorType: (typeof DRONE_SENSOR_TYPES)[number];
  cameraSlot: (typeof DRONE_CAMERA_SLOTS)[number];
  enabled: boolean;
  frequencyHz: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  yawDeg: number;
  pitchDeg: number;
  fovDeg: number;
  nearM: number;
  farM: number;
}

export interface DroneOnboardingData {
  sensors: DroneSensorProfile[];
  sensorNoise: {
    imuNoiseBiasDrift: string;
    gpsErrorMargin: string;
    systemLatency: string;
  };
  calibration: {
    source: "derived" | "measured";
    centerOfMassX: number | null;
    centerOfMassY: number | null;
    centerOfMassZ: number | null;
    ixx: number | null;
    iyy: number | null;
    izz: number | null;
    measuredOn: string;
  };
  appearance: {
    modelType: "generated" | "imported";
    sizing: "match-profile" | "custom";
    widthM: number;
    lengthM: number;
    heightM: number;
  };
  manualPid: DronePidGains;
}

export const DEFAULT_DRONE_ONBOARDING_DATA: DroneOnboardingData = {
  sensors: [
    {
      id: "sensor-1",
      sensorType: "RGB camera",
      cameraSlot: "Front",
      enabled: true,
      frequencyHz: 30,
      positionX: 0.12,
      positionY: 0,
      positionZ: -0.02,
      yawDeg: 0,
      pitchDeg: 0,
      fovDeg: 90,
      nearM: 0.1,
      farM: 100,
    },
  ],
  sensorNoise: {
    imuNoiseBiasDrift: "",
    gpsErrorMargin: "",
    systemLatency: "",
  },
  calibration: {
    source: "derived",
    centerOfMassX: null,
    centerOfMassY: null,
    centerOfMassZ: null,
    ixx: null,
    iyy: null,
    izz: null,
    measuredOn: "",
  },
  appearance: {
    modelType: "generated",
    sizing: "match-profile",
    widthM: 0.7,
    lengthM: 0.7,
    heightM: 0.25,
  },
  manualPid: { ...DEFAULT_DRONE_PID_GAINS },
};

export function normalizeDroneOnboardingData(
  value: unknown,
): DroneOnboardingData {
  if (!value || typeof value !== "object")
    return structuredClone(DEFAULT_DRONE_ONBOARDING_DATA);
  const candidate = value as Partial<DroneOnboardingData>;
  const base = structuredClone(DEFAULT_DRONE_ONBOARDING_DATA);
  const sensors = Array.isArray(candidate.sensors)
    ? candidate.sensors.filter(
        (sensor): sensor is DroneSensorProfile =>
          Boolean(sensor) &&
          typeof sensor.id === "string" &&
          typeof sensor.sensorType === "string" &&
          typeof sensor.cameraSlot === "string" &&
          typeof sensor.enabled === "boolean" &&
          [
            sensor.frequencyHz,
            sensor.positionX,
            sensor.positionY,
            sensor.positionZ,
            sensor.yawDeg,
            sensor.pitchDeg,
            sensor.fovDeg,
            sensor.nearM,
            sensor.farM,
          ].every(
            (field) => typeof field === "number" && Number.isFinite(field),
          ),
      )
    : base.sensors;
  return {
    sensors,
    sensorNoise: { ...base.sensorNoise, ...candidate.sensorNoise },
    calibration: { ...base.calibration, ...candidate.calibration },
    appearance: { ...base.appearance, ...candidate.appearance },
    manualPid: normalizeDronePidGains(candidate.manualPid),
  };
}
