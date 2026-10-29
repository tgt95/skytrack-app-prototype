const test = require("node:test");
const assert = require("node:assert/strict");
const { emptyMission } = require("../src/domain/mission-types.ts");
const {
  syncCommittedMissionEntities,
} = require("../src/features/scene/sync-committed-layer.ts");

function color(value, alpha = 1) {
  return {
    value,
    alpha,
    withAlpha(nextAlpha) {
      return color(value, nextAlpha);
    },
    toCssColorString() {
      return `${value}@${alpha}`;
    },
  };
}

class FakeColor {
  static WHITE = color("#ffffff");
  static BLACK = color("#000000");
  static fromCssColorString(value) {
    return color(value);
  }
  static lerp(start, end, amount) {
    return color(`${start.value}:${end.value}:${amount}`);
  }
  withAlpha(alpha) {
    return color("#000000", alpha);
  }
}

class FakeCartesian2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class FakePolygonHierarchy {
  constructor(positions) {
    this.positions = positions;
  }
}

class FakePolylineDashMaterialProperty {
  constructor(options) {
    this.options = options;
  }
}

class FakeDistanceDisplayCondition {
  constructor(near, far) {
    this.near = near;
    this.far = far;
  }
}

const FakeCartesian3 = {
  fromDegrees(lng, lat, height) {
    return { kind: "point", lng, lat, height };
  },
  fromDegreesArray(values) {
    return { kind: "ring", values };
  },
  fromDegreesArrayHeights(values) {
    return { kind: "path", values };
  },
};

const Cesium = {
  ArcType: { NONE: "NONE" },
  Cartesian2: FakeCartesian2,
  Cartesian3: FakeCartesian3,
  Cartographic: {
    fromDegrees(lng, lat) {
      return { lng, lat };
    },
  },
  Color: FakeColor,
  DistanceDisplayCondition: FakeDistanceDisplayCondition,
  LabelStyle: { FILL_AND_OUTLINE: "FILL_AND_OUTLINE" },
  PolygonHierarchy: FakePolygonHierarchy,
  PolylineDashMaterialProperty: FakePolylineDashMaterialProperty,
  VerticalOrigin: { CENTER: "CENTER" },
};

function fixtureMission() {
  const mission = emptyMission();
  mission.id = "scene-entity-fixture";
  mission.name = "Scene entity fixture";
  mission.world = "Rolling hills";
  mission.worldType = "3D";
  mission.origin = { lat: 37.5, lng: -122.25 };
  mission.spawn = { x: 5, y: 8 };
  mission.takeoffAltM = 12;
  mission.returnHomeOnEnd = true;
  mission.routes = [{ id: "route-a", label: "Route A", targetSpeedMS: 3 }];
  mission.sequenceOrder = [
    { type: "route", id: "route-a" },
    { type: "area", id: "area-a" },
  ];
  mission.waypoints = [
    { id: "wp-a", seq: 1, x: 0, y: 0, z: 10, actions: [], routeId: "route-a" },
    {
      id: "photo-a",
      seq: 2,
      x: 20,
      y: 0,
      z: 15,
      actions: [{ id: "photo-a1", kind: "photo", label: "Photo capture" }],
      routeId: "route-a",
    },
    {
      id: "photo-b",
      seq: 3,
      x: 40,
      y: 0,
      z: 15,
      actions: [{ id: "photo-b1", kind: "photo", label: "Photo capture" }],
      routeId: "route-a",
    },
  ];
  mission.areas = [
    {
      id: "area-a",
      label: "Area A",
      points: [
        { x: 50, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 30 },
        { x: 50, y: 30 },
      ],
      lineSpacingM: 10,
    },
  ];
  mission.avoids = [
    {
      id: "avoid-a",
      label: "Avoid A",
      points: [
        { x: 10, y: 10 },
        { x: 15, y: 10 },
        { x: 15, y: 15 },
        { x: 10, y: 15 },
      ],
      heightM: 5,
      baseAltM: 2,
    },
  ];
  return mission;
}

