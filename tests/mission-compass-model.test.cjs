const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  MISSION_CUBE_OBLIQUE_PITCH,
  MISSION_CUBE_SIDE_PITCH,
  MISSION_CUBE_SNAPS,
  MISSION_CUBE_TOP_PITCH,
  resolveMissionSnap,
  resolveRegionSnap,
} = require("../src/features/scene/mission-compass-model.ts");

const component = fs.readFileSync(
  path.join(__dirname, "../src/features/scene/mission-compass-cube.tsx"),
  "utf8",
);
const closeTo = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-12,
    `${actual} should equal ${expected}`,
  );

test("compass catalog retains every face, diagonal, and oblique snap ID", () => {
  assert.deepEqual(
    MISSION_CUBE_SNAPS.map(({ id }) => id),
    [
      "top",
      "south",
      "north",
      "west",
      "east",
      "southwest",
      "northwest",
      "northeast",
      "southeast",
      "top-south",
      "top-north",
      "top-west",
      "top-east",
      "top-southwest",
      "top-northwest",
      "top-northeast",
      "top-southeast",
    ],
  );
  assert.deepEqual(resolveMissionSnap("top"), {
    pitch: MISSION_CUBE_TOP_PITCH,
  });
  assert.equal(resolveMissionSnap("unknown"), null);
  closeTo(resolveMissionSnap("top-south").pitch, MISSION_CUBE_OBLIQUE_PITCH);
});

test("compass center regions retain the five face snaps", () => {
  assert.deepEqual(resolveRegionSnap("TOP", 0, 0), {
    pitch: MISSION_CUBE_TOP_PITCH,
  });
  for (const [face, heading] of [
    ["SOUTH", 0],
    ["NORTH", Math.PI],
    ["WEST", Math.PI / 2],
    ["EAST", (3 * Math.PI) / 2],
  ]) {
    const snap = resolveRegionSnap(face, 0, 0);
    closeTo(snap.heading, heading);
    closeTo(snap.pitch, MISSION_CUBE_SIDE_PITCH);
  }
});

test("top-face edges and corners resolve to heading-relative side and diagonal views", () => {
  assert.deepEqual(resolveRegionSnap("TOP", 0, -0.8), {
    heading: Math.PI,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  });
  assert.deepEqual(resolveRegionSnap("TOP", -0.8, 0), {
    heading: Math.PI / 2,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  });
  assert.deepEqual(resolveRegionSnap("TOP", 0, 0.8), {
    heading: 0,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  });
  assert.deepEqual(resolveRegionSnap("TOP", -0.8, -0.8), {
    heading: (3 * Math.PI) / 4,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  });
  assert.deepEqual(resolveRegionSnap("TOP", 0.8, -0.8), {
    heading: (5 * Math.PI) / 4,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  });
  assert.deepEqual(resolveRegionSnap("TOP", -0.8, 0.8), {
    heading: Math.PI / 4,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  });
  assert.deepEqual(resolveRegionSnap("TOP", 0.8, 0.8), {
    heading: (7 * Math.PI) / 4,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  });
});

test("heading wrap and side-face edge/corner regions keep their prior snaps", () => {
  const north = resolveRegionSnap("TOP", 0, -0.8, 0);
  assert.deepEqual(resolveRegionSnap("TOP", 0, -0.8, 2 * Math.PI), north);
  assert.deepEqual(resolveRegionSnap("TOP", 0, -0.8, -2 * Math.PI), north);
  assert.deepEqual(resolveRegionSnap("SOUTH", 0, -0.8), {
    heading: 0,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  });
  assert.deepEqual(resolveRegionSnap("SOUTH", -0.8, 0), {
    heading: (7 * Math.PI) / 4,
    pitch: MISSION_CUBE_SIDE_PITCH,
  });
  assert.deepEqual(resolveRegionSnap("SOUTH", -0.8, -0.8), {
    heading: (7 * Math.PI) / 4,
    pitch: MISSION_CUBE_OBLIQUE_PITCH,
  });
  assert.deepEqual(resolveRegionSnap("SOUTH", -0.8, 0.8), {
    heading: (7 * Math.PI) / 4,
    pitch: MISSION_CUBE_SIDE_PITCH,
  });
});

test("component retains keyboard snaps and pointer-capture cleanup ownership", () => {
  assert.match(component, /data-testid=\{`ms-cube-kb-\$\{snap\.id\}`\}/);
  assert.match(
    component,
    /snapRef\.current\(\{ heading: snap\.heading, pitch: snap\.pitch \}\)/,
  );
  assert.match(component, /onPointerCancel=\{handlePointerCancel\}/);
  assert.match(component, /onLostPointerCapture=\{handleLostPointerCapture\}/);
  assert.match(
    component,
    /releasePointerCapture\(activePointerIdRef\.current\)/,
  );
  assert.match(component, /activePointerIdRef\.current = null/);
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(__dirname, "../src/features/scene/mission-compass-model.ts"),
      "utf8",
    ),
    /from ["'](?:react|cesium)/,
  );
});
