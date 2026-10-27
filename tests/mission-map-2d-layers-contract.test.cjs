const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sceneDir = path.join(__dirname, "../src/features/scene");
const hostSource = fs.readFileSync(
  path.join(sceneDir, "mission-map-2d.tsx"),
  "utf8",
);
const layerSource = fs.readFileSync(
  path.join(sceneDir, "mission-map-2d-layers.ts"),
  "utf8",
);

test("Leaflet host owns map lifecycle while layer module owns overlay redraw", () => {
  assert.match(hostSource, /L\.map\(host/);
  assert.match(hostSource, /map\.on\("click"/);
  assert.match(hostSource, /map\.off\("click"/);
  assert.match(hostSource, /map\.remove\(\)/);
  assert.match(hostSource, /BASEMAPS\[basemap\]/);
  assert.match(hostSource, /map\.setView\(\[origin\.lat, origin\.lng\]/);
  assert.match(hostSource, /drawMissionMapLayers\(\{/);
  assert.doesNotMatch(layerSource, /L\.map\(/);
  assert.doesNotMatch(layerSource, /map\.(?:on|off|remove)\(/);
  assert.equal((layerSource.match(/group\.clearLayers\(\)/g) ?? []).length, 1);
  assert.match(layerSource, /mission\.areas\.forEach/);
  assert.match(layerSource, /mission\.avoids\.forEach/);
  assert.match(layerSource, /onWaypointSelect\(waypoint\.id\)/);
  assert.match(layerSource, /onZoneSelect\("area", area\.id\)/);
  assert.match(layerSource, /onZoneSelect\("avoid", avoid\.id\)/);
});
