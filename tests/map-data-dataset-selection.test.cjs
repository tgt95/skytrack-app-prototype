const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveMapDataDatasetSelection,
} = require("../src/features/library/create-wizard/map-data-dataset-selection.ts");

function parseScene(content) {
  const value = JSON.parse(content);
  return value.features ? { id: value.id } : null;
}

function parseTerrain(content, name) {
  const value = JSON.parse(content);
  return value.terrain ? { sourceFileName: name } : null;
}

test("saved dataset combines map features with terrain from another file", () => {
  const files = [
    {
      id: "buildings",
      name: "buildings.geojson",
      type: "scene",
      content: JSON.stringify({ features: true, id: "building-layer" }),
    },
    {
      id: "terrain",
      name: "surface.tif",
      type: "scene",
      content: JSON.stringify({ terrain: true }),
    },
    {
      id: "boundary",
      name: "boundary.geojson",
      type: "boundary",
      content: JSON.stringify({ features: true, id: "boundary" }),
    },
  ];

  const selection = resolveMapDataDatasetSelection(
    files,
    parseScene,
    parseTerrain,
    null,
  );

  assert.deepEqual(
    selection.sceneFiles.map((file) => file.id),
    ["buildings"],
  );
  assert.equal(selection.sceneFile.id, "buildings");
  assert.deepEqual(selection.layer, { id: "building-layer" });
  assert.deepEqual(selection.terrain, { sourceFileName: "surface.tif" });
  assert.deepEqual(selection.datasetTerrain, selection.terrain);
});

test("saved dataset without terrain retains separately selected elevation", () => {
  const retainedTerrain = { sourceFileName: "existing.tif" };
  const files = [
    {
      id: "buildings",
      name: "buildings.geojson",
      type: "scene",
      content: JSON.stringify({ features: true, id: "building-layer" }),
    },
  ];

  const selection = resolveMapDataDatasetSelection(
    files,
    parseScene,
    parseTerrain,
    retainedTerrain,
  );

  assert.equal(selection.datasetTerrain, null);
  assert.equal(selection.terrain, retainedTerrain);
});

test("terrain embedded in a feature scene stays associated with that scene", () => {
  const files = [
    {
      id: "scene",
      name: "combined.json",
      type: "scene",
      content: JSON.stringify({
        features: true,
        terrain: true,
        id: "combined-layer",
      }),
    },
  ];

  const selection = resolveMapDataDatasetSelection(
    files,
    parseScene,
    parseTerrain,
    null,
  );

  assert.equal(selection.sceneFile.id, "scene");
  assert.deepEqual(selection.layer, { id: "combined-layer" });
  assert.deepEqual(selection.terrain, {
    sourceFileName: "combined.json",
  });
});

test("dataset without map features or terrain is rejected", () => {
  assert.throws(
    () => resolveMapDataDatasetSelection([], parseScene, parseTerrain, null),
    /no supported map feature layer/,
  );
});
