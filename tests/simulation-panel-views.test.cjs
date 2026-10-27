const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const panel = read("src/features/simulation/simulation-panel.tsx");
const details = read("src/features/simulation/simulation-details.tsx");
const settings = read("src/features/simulation/simulation-settings-form.tsx");

test("simulation panel keeps tab selection, countdown, and run controls", () => {
  assert.match(panel, /const activeTab = showConsole \? tab/);
  assert.match(panel, /window\.setTimeout/);
  assert.match(panel, /window\.clearTimeout/);
  assert.match(panel, /AUTO_RESTART_DELAY_S = 5/);
  assert.match(panel, /onClick=\{ended \? onRestart : onRun\}/);
  assert.match(panel, /onClick=\{onPause\}/);
  assert.match(panel, /onClick=\{onResume\}/);
  assert.match(panel, /onClick=\{onAbort\}/);
});

test("simulation detail view owns telemetry and route rendering without state", () => {
  assert.match(panel, /<SimulationDetails/);
  assert.match(details, /data-testid="ms-telemetry"/);
  assert.match(details, /data-testid="ms-route-progress"/);
  assert.match(details, /data-testid="ms-route-list"/);
  assert.doesNotMatch(details, /useEffect|useState/);
  assert.doesNotMatch(details, /from ["']\.\/simulation-panel["']/);
});

test("settings form keeps limits and the compatibility export", () => {
  assert.match(
    panel,
    /export \{ SimulationSettingsForm \} from "\.\/simulation-settings-form"/,
  );
  assert.match(panel, /export type \{ SimulationSettingsFormProps \}/);
  assert.match(settings, /Math\.min\(20, Math\.max\(1, Math\.round\(v\)\)\)/);
  assert.match(
    settings,
    /Math\.min\(maxSeq, Math\.max\(0, Math\.round\(v\)\)\)/,
  );
  assert.match(settings, /from ["']\.\/simulation-types["']/);
  assert.doesNotMatch(settings, /from ["']\.\/simulation-panel["']/);
});
