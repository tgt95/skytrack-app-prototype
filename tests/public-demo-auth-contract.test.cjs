const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(projectRoot, file), "utf8");

test("public demo entry has no client-side password gate or Pages secret", () => {
  const app = read("src/App.tsx");
  const workflow = read(".github/workflows/deploy.yml");
  const readme = read("README.md");
  const envExample = read(".env.example");

  assert.doesNotMatch(app, /VITE_LOGIN_PASSWORD|type=["']password["']/);
  assert.match(app, /Open public demo/);
  assert.match(app, /handleOpenDemo/);
  assert.doesNotMatch(workflow, /VITE_LOGIN_PASSWORD/);
  assert.doesNotMatch(readme, /VITE_LOGIN_PASSWORD/);
  assert.doesNotMatch(envExample, /VITE_LOGIN_PASSWORD/);
});

test("public demo exit clears the local demo-entry state", () => {
  const app = read("src/App.tsx");

  assert.match(app, /handleExitDemo/);
  assert.match(
    app,
    /window\.localStorage\.removeItem\(STORAGE_KEYS\.authentication\)/,
  );
  assert.match(app, /setDemoEntered\(false\)/);
});
