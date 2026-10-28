const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

test("Studio shell keeps scene composition and delegates inspector and footer boundaries", () => {
  const shell = source("src/ui/layout/page-layout.tsx");

  assert.match(shell, /<StudioShellSceneViewport\s/);
  assert.match(shell, /<StudioInspectorContainer\s/);
  assert.match(shell, /<StudioStatusFooter\s/);
  assert.doesNotMatch(shell, /<StudioInspector\s/);
});

test("inspector adapter accepts focused hook slices and retains draft commit rules", () => {
  const inspector = source("src/features/studio/studio-inspector-container.tsx");

  assert.match(inspector, /type InspectorUiState = Pick</);
  assert.match(inspector, /type InspectorDrawingState = Pick</);
  assert.match(inspector, /type InspectorCommands = Pick</);
  assert.doesNotMatch(inspector, /StudioShellProps/);
  assert.match(
    inspector,
    /Math\.round\(Math\.max\(drawing\.drawingAltM, mission\.takeoffAltM\) \* 10\) \/ 10/,
  );
  assert.match(
    inspector,
    /drawing\.pending\.length >= 3 && isValidRing\(drawing\.pending\)/,
  );
  assert.match(inspector, /\) >= 0\.5/);
  assert.match(inspector, /visible=\{ui\.appTab === "plan" && ui\.rightOpen\}/);
});

test("status footer preserves its live status and accessible actions", () => {
  const footer = source("src/ui/layout/footer.tsx");

  assert.match(footer, /data-testid="ms-status"/);
  assert.match(footer, /data-testid="ms-status-line"/);
  assert.match(footer, /data-testid="ms-status-actions"/);
  assert.match(footer, /aria-label="Keyboard shortcuts"/);
  assert.match(footer, /aria-label="Toggle inspector panel"/);
  assert.match(footer, /wind \$\{ui\.settings\.windMS\} m\/s · GPS RTK/);
  assert.match(footer, /dirty \? " · unsaved" : " · saved"/);
});
