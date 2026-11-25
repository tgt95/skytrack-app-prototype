const test = require("node:test");
const assert = require("node:assert/strict");
const {
  STORAGE_KEYS,
  STORAGE_VERSIONS,
} = require("../src/shared/storage-keys.ts");

test("browser storage keys and versioned payloads remain explicit compatibility contracts", () => {
  assert.deepEqual(STORAGE_KEYS, {
    authentication: "skytrack-mission-studio-authenticated",
    themePreference: "skytrack-mission-studio-theme-v1",
    missionDesignPreferences: "skytrack-mission-design-preferences-v1",
    accountProfile: "skytrack-mission-studio-profile-v1",
    accountNotifications: "skytrack-mission-studio-notifications-v1",
    activeWorkspace: "ms-lib-active-workspace-v1",
    libraryDatabase: "skytrack-library-db-v1",
    droneProfiles: "ms-lib-drone-profiles-v2",
    legacyDroneProfiles: "ms-lib-drone-profiles-v1",
    workspaceResources: "ms-lib-workspace-resources-v1",
  });
  assert.deepEqual(STORAGE_VERSIONS, {
    missionDesignPreferences: 1,
    libraryDatabase: 2,
    droneProfiles: 2,
    legacyDroneProfiles: 1,
    workspaceResources: 2,
  });
});

