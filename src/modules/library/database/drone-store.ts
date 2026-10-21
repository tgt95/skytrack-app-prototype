import { DEFAULT_WORKSPACE_ID, WORKSPACES } from '../workspace-data'

export type DroneFirmwareFamily = 'PX4' | 'ArduPilot' | 'DJI' | 'Other' | 'Unspecified'

export const DRONE_COMPONENT_GROUPS = [
  'Flight Control',
  'Companion Computer',
  'Control',
  'Control & Stabilization System',
  'Frame Kit',
  'Propulsion System',
  'Motor',
  'Electronic Speed Controller (ESC)',
  'Propeller',
  'Power',
  'Battery',
  'Power Regulation',
  'Navigation & Positioning',
  'Radio Control',
  'Communications & Telemetry',
  'Imaging & Sensing',
  'Payload',
  'Other'
] as const

export type DroneComponentGroup = (typeof DRONE_COMPONENT_GROUPS)[number]

export const DRONE_COMPONENT_INSTALL_STATES = ['Unspecified', 'Installed', 'Planned'] as const
export type DroneComponentInstallState = (typeof DRONE_COMPONENT_INSTALL_STATES)[number]

export const DRONE_DATA_SOURCE_TYPES = [
  'Unverified',
  'Owner provided',
  'Manufacturer specification',
  'Estimated'
] as const
export type DroneDataSourceType = (typeof DRONE_DATA_SOURCE_TYPES)[number]

export interface DroneHardwareSpecification {
  id: string
  label: string
  value: string
}

export interface DroneHardwareComponent {
  id: string
  group: DroneComponentGroup
  name: string
  purpose: string
  manufacturer: string
  model: string
  partNumber: string
  revision: string
  installState: DroneComponentInstallState
  sourceType: DroneDataSourceType
  sourceLabel: string
  sourceUrl: string
  sourceDate: string
  specifications: DroneHardwareSpecification[]
}

export interface WorkspaceDroneProfile {
  id: string
  workspaceId: string
  name: string
  missionUseCase: string
  profileSourceType: DroneDataSourceType
  profileSourceLabel: string
  profileSourceUrl: string
  profileSourceDate: string
  firmwareFamily: DroneFirmwareFamily
  flightControllerModel: string
  firmwareVersion: string
  airframe: string
  frameSizeMm: number | null
  maxPropDiameterIn: number | null
  motorMountPatternMm: string
  stackMountPatternMm: string
  frameWeightG: number | null
  maxFlightTimeMin: number | null
  maxSpeedMps: number | null
  maxTakeoffWeightKg: number | null
  maxPayloadKg: number | null
  referenceBuildNote: string
  legacyLabels: string[]
  components: DroneHardwareComponent[]
}

export const DRONE_DB_KEY = 'ms-lib-drone-profiles-v2'
const LEGACY_DRONE_DB_KEY = 'ms-lib-drone-profiles-v1'
export const DRONE_DB_VERSION = 2

interface DroneDatabaseShape {
  version: number
  profiles: WorkspaceDroneProfile[]
}

interface LegacyDroneHardwareComponent {
  id: string
  group: DroneComponentGroup
  name: string
  purpose: string
}

interface LegacyWorkspaceDroneProfile {
  id: string
  workspaceId: string
  name: string
  firmwareFamily: DroneFirmwareFamily
  flightControllerModel: string
  firmwareVersion: string
  airframe: string
  maxFlightTimeMin: number | null
  maxSpeedMps: number | null
  maxTakeoffWeightKg: number | null
  referenceBuildNote: string
  legacyLabels: string[]
  components: LegacyDroneHardwareComponent[]
}

function specification(id: string, label: string, value: string): DroneHardwareSpecification {
  return { id, label, value }
}

function component(
  id: string,
  group: DroneComponentGroup,
  name: string,
  purpose = '',
  specifications: DroneHardwareSpecification[] = []
): DroneHardwareComponent {
  return {
    id,
    group,
    name,
    purpose,
    manufacturer: '',
    model: '',
    partNumber: '',
    revision: '',
    installState: 'Unspecified',
    sourceType: 'Owner provided',
    sourceLabel: 'Owner-provided hardware list',
    sourceUrl: '',
    sourceDate: '',
    specifications
  }
}

export function newDroneHardwareComponent(id: string): DroneHardwareComponent {
  return {
    id,
    group: 'Other',
    name: '',
    purpose: '',
    manufacturer: '',
    model: '',
    partNumber: '',
    revision: '',
    installState: 'Unspecified',
    sourceType: 'Unverified',
    sourceLabel: '',
    sourceUrl: '',
    sourceDate: '',
    specifications: []
  }
}

