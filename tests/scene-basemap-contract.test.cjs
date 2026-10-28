const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const scene = read("src/features/scene/mission-scene.tsx");
const worldLayers = read("src/features/scene/use-mission-scene-world-layers.ts");
const basemap = read("src/features/scene/use-scene-basemap.ts");

test("scene basemap hook preserves viewer guards and imagery-free Blank space", () => {
  assert.match(scene, /useMissionSceneWorldLayers\(\{/);
  assert.match(worldLayers, /useSceneBasemap\(\{/);
  assert.match(worldLayers, /viewer: viewerRef\.current/);
  assert.match(
    basemap,
    /!viewer \|\| viewer\.isDestroyed\(\) \|\| status !== "ready"/,
  );
  assert.match(basemap, /worldType !== "2D" && world === "Blank space"/);
  assert.match(basemap, /viewer\.imageryLayers\.removeAll\(\)/);
});

test("scene basemap hook cancels stale providers and renders only a live viewer", () => {
  assert.match(basemap, /let cancelled = false/);
  assert.match(basemap, /if \(cancelled \|\| viewer\.isDestroyed\(\)\) return/);
  assert.match(basemap, /addImageryProvider\(provider\)/);
  assert.match(basemap, /viewer\.scene\.requestRender\(\)/);
  assert.match(basemap, /cancelled = true/);
  assert.match(basemap, /Keep the last imagery or token-based globe visible/);
});