test("versioned stores and preference/workspace records round-trip through their established keys", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  const oldLocalStorage = global.localStorage;
  const oldWindow = global.window;
  global.localStorage = storage;
  global.window = { localStorage: storage };
  try {
    const {
      DEFAULT_WORKSPACE_ID,
      readActiveWorkspaceId,
      saveActiveWorkspaceId,
    } = require("../src/features/library/workspace/workspace-data.ts");
    const library = require("../src/features/library/database/store.ts");
    const drone = require("../src/features/library/database/drone-store.ts");
    const bundledAssetsPath =
      require.resolve("../src/features/library/database/bundled-world-assets.ts");
    require.cache[bundledAssetsPath] = {
      id: bundledAssetsPath,
      filename: bundledAssetsPath,
      loaded: true,
      exports: { BUNDLED_WORLD_ASSETS: [] },
    };
    const resources = require("../src/features/library/database/workspace-resources-store.ts");
    const theme = require("../src/shared/theme-preference.ts");
    const account = require("../src/features/library/account/account-menu-state.ts");
    const missionDesign = require("../src/shared/mission-design-preferences.ts");

    const mission = {
      id: "guardrail-mission",
      name: "Contract mission",
      updatedAt: "2026-11-26T00:00:00.000Z",
      starred: false,
      shared: false,
      viewOnly: false,
      worldType: "2D",
      world: "Blank space",
      vehicle: "Test vehicle",
      missionData: JSON.stringify({
        id: "guardrail-mission",
        name: "Contract mission",
        worldType: "2D",
        world: "Blank space",
      }),
    };
    const project = {
      id: "guardrail-project",
      name: "Contract project",
      workspaceId: DEFAULT_WORKSPACE_ID,
      missions: [mission],
    };
    assert.equal(library.saveProjects([project]), true);
    assert.equal(
      JSON.parse(values.get(STORAGE_KEYS.libraryDatabase)).version,
      STORAGE_VERSIONS.libraryDatabase,
    );
    assert.deepEqual(
      library.loadProjects().find((item) => item.id === project.id),
      {
        ...project,
        missions: [
          {
            ...mission,
            worldId: undefined,
            droneId: undefined,
            sharedWith: [],
            sharedRoles: {},
          },
        ],
      },
    );

    const terrainLayer = {
      sourceFileName: "survey-dem.tif",
      center: { lat: 36.357, lon: 25.361 },
      bbox: [25.36, 36.356, 25.362, 36.358],
      widthM: 180,
      gridSize: 2,
      elevationsM: [1, 2, 3, 4],
      baseElevationM: 1,
      horizontalReference: "EPSG:4326",
      verticalReference: "EGM2008/EPSG:3855",
    };
    const terrainMission = {
      ...mission,
      id: "terrain-reference-mission",
      terrainLayer,
    };
    assert.equal(
      library.saveProjects([{ ...project, missions: [terrainMission] }]),
      true,
    );
    const reloadedTerrainMission = library
      .loadProjects()
      .find((item) => item.id === project.id)
      ?.missions.find((item) => item.id === terrainMission.id);
    assert.deepEqual(reloadedTerrainMission?.terrainLayer, terrainLayer);
    assert.equal(library.saveProjects([project]), true);

    const profile = drone.newDroneProfile(
      "guardrail-drone",
      DEFAULT_WORKSPACE_ID,
    );
    assert.equal(drone.saveDroneProfiles([profile]), true);
    assert.equal(
      JSON.parse(values.get(STORAGE_KEYS.droneProfiles)).version,
      STORAGE_VERSIONS.droneProfiles,
    );
    assert.deepEqual(drone.loadDroneProfiles(), [profile]);

    const worldResources = {
      version: STORAGE_VERSIONS.workspaceResources,
      worlds: [
        {
          id: "guardrail-world",
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: "Survey world",
          location: "Test site",
          status: "Draft",
          sourceType: "none",
          sourceMissionId: "",
          sourceMissionLabel: "",
          sourceFlightReference: "",
          reconstructionReference: "",
          note: "",
        },
      ],
      mapDatasets: [],
      aiModels: [],
    };
    assert.equal(resources.saveWorkspaceResources(worldResources), true);
    assert.equal(
      JSON.parse(values.get(STORAGE_KEYS.workspaceResources)).version,
      STORAGE_VERSIONS.workspaceResources,
    );
    const loadedResources = resources.loadWorkspaceResources();
    assert.deepEqual(loadedResources.worlds, worldResources.worlds);
    assert.deepEqual(loadedResources.mapDatasets, []);
    assert.deepEqual(
      loadedResources.aiModels.map((model) => model.id),
      [
        "sample-model-tuan-workspace-common-objects-detection",
        "sample-model-tuan-workspace-fire-and-explosion-detection",
        "sample-model-tuan-workspace-objects-detection-by-drones",
        "sample-model-survey-operations-common-objects-detection",
        "sample-model-survey-operations-fire-and-explosion-detection",
        "sample-model-survey-operations-objects-detection-by-drones",
        "sample-model-tuan-workspace-bridge-inspection-v1",
      ],
    );

    assert.equal(theme.saveThemePreference("dark"), true);
    assert.equal(theme.readThemePreference(), "dark");
    assert.equal(
      account.saveAccountProfile({
        name: " Contract Owner ",
        email: "ignored@example.test",
      }),
      true,
    );
    assert.equal(account.readAccountProfile().name, "Contract Owner");
    const notifications = {
      missionActivity: false,
      sharedProjectActivity: true,
      workspaceUpdates: true,
    };
    assert.equal(account.saveNotificationPreferences(notifications), true);
    assert.deepEqual(account.readNotificationPreferences(), notifications);
    const designPreferences = {
      ...missionDesign.DEFAULT_MISSION_DESIGN_PREFERENCES,
      targetSpeedMS: 3.5,
    };
    assert.equal(
      missionDesign.saveMissionDesignPreferences(designPreferences),
      true,
    );
    assert.deepEqual(
      missionDesign.readMissionDesignPreferences(),
      designPreferences,
    );
    assert.equal(
      JSON.parse(values.get(STORAGE_KEYS.missionDesignPreferences)).version,
      STORAGE_VERSIONS.missionDesignPreferences,
    );
    saveActiveWorkspaceId(DEFAULT_WORKSPACE_ID);
    assert.equal(readActiveWorkspaceId(), DEFAULT_WORKSPACE_ID);

    assert.deepEqual(
      [...values.keys()].sort(),
      [
        STORAGE_KEYS.accountNotifications,
        STORAGE_KEYS.accountProfile,
        STORAGE_KEYS.activeWorkspace,
        STORAGE_KEYS.droneProfiles,
        STORAGE_KEYS.libraryDatabase,
        STORAGE_KEYS.missionDesignPreferences,
        STORAGE_KEYS.themePreference,
        STORAGE_KEYS.workspaceResources,
      ].sort(),
    );
  } finally {
    if (oldLocalStorage === undefined) delete global.localStorage;
    else global.localStorage = oldLocalStorage;
    if (oldWindow === undefined) delete global.window;
    else global.window = oldWindow;
  }
});

