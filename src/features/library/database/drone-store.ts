import {
  DEFAULT_DRONE_GEOMETRY,
  isDroneGeometry,
  validateDroneGeometry,
} from "@/domain/drone-geometry";
import { normalizeDroneOnboardingData } from "@/domain/drone-onboarding";
import { STORAGE_KEYS } from "@/shared/storage-keys";
import {
  DRONE_COMPONENT_GROUPS,
  DRONE_COMPONENT_INSTALL_STATES,
  DRONE_DATA_SOURCE_TYPES,
  DRONE_DB_KEY,
  DRONE_DB_VERSION,
  type DroneComponentGroup,
  type DroneComponentInstallState,
  type DroneDataSourceType,
  type DroneFirmwareFamily,
  type DroneHardwareComponent,
  type DroneHardwareSpecification,
  type WorkspaceDroneProfile,
} from "./drone-store-types";
import {
  blankProfileFromFixture,
  newDroneHardwareComponent,
  seedDroneProfiles,
} from "./drone-store-fixtures";

export * from "./drone-store-types";
export { newDroneHardwareComponent } from "./drone-store-fixtures";

const LEGACY_DRONE_DB_KEY = STORAGE_KEYS.legacyDroneProfiles;

interface DroneDatabaseShape {
  version: number;
  profiles: WorkspaceDroneProfile[];
}

interface LegacyDroneHardwareComponent {
  id: string;
  group: DroneComponentGroup;
  name: string;
  purpose: string;
}

interface LegacyWorkspaceDroneProfile {
  id: string;
  workspaceId: string;
  name: string;
  firmwareFamily: DroneFirmwareFamily;
  flightControllerModel: string;
  firmwareVersion: string;
  airframe: string;
  maxFlightTimeMin: number | null;
  maxSpeedMps: number | null;
  maxTakeoffWeightKg: number | null;
  referenceBuildNote: string;
  legacyLabels: string[];
  components: LegacyDroneHardwareComponent[];
}

function isFirmwareFamily(value: unknown): value is DroneFirmwareFamily {
  return (
    value === "PX4" ||
    value === "ArduPilot" ||
    value === "DJI" ||
    value === "Other" ||
    value === "Unspecified"
  );
}

function isComponentGroup(value: unknown): value is DroneComponentGroup {
  return (
    typeof value === "string" &&
    (DRONE_COMPONENT_GROUPS as readonly string[]).includes(value)
  );
}

function isInstallState(value: unknown): value is DroneComponentInstallState {
  return (
    typeof value === "string" &&
    (DRONE_COMPONENT_INSTALL_STATES as readonly string[]).includes(value)
  );
}