const MINI_PRO_COMPONENTS: DroneHardwareComponent[] = [
  component('mini-pro-jetson', 'Companion Computer', 'NVIDIA Jetson Orin Nano', 'Edge AI, obstacle avoidance'),
  component('mini-pro-pixhawk', 'Flight Control', 'Pixhawk 6C Mini', 'Flight controller'),
  component('mini-pro-stereo-camera', 'Imaging & Sensing', 'IMX219-83 stereo camera'),
  component('mini-pro-battery', 'Battery', '4S 5300mAh battery', '', [
    specification('mini-pro-battery-cells', 'Cell count', '4S'),
    specification('mini-pro-battery-capacity', 'Capacity', '5300 mAh')
  ]),
  component('mini-pro-motors', 'Motor', '900kV X3115 motor', '', [
    specification('mini-pro-motor-size', 'Motor size', 'X3115'),
    specification('mini-pro-motor-kv', 'KV', '900 kV')
  ]),
  component('mini-pro-escs', 'Electronic Speed Controller (ESC)', '4-in-1 50A ESCs', '', [
    specification('mini-pro-esc-config', 'Configuration', '4-in-1'),
    specification('mini-pro-esc-current', 'Current rating', '50 A; rating type unspecified')
  ]),
  component('mini-pro-frame', 'Frame Kit', 'F450 or X450 frame'),
  component('mini-pro-props', 'Propeller', 'Gemfan 9045 propellers', '', [
    specification('mini-pro-prop-designation', 'Model designation', '9045')
  ]),
  component('mini-pro-radio', 'Radio Control', 'Radiomaster Pocket ELRS'),
  component('mini-pro-receiver', 'Radio Control', 'Radiomaster RP3 V2 ELRS'),
  component('mini-pro-gimbal', 'Payload', 'SIYI A8 Mini gimbal'),
  component('mini-pro-optical-flow', 'Imaging & Sensing', 'Optical Flow MTF-01p'),
  component('mini-pro-data-link', 'Communications & Telemetry', 'OpenDataLink'),
  component('mini-pro-ubec', 'Power Regulation', 'UBEC')
]

const MINI_BASE_COMPONENTS: DroneHardwareComponent[] = [
  component('mini-base-pi', 'Companion Computer', 'Raspberry Pi 5 8GB', 'Mission logic, lighter models'),
  component('mini-base-pixhawk', 'Flight Control', 'Pixhawk 6C Mini', 'Flight controller'),
  component('mini-base-stereo-camera', 'Imaging & Sensing', 'IMX219-83 stereo camera'),
  component('mini-base-battery', 'Battery', '4S 5300mAh battery', '', [
    specification('mini-base-battery-cells', 'Cell count', '4S'),
    specification('mini-base-battery-capacity', 'Capacity', '5300 mAh')
  ]),
  component('mini-base-motors', 'Motor', '900kV X3115 motor', '', [
    specification('mini-base-motor-size', 'Motor size', 'X3115'),
    specification('mini-base-motor-kv', 'KV', '900 kV')
  ]),
  component('mini-base-escs', 'Electronic Speed Controller (ESC)', '4-in-1 50A ESCs', '', [
    specification('mini-base-esc-config', 'Configuration', '4-in-1'),
    specification('mini-base-esc-current', 'Current rating', '50 A; rating type unspecified')
  ]),
  component('mini-base-frame', 'Frame Kit', 'F450 or X450 frame'),
  component('mini-base-props', 'Propeller', 'Gemfan 9045 propellers', '', [
    specification('mini-base-prop-designation', 'Model designation', '9045')
  ]),
  component('mini-base-radio', 'Radio Control', 'Radiomaster Pocket ELRS'),
  component('mini-base-receiver', 'Radio Control', 'Radiomaster RP3 V2 ELRS'),
  component('mini-base-gimbal', 'Payload', 'SIYI A8 Mini gimbal'),
  component('mini-base-optical-flow', 'Imaging & Sensing', 'Optical Flow MTF-01p'),
  component('mini-base-data-link', 'Communications & Telemetry', 'OpenDataLink'),
  component('mini-base-ubec', 'Power Regulation', 'UBEC')
]

function blankProfileFromFixture(
  workspaceId: string,
  fixture: { id: string; name: string },
  legacyLabels: string[] = []
): WorkspaceDroneProfile {
  return {
    id: fixture.id,
    workspaceId,
    name: fixture.name,
    missionUseCase: '',
    profileSourceType: 'Unverified',
    profileSourceLabel: '',
    profileSourceUrl: '',
    profileSourceDate: '',
    firmwareFamily: 'Unspecified',
    flightControllerModel: '',
    firmwareVersion: '',
    airframe: '',
    frameSizeMm: null,
    maxPropDiameterIn: null,
    motorMountPatternMm: '',
    stackMountPatternMm: '',
    frameWeightG: null,
    maxFlightTimeMin: null,
    maxSpeedMps: null,
    maxTakeoffWeightKg: null,
    maxPayloadKg: null,
    referenceBuildNote: '',
    legacyLabels,
    components: []
  }
}

