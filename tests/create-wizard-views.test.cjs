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

test("terrain file chooser opens only from its explicit button", () => {
  const world = read("create-wizard/world-step.tsx");

  assert.match(
    world,
    /const terrainInputRef = useRef<HTMLInputElement>\(null\)/,
  );
  assert.match(
    world,
    /<Button[\s\S]*?type="button"[\s\S]*?onClick=\{\(\) => terrainInputRef\.current\?\.click\(\)\}[\s\S]*?data-testid="ms-wizard-filebtn"[\s\S]*?Choose File[\s\S]*?<\/Button>/,
  );
  assert.match(
    world,
    /<input[\s\S]*?ref=\{terrainInputRef\}[\s\S]*?type="file"[\s\S]*?tabIndex=\{-1\}[\s\S]*?aria-hidden="true"/,
  );
  const fileInputIndex = world.indexOf('type="file"');
  assert.ok(fileInputIndex > 0, "World step should keep the terrain input");
  assert.ok(
    world.lastIndexOf("</label>", fileInputIndex) >
      world.lastIndexOf("<label", fileInputIndex),
    "terrain input should not be label-activated",
  );
});
