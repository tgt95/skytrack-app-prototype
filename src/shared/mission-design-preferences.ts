import { STORAGE_KEYS } from './storage-keys'

export const MISSION_DESIGN_PREFERENCES_CHANGE_EVENT = 'skytrack:mission-design-preferences-change'

export interface MissionDesignPreferences {
  zoomDirection: 'normal' | 'reversed'
  zoomAnchor: 'cursor' | 'center'
  showWaypointLabels: boolean
  showRouteDistances: boolean
  showAreaScanLanes: boolean
  targetSpeedMS: number
  takeoffAltitudeM: number
  areaLineSpacingM: number
}

export const DEFAULT_MISSION_DESIGN_PREFERENCES: MissionDesignPreferences = {
  zoomDirection: 'normal',
  zoomAnchor: 'cursor',
  showWaypointLabels: true,
  showRouteDistances: true,
  showAreaScanLanes: true,
  targetSpeedMS: 2,
  takeoffAltitudeM: 12,
  areaLineSpacingM: 6,
}

function validNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function readMissionDesignPreferences(): MissionDesignPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.missionDesignPreferences)
    if (!raw) return DEFAULT_MISSION_DESIGN_PREFERENCES
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return DEFAULT_MISSION_DESIGN_PREFERENCES
    const record = value as { version?: unknown; preferences?: unknown } & Partial<MissionDesignPreferences>
    const stored = record.version === 1 && record.preferences && typeof record.preferences === 'object'
      ? record.preferences as Partial<MissionDesignPreferences>
      : record
    const base = DEFAULT_MISSION_DESIGN_PREFERENCES
    return {
      zoomDirection: stored.zoomDirection === 'reversed' ? 'reversed' : 'normal',
      zoomAnchor: stored.zoomAnchor === 'center' ? 'center' : 'cursor',
      showWaypointLabels: typeof stored.showWaypointLabels === 'boolean' ? stored.showWaypointLabels : base.showWaypointLabels,
      showRouteDistances: typeof stored.showRouteDistances === 'boolean' ? stored.showRouteDistances : base.showRouteDistances,
      showAreaScanLanes: typeof stored.showAreaScanLanes === 'boolean' ? stored.showAreaScanLanes : base.showAreaScanLanes,
      targetSpeedMS: validNumber(stored.targetSpeedMS, 0.1, 30) ? stored.targetSpeedMS : base.targetSpeedMS,
      takeoffAltitudeM: validNumber(stored.takeoffAltitudeM, 0, 500) ? stored.takeoffAltitudeM : base.takeoffAltitudeM,
      areaLineSpacingM: validNumber(stored.areaLineSpacingM, 0.1, 100) ? stored.areaLineSpacingM : base.areaLineSpacingM,
    }
  } catch {
    return DEFAULT_MISSION_DESIGN_PREFERENCES
  }
}

export function saveMissionDesignPreferences(preferences: MissionDesignPreferences): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEYS.missionDesignPreferences, JSON.stringify({
      version: 1,
      preferences,
    }))
    if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(MISSION_DESIGN_PREFERENCES_CHANGE_EVENT))
    return true
  } catch {
    return false
  }
}
