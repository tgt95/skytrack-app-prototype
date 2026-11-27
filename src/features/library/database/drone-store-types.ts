import { STORAGE_KEYS, STORAGE_VERSIONS } from "@/shared/storage-keys";
import type { DroneGeometry } from "@/domain/drone-geometry";
import type { DroneOnboardingData } from "@/domain/drone-onboarding";

export type DroneFirmwareFamily =
  "PX4" | "ArduPilot" | "DJI" | "Other" | "Unspecified";

export const DRONE_COMPONENT_GROUPS = [
  "Flight Control",
  "Companion Computer",
  "Control",
  "Control & Stabilization System",
  "Frame Kit",
  "Propulsion System",
  "Motor",
  "Electronic Speed Controller (ESC)",
  "Propeller",
  "Power",
  "Battery",
  "Power Regulation",
  "Navigation & Positioning",
  "Radio Control",
  "Communications & Telemetry",
  "Imaging & Sensing",
  "Payload",
  "Other",
] as const;

export type DroneComponentGroup = (typeof DRONE_COMPONENT_GROUPS)[number];

export const DRONE_COMPONENT_INSTALL_STATES = [
  "Unspecified",
  "Installed",
  "Planned",
] as const;
export type DroneComponentInstallState =
  (typeof DRONE_COMPONENT_INSTALL_STATES)[number];

export const DRONE_DATA_SOURCE_TYPES = [
  "Unverified",
  "Owner provided",
  "Manufacturer specification",
  "Estimated",
] as const;
export type DroneDataSourceType = (typeof DRONE_DATA_SOURCE_TYPES)[number];

export interface DroneHardwareSpecification {
  id: string;
  label: string;
  value: string;
}

export interface DroneHardwareComponent {
  id: string;
  group: DroneComponentGroup;
  name: string;
  purpose: string;
  manufacturer: string;
  model: string;
  partNumber: string;
  revision: string;
  installState: DroneComponentInstallState;
  sourceType: DroneDataSourceType;
  sourceLabel: string;
  sourceUrl: string;
  sourceDate: string;
  specifications: DroneHardwareSpecification[];
}

export interface WorkspaceDroneProfile {
  id: string;
  workspaceId: string;
  name: string;
  profileCode: string;
  missionUseCase: string;
  profileSourceType: DroneDataSourceType;
  profileSourceLabel: string;
  profileSourceUrl: string;
  profileSourceDate: string;
  firmwareFamily: DroneFirmwareFamily;
  flightControllerModel: string;
  firmwareVersion: string;
  airframe: string;
  frameSizeMm: number | null;
  maxPropDiameterIn: number | null;
  motorMountPatternMm: string;
  stackMountPatternMm: string;
  frameWeightG: number | null;
  maxFlightTimeMin: number | null;
  maxSpeedMps: number | null;
  maxTakeoffWeightKg: number | null;
  maxPayloadKg: number | null;
  referenceBuildNote: string;
  legacyLabels: string[];
  components: DroneHardwareComponent[];
  geometry?: DroneGeometry;
  onboarding?: DroneOnboardingData;
}

export const DRONE_DB_KEY = STORAGE_KEYS.droneProfiles;
export const DRONE_DB_VERSION = STORAGE_VERSIONS.droneProfiles;