function isDataSourceType(value: unknown): value is DroneDataSourceType {
  return (
    typeof value === "string" &&
    (DRONE_DATA_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

function isSpecification(value: unknown): value is DroneHardwareSpecification {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<DroneHardwareSpecification>;
  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    typeof item.value === "string"
  );
}

function isComponent(value: unknown): value is DroneHardwareComponent {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<DroneHardwareComponent>;
  return (
    typeof item.id === "string" &&
    isComponentGroup(item.group) &&
    typeof item.name === "string" &&
    typeof item.purpose === "string" &&
    typeof item.manufacturer === "string" &&
    typeof item.model === "string" &&
    typeof item.partNumber === "string" &&
    typeof item.revision === "string" &&
    isInstallState(item.installState) &&
    isDataSourceType(item.sourceType) &&
    typeof item.sourceLabel === "string" &&
    typeof item.sourceUrl === "string" &&
    typeof item.sourceDate === "string" &&
    Array.isArray(item.specifications) &&
    item.specifications.every(isSpecification)
  );
}

function isOptionalNumber(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" && Number.isFinite(value) && value >= 0)
  );
}

function isProfile(value: unknown): value is WorkspaceDroneProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Partial<WorkspaceDroneProfile>;
  return (
    typeof profile.id === "string" &&
    typeof profile.workspaceId === "string" &&
    typeof profile.name === "string" &&
    typeof profile.missionUseCase === "string" &&
    isDataSourceType(profile.profileSourceType) &&
    typeof profile.profileSourceLabel === "string" &&
    typeof profile.profileSourceUrl === "string" &&
    typeof profile.profileSourceDate === "string" &&
    isFirmwareFamily(profile.firmwareFamily) &&
    typeof profile.flightControllerModel === "string" &&
    typeof profile.firmwareVersion === "string" &&
    typeof profile.airframe === "string" &&
    isOptionalNumber(profile.frameSizeMm) &&
    isOptionalNumber(profile.maxPropDiameterIn) &&
    typeof profile.motorMountPatternMm === "string" &&
    typeof profile.stackMountPatternMm === "string" &&
    isOptionalNumber(profile.frameWeightG) &&
    isOptionalNumber(profile.maxFlightTimeMin) &&
    isOptionalNumber(profile.maxSpeedMps) &&
    isOptionalNumber(profile.maxTakeoffWeightKg) &&
    isOptionalNumber(profile.maxPayloadKg) &&
    typeof profile.referenceBuildNote === "string" &&
    Array.isArray(profile.legacyLabels) &&
    profile.legacyLabels.every((label) => typeof label === "string") &&
    Array.isArray(profile.components) &&
    profile.components.every(isComponent)
  );
}

function withGeometryDefaults(
  profiles: WorkspaceDroneProfile[],
): WorkspaceDroneProfile[] {
  return profiles.map((profile) => {
    const geometry = profile.geometry;
    const valid =
      isDroneGeometry(geometry) &&
      Object.keys(validateDroneGeometry(geometry)).length === 0;
    const normalizedGeometry = valid
      ? { ...DEFAULT_DRONE_GEOMETRY, ...geometry }
      : { ...DEFAULT_DRONE_GEOMETRY };
    const payloads = [
      ...(normalizedGeometry.payload ? [normalizedGeometry.payload] : []),
      ...(normalizedGeometry.additionalPayloads ?? []),
    ];
    const normalizedPayloads = payloads.map((payload, index) => ({
      id: payload.id ?? `payload-${index + 1}`,
      name: payload.name ?? `Payload ${index + 1}`,
      description: payload.description ?? "",
      ...payload,
    }));
    const [primaryPayload = null, ...additionalPayloads] = normalizedPayloads;
    return {
      ...profile,
      profileCode: profile.profileCode ?? "",
      geometry: {
        ...normalizedGeometry,
        payload: primaryPayload,
        additionalPayloads,
      },
      onboarding: normalizeDroneOnboardingData(profile.onboarding),
    };
  });
}

function isLegacyComponent(
  value: unknown,
): value is LegacyDroneHardwareComponent {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<LegacyDroneHardwareComponent>;
  return (
    typeof item.id === "string" &&
    isComponentGroup(item.group) &&
    typeof item.name === "string" &&
    typeof item.purpose === "string"
  );
}

function isLegacyProfile(value: unknown): value is LegacyWorkspaceDroneProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Partial<LegacyWorkspaceDroneProfile>;
  return (
    typeof profile.id === "string" &&
    typeof profile.workspaceId === "string" &&
    typeof profile.name === "string" &&
    isFirmwareFamily(profile.firmwareFamily) &&
    typeof profile.flightControllerModel === "string" &&
    typeof profile.firmwareVersion === "string" &&
    typeof profile.airframe === "string" &&
    isOptionalNumber(profile.maxFlightTimeMin) &&
    isOptionalNumber(profile.maxSpeedMps) &&
    isOptionalNumber(profile.maxTakeoffWeightKg) &&
    typeof profile.referenceBuildNote === "string" &&
    Array.isArray(profile.legacyLabels) &&
    profile.legacyLabels.every((label) => typeof label === "string") &&
    Array.isArray(profile.components) &&
    profile.components.every(isLegacyComponent)
  );
}