test("legacy map-only World records migrate into reusable map datasets without changing asset references", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  const oldLocalStorage = global.localStorage;
  const oldWindow = global.window;
  global.localStorage = storage;
  global.window = { localStorage: storage };
  try {
    const { STORAGE_KEYS } = require("../src/shared/storage-keys.ts");
    const {
      DEFAULT_WORKSPACE_ID,
    } = require("../src/features/library/workspace/workspace-data.ts");
    const {
      loadWorkspaceResources,
    } = require("../src/features/library/database/workspace-resources-store.ts");
    const legacyWorld = {
      id: "legacy-map-dataset",
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: "Legacy scene",
      location: "",
      status: "Draft",
      sourceType: "none",
      sourceMissionId: "",
      sourceMissionLabel: "",
      sourceFlightReference: "",
      reconstructionReference: "",
      note: "",
      mapDataAssetId: "legacy-map-asset",
      mapDataFileCount: 3,
      mapDataFeatureCount: 7,
      mapDataHasTerrain: true,
    };
    values.set(
      STORAGE_KEYS.workspaceResources,
      JSON.stringify({ version: 1, worlds: [legacyWorld], aiModels: [] }),
    );

    const migrated = loadWorkspaceResources();
    assert.deepEqual(migrated.worlds, []);
    assert.deepEqual(migrated.mapDatasets, [
      {
        id: legacyWorld.id,
        workspaceId: legacyWorld.workspaceId,
        name: legacyWorld.name,
        status: legacyWorld.status,
        mapDataAssetId: legacyWorld.mapDataAssetId,
        mapDataFileCount: legacyWorld.mapDataFileCount,
        mapDataFeatureCount: legacyWorld.mapDataFeatureCount,
        mapDataHasTerrain: legacyWorld.mapDataHasTerrain,
      },
    ]);
    assert.equal(
      JSON.parse(values.get(STORAGE_KEYS.workspaceResources)).version,
      2,
    );

    const duplicateId = "world-map-data-legacy-shell";
    values.set(
      STORAGE_KEYS.workspaceResources,
      JSON.stringify({
        version: 2,
        worlds: [
          {
            ...legacyWorld,
            id: duplicateId,
            name: "Imported scene",
            note: "Imported map data",
            mapDataAssetId: undefined,
            mapDataFileCount: undefined,
            mapDataFeatureCount: undefined,
            mapDataHasTerrain: undefined,
          },
        ],
        mapDatasets: [
          {
            id: duplicateId,
            workspaceId: DEFAULT_WORKSPACE_ID,
            name: "Imported scene",
            status: "Draft",
            mapDataAssetId: duplicateId,
            mapDataFileCount: 3,
            mapDataFeatureCount: 7,
            mapDataHasTerrain: true,
          },
        ],
        aiModels: [],
      }),
    );
    const cleaned = loadWorkspaceResources();
    assert.equal(
      cleaned.worlds.some((world) => world.id === duplicateId),
      false,
    );
    assert.equal(
      cleaned.mapDatasets.find((dataset) => dataset.id === duplicateId)
        .mapDataAssetId,
      duplicateId,
    );
  } finally {
    if (oldLocalStorage === undefined) delete global.localStorage;
    else global.localStorage = oldLocalStorage;
    if (oldWindow === undefined) delete global.window;
    else global.window = oldWindow;
  }
});
