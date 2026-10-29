const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const projects = require("../src/features/library/database/projects.json");
const leevilleMission = require("../src/features/library/database/missions/leeville-pike-flight.json");
const { missionFromSnapshot } = require("../src/domain/mission-model.ts");
const {
  resolveMissionWorldAssetId,
} = require("../src/features/library/cards/mission-world-asset.ts");

const previewDir = path.join(
  __dirname,
  "../src/features/library/database/worlds/previews",
);

test("p1 seeds the restorable Leeville Pike stakeholder mission", () => {
  const project = projects.find((item) => item.id === "p1");
  assert.ok(project, "the p1 project seed exists");
  assert.equal(project.name, "Tuan's project");

  const missionRecord = project.missions.find(
    (item) => item.id === "m-local-mvrqcly0-101",
  );
  assert.ok(missionRecord, "the Leeville Pike mission record exists");
  const mission = missionFromSnapshot(JSON.stringify(leevilleMission));
  assert.equal(mission.name, "Leeville Pike Flight");
  assert.equal(mission.worldType, "3D");
  assert.equal(mission.world, "Leeville Pike roof assessment");
  assert.equal(mission.waypoints.length, 26);
  assert.equal(mission.areas.length, 2);
  assert.equal(mission.avoids.length, 1);
  assert.equal(mission.aiWorkflows.length, 1);
  assert.equal(
    resolveMissionWorldAssetId(mission, [
      {
        id: "sample-world-tuan-workspace-leeville-pike-roof-assessment",
        name: "Leeville Pike roof assessment",
        glbAssetId: "bundled-world-leeville-pike-roof-assessment",
      },
    ]),
    "bundled-world-leeville-pike-roof-assessment",
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
