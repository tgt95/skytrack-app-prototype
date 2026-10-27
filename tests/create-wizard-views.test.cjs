const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const libraryDirectory = path.resolve(__dirname, "../src/features/library");
const read = (relativePath) =>
  fs.readFileSync(path.join(libraryDirectory, relativePath), "utf8");

test("create wizard keeps orchestration in the parent and delegates its views", () => {
  const parent = read("create-wizard.tsx");

  for (const step of ["GeneralStep", "WorldStep", "DroneStep"]) {
    assert.match(parent, new RegExp(`<${step}\\b`));
  }

  for (const contract of [
    "const [step, setStep]",
    "const [title, setTitle]",
    "const [projectId, setProjectId]",
    "const [worldType, setWorldType]",
    "const [worldId, setWorldId]",
    "const [droneId, setDroneId]",
    "const canNext =",
    "const canLeaveWorld =",
    "const pickWorldType =",
    "const selectWorld =",
    "const doCreate =",
  ]) {
    assert.ok(parent.includes(contract), `parent should keep ${contract}`);
  }

  assert.doesNotMatch(
    parent,
    /<FieldControl\b|<RadioGroup\b|<MissionThumbnail\b/,
  );
});

test("wizard step views preserve the labels, empty states, and test hooks", () => {
  const general = read("create-wizard/general-step.tsx");
  const world = read("create-wizard/world-step.tsx");
  const drone = read("create-wizard/drone-step.tsx");

  assert.match(general, /Mission name/);
  assert.match(general, /ms-wizard-project-label/);
  assert.match(general, /event\.key === "Enter"/);

  for (const hook of [
    "ms-wizard-mode-tabs",
    "ms-wizard-toggle",
    "ms-wizard-dropzone",
    "ms-wizard-filebtn",
    "Add or register a World",
  ]) {
    assert.ok(world.includes(hook), `World step should preserve ${hook}`);
  }

  for (const hook of [
    "ms-wizard-drone-label",
    "Firmware not specified",
    "Add a Drone profile",
  ]) {
    assert.ok(drone.includes(hook), `Drone step should preserve ${hook}`);
  }
});

test("terrain upload delegates file selection and drop to the shared Dropzone", () => {
  const world = read("create-wizard/world-step.tsx");

  assert.ok(world.includes("import { Dropzone } from 'skytrack-ui/dropzone'"));
  assert.ok(world.includes("data-testid='ms-wizard-dropzone'"));
  assert.ok(world.includes("data-testid='ms-wizard-filebtn'"));
  assert.ok(world.includes("buttonLabel='Choose File'"));
  assert.ok(world.includes("multiple={false}"));
  assert.match(
    world,
    /onFilesSelected=\{files =>[\s\S]*?onTerrainFileSelect\(file\.name\)/,
  );
  assert.doesNotMatch(world, /terrainInputRef|type='file'/);
});
