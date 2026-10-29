import { emptyMission } from '../../domain/mission-model'
import { readMissionDesignPreferences } from '../../shared/mission-design-preferences'

/** Apply the current browser-wide defaults only when creating a new blank mission. */
export function createBlankMissionWithDefaults() {
  const mission = emptyMission()
  const preferences = readMissionDesignPreferences()
  return {
    ...mission,
    takeoffAltM: preferences.takeoffAltitudeM,
    targetSpeedMS: preferences.targetSpeedMS,
  }
}
