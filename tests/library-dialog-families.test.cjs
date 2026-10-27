const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const libraryDirectory = path.resolve(__dirname, "../src/features/library");

function readSource(name) {
  return fs.readFileSync(path.join(libraryDirectory, name), "utf8");
}

function jsxTagNames(sourcePath) {
  const source = ts.createSourceFile(
    sourcePath,
    fs.readFileSync(sourcePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const names = [];
  const visit = (node) => {
    if (ts.isJsxElement(node)) {
      names.push(node.openingElement.tagName.getText(source));
    } else if (ts.isJsxSelfClosingElement(node)) {
      names.push(node.tagName.getText(source));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

test("dialog host composes narrow families in the retained dialog order", () => {
  assert.deepEqual(
    jsxTagNames(path.join(libraryDirectory, "library-dialogs-host.tsx")),
    [
      "LibraryMissionSetupDialogs",
      "LibraryResourceEditorDialogs",
      "LibraryMissionActionDialogs",
      "LibraryResourceDeleteDialogs",
      "AccountMenuDialogs",
    ],
  );

  const route = readSource("library.tsx");
  assert.doesNotMatch(route, /\bdialogProps\b/);
  for (const contract of [
    "missionSetup",
    "resourceEditors",
    "missionActions",
    "resourceDeletes",
    "account",
  ]) {
    assert.match(route, new RegExp(`\\b${contract}=\\{\\{`));
  }
});

test("dialog families keep their own dialogs and do not import the host", () => {
  const mission = readSource("library-mission-dialogs.tsx");
  const resources = readSource("library-resource-dialogs-host.tsx");

  assert.match(mission, /MissionDialog/);
  assert.match(mission, /CreateMissionWizard/);
  assert.match(mission, /ProjectDialog/);
  assert.match(mission, /ShareDialog/);
  assert.match(mission, /CloneProjectPicker/);
  assert.match(mission, /Delete Mission\?/);
  assert.match(mission, /Delete Project\?/);
  assert.doesNotMatch(mission, /library-dialogs-host/);

  assert.match(resources, /DroneProfileDialog/);
  assert.match(resources, /WorldProfileDialog/);
  assert.match(resources, /ImportAIModelDialog/);
  assert.match(resources, /Delete drone profile\?/);
  assert.match(resources, /Delete World\?/);
  assert.match(resources, /Remove uploaded model\?/);
  assert.doesNotMatch(resources, /library-dialogs-host/);
});