function seedDroneProfiles(): WorkspaceDroneProfile[] {
  const profiles = WORKSPACES.flatMap((workspace) =>
    workspace.drones.map((drone) => blankProfileFromFixture(workspace.id, drone))
  )
  const miniPro = profiles.find((profile) => profile.id === 'mini-pro-v6')
  if (miniPro) {
    Object.assign(miniPro, {
      name: 'Mini-Pro',
      firmwareFamily: 'PX4' as const,
      flightControllerModel: 'Pixhawk 6C Mini',
      airframe: 'F450 or X450 frame',
      profileSourceType: 'Owner provided' as const,
      profileSourceLabel: 'Owner-provided drone profile',
      referenceBuildNote: 'Reference build: Mini Pro',
      legacyLabels: ['Mini Pro V6'],
      components: MINI_PRO_COMPONENTS
    })
  }

  profiles.push({
    ...blankProfileFromFixture(DEFAULT_WORKSPACE_ID, { id: 'mini-base', name: 'Mini-Base' }),
    firmwareFamily: 'PX4',
    flightControllerModel: 'Pixhawk 6C Mini',
    airframe: 'F450 or X450 frame',
    profileSourceType: 'Owner provided',
    profileSourceLabel: 'Owner-provided drone profile',
    components: MINI_BASE_COMPONENTS
  })
  return profiles
}

function isFirmwareFamily(value: unknown): value is DroneFirmwareFamily {
  return value === 'PX4' || value === 'ArduPilot' || value === 'DJI' || value === 'Other' || value === 'Unspecified'
}

function isComponentGroup(value: unknown): value is DroneComponentGroup {
  return typeof value === 'string' && (DRONE_COMPONENT_GROUPS as readonly string[]).includes(value)
}

function isInstallState(value: unknown): value is DroneComponentInstallState {
  return typeof value === 'string' && (DRONE_COMPONENT_INSTALL_STATES as readonly string[]).includes(value)
}

function isDataSourceType(value: unknown): value is DroneDataSourceType {
  return typeof value === 'string' && (DRONE_DATA_SOURCE_TYPES as readonly string[]).includes(value)
}

function isSpecification(value: unknown): value is DroneHardwareSpecification {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<DroneHardwareSpecification>
  return typeof item.id === 'string' && typeof item.label === 'string' && typeof item.value === 'string'
}

function isComponent(value: unknown): value is DroneHardwareComponent {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<DroneHardwareComponent>
  return typeof item.id === 'string' && isComponentGroup(item.group) &&
    typeof item.name === 'string' && typeof item.purpose === 'string' &&
    typeof item.manufacturer === 'string' && typeof item.model === 'string' &&
    typeof item.partNumber === 'string' && typeof item.revision === 'string' &&
    isInstallState(item.installState) && isDataSourceType(item.sourceType) &&
    typeof item.sourceLabel === 'string' && typeof item.sourceUrl === 'string' &&
    typeof item.sourceDate === 'string' && Array.isArray(item.specifications) && item.specifications.every(isSpecification)
}

function isOptionalNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
}

function isProfile(value: unknown): value is WorkspaceDroneProfile {
  if (typeof value !== 'object' || value === null) return false
  const profile = value as Partial<WorkspaceDroneProfile>
  return typeof profile.id === 'string' &&
    typeof profile.workspaceId === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.missionUseCase === 'string' &&
    isDataSourceType(profile.profileSourceType) &&
    typeof profile.profileSourceLabel === 'string' &&
    typeof profile.profileSourceUrl === 'string' &&
    typeof profile.profileSourceDate === 'string' &&
    isFirmwareFamily(profile.firmwareFamily) &&
    typeof profile.flightControllerModel === 'string' &&
    typeof profile.firmwareVersion === 'string' &&
    typeof profile.airframe === 'string' &&
    isOptionalNumber(profile.frameSizeMm) &&
    isOptionalNumber(profile.maxPropDiameterIn) &&
    typeof profile.motorMountPatternMm === 'string' &&
    typeof profile.stackMountPatternMm === 'string' &&
    isOptionalNumber(profile.frameWeightG) &&
    isOptionalNumber(profile.maxFlightTimeMin) &&
    isOptionalNumber(profile.maxSpeedMps) &&
    isOptionalNumber(profile.maxTakeoffWeightKg) &&
    isOptionalNumber(profile.maxPayloadKg) &&
    typeof profile.referenceBuildNote === 'string' &&
    Array.isArray(profile.legacyLabels) && profile.legacyLabels.every((label) => typeof label === 'string') &&
    Array.isArray(profile.components) && profile.components.every(isComponent)
}