function migrateLegacyProfile(
  profile: LegacyWorkspaceDroneProfile,
): WorkspaceDroneProfile {
  return {
    ...blankProfileFromFixture(
      profile.workspaceId,
      { id: profile.id, name: profile.name },
      profile.legacyLabels,
    ),
    ...profile,
    profileSourceType: "Unverified",
    profileSourceLabel: "",
    profileSourceUrl: "",
    profileSourceDate: "",
    components: profile.components.map((item) => ({
      ...newDroneHardwareComponent(item.id),
      ...item,
      sourceType: "Unverified",
    })),
  };
}

const LEGACY_DEMO_COPY: Record<string, string> = {
  "Camera Stereo IMX219-83": "IMX219-83 stereo camera",
  "Pin 4S 5300mAh": "4S 5300mAh battery",
  "Motor 900kV X3115": "900kV X3115 motor",
  "ESCs 4in1 50A": "4-in-1 50A ESCs",
  "Khung Frame F450 hoặc X450": "F450 or X450 frame",
  "Khung F450 hoặc X450": "F450 or X450 frame",
  "Cánh quạt 9045 gemfan": "Gemfan 9045 propellers",
  "Gimbal Siyi A8 Mini": "SIYI A8 Mini gimbal",
  "Jetson Orin Nano": "NVIDIA Jetson Orin Nano",
  "Raspberry Pi5 8GB": "Raspberry Pi 5 8GB",
};

function normalizeDemoDroneCopy(
  profiles: WorkspaceDroneProfile[],
): WorkspaceDroneProfile[] {
  return profiles.map((profile) => {
    if (profile.id !== "mini-pro-v6" && profile.id !== "mini-base")
      return profile;
    return {
      ...profile,
      airframe: LEGACY_DEMO_COPY[profile.airframe] ?? profile.airframe,
      components: profile.components.map((item) => ({
        ...item,
        name: LEGACY_DEMO_COPY[item.name] ?? item.name,
      })),
    };
  });
}

/** Load Workspace-scoped profiles and migrate version-1 records without touching project data. */
export function loadDroneProfiles(): WorkspaceDroneProfile[] {
  const seeded = seedDroneProfiles();
  try {
    const currentRaw = localStorage.getItem(DRONE_DB_KEY);
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as Partial<DroneDatabaseShape>;
      if (
        current.version === DRONE_DB_VERSION &&
        Array.isArray(current.profiles) &&
        current.profiles.every(isProfile)
      ) {
        return normalizeDemoDroneCopy(withGeometryDefaults(current.profiles));
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_DRONE_DB_KEY);
    if (!legacyRaw) return seeded;
    const legacy = JSON.parse(legacyRaw) as {
      version?: unknown;
      profiles?: unknown;
    };
    if (
      legacy.version !== 1 ||
      !Array.isArray(legacy.profiles) ||
      !legacy.profiles.every(isLegacyProfile)
    )
      return seeded;
    const migrated = normalizeDemoDroneCopy(
      withGeometryDefaults(legacy.profiles.map(migrateLegacyProfile)),
    );
    saveDroneProfiles(migrated);
    return migrated;
  } catch {
    return seeded;
  }
}

/** Persist every Workspace's profiles as one versioned local record. */
export function saveDroneProfiles(profiles: WorkspaceDroneProfile[]): boolean {
  try {
    const shape: DroneDatabaseShape = { version: DRONE_DB_VERSION, profiles };
    localStorage.setItem(DRONE_DB_KEY, JSON.stringify(shape));
    return true;
  } catch {
    return false;
  }
}

export function newDroneProfile(
  id: string,
  workspaceId: string,
): WorkspaceDroneProfile {
  return blankProfileFromFixture(workspaceId, { id, name: "New drone" });
}
