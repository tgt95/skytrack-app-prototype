const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const projects = require("../src/features/library/database/projects.json");
const { missionFromSnapshot } = require("../src/domain/mission-model.ts");
const {
  resolveMissionWorldAssetId,
} = require("../src/features/library/cards/mission-world-asset.ts");

const previewDir = path.join(
  __dirname,
  "../src/features/library/database/worlds/previews",
);

test("p1 seeds a restorable Santorini 2D mission and 750 Railroad 3D mission", () => {
  const project = projects.find((item) => item.id === "p1");
  assert.ok(project, "the p1 project seed exists");

  const santoriniRecord = project.missions.find((item) => item.id === "m1");
  assert.ok(santoriniRecord, "the Santorini demo record exists");
  const santorini = missionFromSnapshot(santoriniRecord.missionData);
  assert.equal(santorini.name, "Santorini coastal survey");
  assert.equal(santorini.worldType, "2D");
  assert.equal(santorini.world, "Blank space");
  assert.deepEqual(santorini.origin, { lat: 36.3932, lng: 25.4615 });

  const railroadRecord = project.missions.find((item) => item.id === "m2");
  assert.ok(railroadRecord, "the 750 Railroad demo record exists");
  const railroad = missionFromSnapshot(railroadRecord.missionData);
  assert.equal(railroad.name, "750 Railroad Ave property survey");
  assert.equal(railroad.worldType, "3D");
  assert.equal(railroad.world, "750 Railroad Ave");
  assert.equal(railroad.worldId, "bundled-world-750-railroad-ave");
  assert.equal(
    resolveMissionWorldAssetId(railroad, [
      {
        id: "sample-world-tuan-workspace-750-railroad-ave",
        name: "750 Railroad Ave",
        glbAssetId: "bundled-world-750-railroad-ave",
      },
    ]),
    "bundled-world-750-railroad-ave",
  );
});

test("3D mission thumbnails resolve workspace IDs and legacy GLB asset IDs", () => {
  const railroadWorld = {
    id: "sample-world-tuan-workspace-750-railroad-ave",
    name: "750 Railroad Ave",
    glbAssetId: "bundled-world-750-railroad-ave",
  };
  const worlds = [railroadWorld];

  assert.equal(
    resolveMissionWorldAssetId(
      { worldId: railroadWorld.id, world: railroadWorld.name },
      worlds,
    ),
    railroadWorld.glbAssetId,
  );
  assert.equal(
    resolveMissionWorldAssetId(
      { worldId: railroadWorld.glbAssetId, world: railroadWorld.name },
      worlds,
    ),
    railroadWorld.glbAssetId,
  );
  assert.equal(
    resolveMissionWorldAssetId({ world: railroadWorld.name }, worlds),
    railroadWorld.glbAssetId,
  );
  assert.equal(
    resolveMissionWorldAssetId(
      { worldId: "missing-world", world: railroadWorld.name },
      worlds,
    ),
    undefined,
  );
});

test("all bundled World preview assets are valid PNG files", () => {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  for (const fileName of [
    "750-railroad-ave.png",
    "leeville-pike.png",
    "55-acres-uselton-rd.png",
  ]) {
    const file = fs.readFileSync(path.join(previewDir, fileName));
    assert.deepEqual(file.subarray(0, pngSignature.length), pngSignature);
    assert.ok(file.length > 10_000, `${fileName} contains a rendered preview`);
  }
});
