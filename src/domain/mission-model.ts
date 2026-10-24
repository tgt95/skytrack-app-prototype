/* Backward-compatible public barrel for the Mission Studio domain. */
export {
  DEFAULT_AREA_RECON_FLIGHT_SETTINGS,
  DEFAULT_MISSION_ORIGIN,
  DEFAULT_RECON_FLIGHT_SETTINGS,
  MOCK_RECON_CAMERA_PROFILE,
  SAFETY_OPTIONS,
  VEHICLES,
  WORLDS,
  actionLabel,
  appendMissionSequenceItem,
  emptyMission,
  getAreaFlightAltitudeM,
  getMissionRouteWaypoints,
  getMissionRoutes,
  getMissionSequence,
  normalizeMissionRoutes,
  reorderWaypoints,
  removeMissionSequenceItem,
  renumber,
  safetyModeOf,
  uid,
  vehicleSpecOf
} from './mission-types'
export type {
  AvoidZone,
  CameraActionKind,
  EnuPoint,
  EnuVec,
  GeoAttribution,
  GeoOrigin,
  MissionArea,
  MissionRouteMeta,
  MissionSequenceItem,
  PolyZone,
  ReconFlightSettings,
  SafetyMode,
  SceneSelection,
  SceneTool,
  StudioMission,
  ValidationIssue,
  VehicleSpec,
  Waypoint,
  WaypointAction
} from './mission-types'

export {
  actionCount,
  dist3,
  getMissionEnd,
  getMissionHome,
  getMissionStart,
  isValidGeoOrigin,
  missionOrigin,
  routeLengthM,
  withMissionOrigin
} from './geo-math'
export {
  circleFootprint,
  generateAreaCapturePath,
  generateAreaScan,
  generateAreaTraversal,
  getAreaPhotoSpacingM,
  getAreaScanSpacingM,
  getMockReconGsdCmPerPx,
  getMockReconNadirFootprintM,
  getReconOverlapSpacingM,
  isValidRing,
  projectMockReconFootprintToGround
} from './area-scan'
export type { AreaCapturePathPoint } from './area-scan'
export {
  avoidBaseM,
  avoidHasVolume,
  avoidTopM,
  countDetours,
  detourAroundAvoid,
  isAuthoredWaypoint,
  withAvoidDetours
} from './avoid-detour'
export { missionFromSnapshot, simGate, snapshotOf, validateMission } from './mission-validation'
export { missionFromCode, missionToCode } from './mission-serialization'
