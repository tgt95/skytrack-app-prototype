const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const page = read(
  "src/features/studio/mission-insights/mission-insights-page.tsx",
);
const sections = read(
  "src/features/studio/mission-insights/mission-insights-page-sections.tsx",
);
const toolbar = read(
  "src/features/studio/mission-insights/mission-insights-page-toolbar.tsx",
);
const overlays = read("src/features/studio/studio-map-overlays.tsx");

test("Mission Insights sample data is disclosed on page and in exports", () => {
  assert.match(page, /<MissionInsightsSampleNotice\s*\/>/);
  assert.match(
    sections,
    /<AlertDescription>\{MISSION_INSIGHTS_SAMPLE_DISCLOSURE\}<\/AlertDescription>/,
  );
  assert.match(
    toolbar,
    /sampleDisclosure:\s*MISSION_INSIGHTS_SAMPLE_DISCLOSURE/,
  );
});

test("report region uses its stable automation test id", () => {
  assert.match(overlays, /isReport\s*\?\s*"ms-report"/);
});