function recordingViewer() {
  const initial = [
    { id: "ms-wp-old" },
    { id: "ms-photo-base-photo-a" },
    { id: "ms-preview-scan-ray-0" },
    { id: "ms-waypoint-ground-guide" },
    { id: "ms-search-result" },
    { id: "unrelated-widget" },
  ];
  const events = [];
  let valuesReads = 0;
  const viewer = {
    entities: {
      get values() {
        valuesReads += 1;
        return initial;
      },
      add(entity) {
        initial.push(entity);
        events.push(`add:${entity.id}`);
        return entity;
      },
      remove(entity) {
        const index = initial.indexOf(entity);
        if (index < 0) return false;
        initial.splice(index, 1);
        events.push(`remove:${entity.id}`);
        return true;
      },
    },
    scene: {
      globe: {
        getHeight() {
          return 0;
        },
      },
    },
  };
  return {
    viewer,
    entities: initial,
    events,
    getValuesReads: () => valuesReads,
  };
}

function withCanvasStub(run) {
  const previousDocument = global.document;
  global.document = {
    createElement() {
      return { getContext: () => null, toDataURL: () => "data:fake-marker" };
    },
  };
  try {
    return run();
  } finally {
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
}

test("committed entity coordinator preserves IDs, properties, order, layer cleanup, and terrain return", () => {
  const recording = recordingViewer();
  const triangles = withCanvasStub(() =>
    syncCommittedMissionEntities({
      viewer: recording.viewer,
      Cesium,
      mission: fixtureMission(),
      selection: { kind: "avoid", id: "avoid-a" },
      simActive: true,
      showAreaSurface: true,
      focusedPhotoWaypointId: "photo-a",
    }),
  );
  const added = recording.entities.filter((entity) =>
    entity.id.startsWith("ms-"),
  );
  const byId = new Map(added.map((entity) => [entity.id, entity]));
  const ids = recording.events
    .filter((event) => event.startsWith("add:"))
    .map((event) => event.slice("add:".length));

  assert.equal(
    recording.getValuesReads(),
    1,
    "committed layer is enumerated once",
  );
  assert.deepEqual(recording.events.slice(0, 2), [
    "remove:ms-wp-old",
    "add:ms-home-point",
  ]);
  assert.deepEqual(ids.slice(0, 5), [
    "ms-home-point",
    "ms-home-departure",
    "ms-home-return",
    "ms-world-terrain-0-0",
    "ms-world-terrain-0-1",
  ]);
  assert.ok(ids.indexOf("ms-area-area-a") < ids.indexOf("ms-avoid-avoid-a"));
  assert.ok(
    ids.indexOf("ms-avoid-avoid-a") < ids.indexOf("ms-area-scan-area-a"),
  );
  assert.ok(
    ids.indexOf("ms-area-scan-area-a") < ids.indexOf("ms-avoid-z-avoid-a"),
  );
  assert.ok(
    ids.indexOf("ms-avoid-z-avoid-a") < ids.indexOf("ms-route-route-a"),
  );
  assert.ok(ids.indexOf("ms-route-route-a") < ids.indexOf("ms-wp-wp-a"));
  assert.ok(ids.some((id) => id.startsWith("ms-transfer-len-")));
  assert.ok(ids.includes("ms-route-len-route-a-1"));
  assert.ok(ids.includes("ms-route-insert-1"));
  assert.equal(byId.get("ms-home-point").point.pixelSize, 18);
  assert.equal(byId.get("ms-avoid-z-avoid-a").show, true);
  assert.equal(byId.get("ms-wp-photo-a").show, true);
  assert.equal(byId.get("ms-wp-photo-b").show, false);
  assert.equal(byId.get("ms-route-insert-1").show, false);
  assert.equal(byId.get("ms-vehicle").show, true);
  assert.equal(triangles.length, 128);
  assert.ok(
    recording.entities.some((entity) => entity.id === "ms-photo-base-photo-a"),
  );
  assert.ok(
    recording.entities.some((entity) => entity.id === "ms-preview-scan-ray-0"),
  );
  assert.ok(
    recording.entities.some(
      (entity) => entity.id === "ms-waypoint-ground-guide",
    ),
  );
  assert.ok(
    recording.entities.some((entity) => entity.id === "ms-search-result"),
  );
  assert.ok(
    recording.entities.some((entity) => entity.id === "unrelated-widget"),
  );
});
