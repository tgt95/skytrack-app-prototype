/* Persistent browser keys and payload versions are compatibility contracts.
   Change them only with an explicit migration and matching contract updates. */
export const STORAGE_KEYS = {
  authentication: 'skytrack-mission-studio-authenticated',
  themePreference: 'skytrack-mission-studio-theme-v1',
  missionDesignPreferences: 'skytrack-mission-design-preferences-v1',
  accountProfile: 'skytrack-mission-studio-profile-v1',
  accountNotifications: 'skytrack-mission-studio-notifications-v1',
  activeWorkspace: 'ms-lib-active-workspace-v1',
  libraryDatabase: 'skytrack-library-db-v1',
  droneProfiles: 'ms-lib-drone-profiles-v2',
  legacyDroneProfiles: 'ms-lib-drone-profiles-v1',
  workspaceResources: 'ms-lib-workspace-resources-v1'
} as const

export const STORAGE_VERSIONS = {
  missionDesignPreferences: 1,
  libraryDatabase: 1,
  droneProfiles: 2,
  legacyDroneProfiles: 1,
  workspaceResources: 1
} as const