function isLegacyComponent(value: unknown): value is LegacyDroneHardwareComponent {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<LegacyDroneHardwareComponent>
  return typeof item.id === 'string' && isComponentGroup(item.group) &&
    typeof item.name === 'string' && typeof item.purpose === 'string'
}

function isLegacyProfile(value: unknown): value is LegacyWorkspaceDroneProfile {
  if (typeof value !== 'object' || value === null) return false
  const profile = value as Partial<LegacyWorkspaceDroneProfile>
  return typeof profile.id === 'string' &&
    typeof profile.workspaceId === 'string' &&
    typeof profile.name === 'string' &&
    isFirmwareFamily(profile.firmwareFamily) &&
    typeof profile.flightControllerModel === 'string' &&
    typeof profile.firmwareVersion === 'string' &&
    typeof profile.airframe === 'string' &&
    isOptionalNumber(profile.maxFlightTimeMin) &&
    isOptionalNumber(profile.maxSpeedMps) &&
    isOptionalNumber(profile.maxTakeoffWeightKg) &&
    typeof profile.referenceBuildNote === 'string' &&
    Array.isArray(profile.legacyLabels) && profile.legacyLabels.every((label) => typeof label === 'string') &&
    Array.isArray(profile.components) && profile.components.every(isLegacyComponent)
}

function migrateLegacyProfile(profile: LegacyWorkspaceDroneProfile): WorkspaceDroneProfile {
  return {
    ...blankProfileFromFixture(profile.workspaceId, { id: profile.id, name: profile.name }, profile.legacyLabels),
    ...profile,
    profileSourceType: 'Unverified',
    profileSourceLabel: '',
    profileSourceUrl: '',
    profileSourceDate: '',
    components: profile.components.map((item) => ({
      ...newDroneHardwareComponent(item.id),
      ...item,
      sourceType: 'Unverified'
    }))
  }
}

const LEGACY_DEMO_COPY: Record<string, string> = {
  'Camera Stereo IMX219-83': 'IMX219-83 stereo camera',
  'Pin 4S 5300mAh': '4S 5300mAh battery',
  'Motor 900kV X3115': '900kV X3115 motor',
  'ESCs 4in1 50A': '4-in-1 50A ESCs',
  'Khung Frame F450 hoặc X450': 'F450 or X450 frame',
  'Khung F450 hoặc X450': 'F450 or X450 frame',
  'Cánh quạt 9045 gemfan': 'Gemfan 9045 propellers',
  'Gimbal Siyi A8 Mini': 'SIYI A8 Mini gimbal',
  'Jetson Orin Nano': 'NVIDIA Jetson Orin Nano',
  'Raspberry Pi5 8GB': 'Raspberry Pi 5 8GB'
}

function normalizeDemoDroneCopy(profiles: WorkspaceDroneProfile[]): WorkspaceDroneProfile[] {
  return profiles.map((profile) => {
    if (profile.id !== 'mini-pro-v6' && profile.id !== 'mini-base') return profile
    return {
      ...profile,
      airframe: LEGACY_DEMO_COPY[profile.airframe] ?? profile.airframe,
      components: profile.components.map((item) => ({
        ...item,
        name: LEGACY_DEMO_COPY[item.name] ?? item.name
      }))
    }
  })
}

/** Load Workspace-scoped profiles and migrate version-1 records without touching project data. */
export function loadDroneProfiles(): WorkspaceDroneProfile[] {
  const seeded = seedDroneProfiles()
  try {
    const currentRaw = localStorage.getItem(DRONE_DB_KEY)
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as Partial<DroneDatabaseShape>
      if (current.version === DRONE_DB_VERSION && Array.isArray(current.profiles) && current.profiles.every(isProfile)) {
        return normalizeDemoDroneCopy(current.profiles)
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_DRONE_DB_KEY)
    if (!legacyRaw) return seeded
    const legacy = JSON.parse(legacyRaw) as { version?: unknown; profiles?: unknown }
    if (legacy.version !== 1 || !Array.isArray(legacy.profiles) || !legacy.profiles.every(isLegacyProfile)) return seeded
    const migrated = normalizeDemoDroneCopy(legacy.profiles.map(migrateLegacyProfile))
    saveDroneProfiles(migrated)
    return migrated
  } catch {
    return seeded
  }
}

/** Persist every Workspace's profiles as one versioned local record. */
export function saveDroneProfiles(profiles: WorkspaceDroneProfile[]): boolean {
  try {
    const shape: DroneDatabaseShape = { version: DRONE_DB_VERSION, profiles }
    localStorage.setItem(DRONE_DB_KEY, JSON.stringify(shape))
    return true
  } catch {
    return false
  }
}

export function newDroneProfile(id: string, workspaceId: string): WorkspaceDroneProfile {
  return blankProfileFromFixture(workspaceId, { id, name: 'New drone' })
}
