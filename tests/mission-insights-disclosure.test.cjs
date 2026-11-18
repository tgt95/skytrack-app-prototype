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

test("Mission Insights omits boilerplate sample disclaimers and exports report data", () => {
  assert.doesNotMatch(
    page,
    /MissionInsightsSampleNotice|MISSION_INSIGHTS_SAMPLE_DISCLOSURE/,
  );
  assert.doesNotMatch(sections, /MISSION_INSIGHTS_SAMPLE_DISCLOSURE/);
  assert.doesNotMatch(toolbar, /sampleDisclosure/);
  assert.match(page, /noSampleMessage\(run\)/);
  assert.match(toolbar, /downloadReport\(run, sample\.key/);
  assert.match(toolbar, /selectedRun:\s*run/);
});

test("report region uses its stable automation test id", () => {
  assert.match(overlays, /isReport\s*\?\s*"ms-report"/);
});
