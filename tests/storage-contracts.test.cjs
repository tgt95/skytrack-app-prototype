const test = require('node:test')
const assert = require('node:assert/strict')
const { STORAGE_KEYS, STORAGE_VERSIONS } = require('../src/shared/storage-keys.ts')

test('browser storage keys and versioned payloads remain explicit compatibility contracts', () => {
  assert.deepEqual(STORAGE_KEYS, {
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
  })
  assert.deepEqual(STORAGE_VERSIONS, {
    missionDesignPreferences: 1,
    libraryDatabase: 1,
    droneProfiles: 2,
    legacyDroneProfiles: 1,
    workspaceResources: 1
  })
})

test('versioned stores and preference/workspace records round-trip through their established keys', () => {
  const values = new Map()
  const storage = {
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { values.set(key, String(value)) },
    removeItem(key) { values.delete(key) }
  }
  const oldLocalStorage = global.localStorage
  const oldWindow = global.window
  global.localStorage = storage
  global.window = { localStorage: storage }
  try {
    const { DEFAULT_WORKSPACE_ID, readActiveWorkspaceId, saveActiveWorkspaceId } = require('../src/features/library/workspace/workspace-data.ts')
    const library = require('../src/features/library/database/store.ts')
    const drone = require('../src/features/library/database/drone-store.ts')
    const bundledAssetsPath = require.resolve('../src/features/library/database/bundled-world-assets.ts')
    require.cache[bundledAssetsPath] = {
      id: bundledAssetsPath,
      filename: bundledAssetsPath,
      loaded: true,
      exports: { BUNDLED_WORLD_ASSETS: [] }
    }
    const resources = require('../src/features/library/database/workspace-resources-store.ts')
    const theme = require('../src/shared/theme-preference.ts')
    const account = require('../src/features/library/account/account-menu-state.ts')
    const missionDesign = require('../src/shared/mission-design-preferences.ts')

    const mission = {
      id: 'guardrail-mission', name: 'Contract mission', editedAgo: 'Just now', starred: false,
      shared: false, viewOnly: false, worldType: '2D', world: 'Blank space', vehicle: 'Test vehicle',
      missionData: JSON.stringify({ id: 'guardrail-mission', name: 'Contract mission', worldType: '2D', world: 'Blank space' })
    }
    const project = { id: 'guardrail-project', name: 'Contract project', workspaceId: DEFAULT_WORKSPACE_ID, missions: [mission] }
    assert.equal(library.saveProjects([project]), true)
    assert.equal(JSON.parse(values.get(STORAGE_KEYS.libraryDatabase)).version, STORAGE_VERSIONS.libraryDatabase)
    assert.deepEqual(library.loadProjects().find((item) => item.id === project.id), {
      ...project,
      missions: [{ ...mission, worldId: undefined, droneId: undefined }]
    })

    const profile = drone.newDroneProfile('guardrail-drone', DEFAULT_WORKSPACE_ID)
    assert.equal(drone.saveDroneProfiles([profile]), true)
    assert.equal(JSON.parse(values.get(STORAGE_KEYS.droneProfiles)).version, STORAGE_VERSIONS.droneProfiles)
    assert.deepEqual(drone.loadDroneProfiles(), [profile])

    const worldResources = {
      version: STORAGE_VERSIONS.workspaceResources,
      worlds: [{
        id: 'guardrail-world', workspaceId: DEFAULT_WORKSPACE_ID, name: 'Survey world', location: 'Test site',
        status: 'Draft', sourceType: 'none', sourceMissionId: '', sourceMissionLabel: '',
        sourceFlightReference: '', reconstructionReference: '', note: ''
      }],
      aiModels: []
    }
    assert.equal(resources.saveWorkspaceResources(worldResources), true)
    assert.equal(JSON.parse(values.get(STORAGE_KEYS.workspaceResources)).version, STORAGE_VERSIONS.workspaceResources)
    assert.deepEqual(resources.loadWorkspaceResources(), worldResources)

    assert.equal(theme.saveThemePreference('dark'), true)
    assert.equal(theme.readThemePreference(), 'dark')
    assert.equal(account.saveAccountProfile({ name: ' Contract Owner ', email: 'ignored@example.test' }), true)
    assert.equal(account.readAccountProfile().name, 'Contract Owner')
    const notifications = { missionActivity: false, sharedProjectActivity: true, workspaceUpdates: true }
    assert.equal(account.saveNotificationPreferences(notifications), true)
    assert.deepEqual(account.readNotificationPreferences(), notifications)
    const designPreferences = { ...missionDesign.DEFAULT_MISSION_DESIGN_PREFERENCES, targetSpeedMS: 3.5 }
    assert.equal(missionDesign.saveMissionDesignPreferences(designPreferences), true)
    assert.deepEqual(missionDesign.readMissionDesignPreferences(), designPreferences)
    assert.equal(JSON.parse(values.get(STORAGE_KEYS.missionDesignPreferences)).version, STORAGE_VERSIONS.missionDesignPreferences)
    saveActiveWorkspaceId(DEFAULT_WORKSPACE_ID)
    assert.equal(readActiveWorkspaceId(), DEFAULT_WORKSPACE_ID)

    assert.deepEqual([...values.keys()].sort(), [
      STORAGE_KEYS.accountNotifications,
      STORAGE_KEYS.accountProfile,
      STORAGE_KEYS.activeWorkspace,
      STORAGE_KEYS.droneProfiles,
      STORAGE_KEYS.libraryDatabase,
      STORAGE_KEYS.missionDesignPreferences,
      STORAGE_KEYS.themePreference,
      STORAGE_KEYS.workspaceResources
    ].sort())
  } finally {
    if (oldLocalStorage === undefined) delete global.localStorage
    else global.localStorage = oldLocalStorage
    if (oldWindow === undefined) delete global.window
    else global.window = oldWindow
  }
})
