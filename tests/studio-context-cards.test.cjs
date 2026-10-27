const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const cards = read("src/features/studio/mission-context-cards.tsx");
const controls = read("src/features/studio/studio-map-controls.tsx");
const viewport = read("src/features/studio/studio-scene-viewport.tsx");

test("mission context cards have a leaf owner and explicit viewport inputs", () => {
  assert.match(viewport, /from "\.\/mission-context-cards"/);
  assert.match(
    viewport,
    /<MissionContextCards[\s\S]*?onOpenWorldPicker=\{onOpenWorldPicker\}/,
  );
  assert.match(
    controls,
    /export \{ MissionContextCards \} from "\.\/mission-context-cards"/,
  );
  assert.match(
    controls,
    /export type \{ DroneChoice \} from "\.\/mission-context-cards"/,
  );
  assert.doesNotMatch(cards, /from ["']\.\/studio-map-controls["']/);
});

test("drone and world cards preserve selection callbacks and accessible contracts", () => {
  assert.ok(cards.includes('selected.label.replace(/ \\(legacy\\)$/, "")'));
  assert.match(cards, /data-testid="ms-drone-select"/);
  assert.match(cards, /data-testid="ms-world-select"/);
  assert.match(cards, /onClick=\{onOpenWorldPicker\}/);
  assert.match(cards, /aria-label=\{`Vehicle: \$\{mission\.vehicle\}`\}/);
});
