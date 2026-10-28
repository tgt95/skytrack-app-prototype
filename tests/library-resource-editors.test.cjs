const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createLibraryResourceEditorActions,
} = require("../src/features/library/workspace/use-library-resource-editors.ts");

function setup(overrides = {}) {
  const calls = {
    persistDrone: [],
    removeDrone: [],
    persistWorld: [],
    removeWorld: [],
    persistModel: [],
    removeModel: [],
    closeDrone: 0,
    closeWorld: 0,
    clearDroneDelete: 0,
    clearWorldDelete: 0,
    clearModelDelete: 0,
    imported: 0,
  };
  const actions = createLibraryResourceEditorActions({
    droneEditor: {
      mode: "edit",
      profile: { id: "drone-1", name: "Old drone" },
    },
    worldEditor: {
      mode: "create",
      profile: { id: "world-1", name: "New world" },
    },
    deleteDroneId: "drone-1",
    deleteWorldId: "world-1",
    deleteModelId: "model-1",
    deleteDroneReferences: [],
    deleteWorldReferences: [],
    modelToDelete: { id: "model-1", name: "Imported model" },
    persistDroneProfile(profile, mode, originalName) {
      calls.persistDrone.push({ profile, mode, originalName });
      return true;
    },
    removeDroneProfile(id) {
      calls.removeDrone.push(id);
      return true;
    },
    persistWorldProfile(profile, mode) {
      calls.persistWorld.push({ profile, mode });
      return true;
    },
    removeWorldProfile(id) {
      calls.removeWorld.push(id);
      return true;
    },
    persistAIModel(model) {
      calls.persistModel.push(model);
      return true;
    },
    removeAIModel(id) {
      calls.removeModel.push(id);
      return true;
    },
    closeDroneEditor() {
      calls.closeDrone += 1;
    },
    closeWorldEditor() {
      calls.closeWorld += 1;
    },
    clearDeleteDroneId() {
      calls.clearDroneDelete += 1;
    },
    clearDeleteWorldId() {
      calls.clearWorldDelete += 1;
    },
    clearDeleteModelId() {
      calls.clearModelDelete += 1;
    },
    onAIModelImported() {
      calls.imported += 1;
    },
    ...overrides,
  });
  return { actions, calls };
}

test("resource save closes its editor only after persistence succeeds", () => {
  const { actions, calls } = setup();
  const drone = { id: "drone-1", name: "Renamed drone" };
  const world = { id: "world-1", name: "Renamed world" };

  actions.saveDroneProfile(drone);
  actions.saveWorldProfile(world);

  assert.deepEqual(calls.persistDrone, [
    { profile: drone, mode: "edit", originalName: "Old drone" },
  ]);
  assert.deepEqual(calls.persistWorld, [{ profile: world, mode: "create" }]);
  assert.equal(calls.closeDrone, 1);
  assert.equal(calls.closeWorld, 1);
});

test("failed resource saves keep the editor open with the attempted draft", () => {
  const { actions, calls } = setup({
    persistDroneProfile() {
      return false;
    },
    persistWorldProfile() {
      return false;
    },
  });

  actions.saveDroneProfile({ id: "drone-1", name: "Unsaved drone" });
  actions.saveWorldProfile({ id: "world-1", name: "Unsaved world" });

  assert.equal(calls.closeDrone, 0);
  assert.equal(calls.closeWorld, 0);
});

test("blocked Drone and World deletes make no persistence or close calls", () => {
  const reference = { project: "Project A", mission: "Mission A" };
  const { actions, calls } = setup({
    deleteDroneReferences: [reference],
    deleteWorldReferences: [reference],
  });

  actions.deleteDrone();
  actions.deleteWorld();

  assert.deepEqual(calls.removeDrone, []);
  assert.deepEqual(calls.removeWorld, []);
  assert.equal(calls.clearDroneDelete, 0);
  assert.equal(calls.clearWorldDelete, 0);
});

test("successful Drone, World, and AI model deletes clear their pending IDs", () => {
  const { actions, calls } = setup();

  actions.deleteDrone();
  actions.deleteWorld();
  actions.deleteAIModel();

  assert.deepEqual(calls.removeDrone, ["drone-1"]);
  assert.deepEqual(calls.removeWorld, ["world-1"]);
  assert.deepEqual(calls.removeModel, ["model-1"]);
  assert.equal(calls.clearDroneDelete, 1);
  assert.equal(calls.clearWorldDelete, 1);
  assert.equal(calls.clearModelDelete, 1);
});

test("failed AI model delete keeps the pending ID", () => {
  const { actions, calls } = setup({
    removeAIModel() {
      return false;
    },
  });

  actions.deleteAIModel();

  assert.equal(calls.clearModelDelete, 0);
});

test("AI model delete without a pending uploaded model makes no write", () => {
  const { actions, calls } = setup({
    deleteModelId: null,
    modelToDelete: null,
  });

  actions.deleteAIModel();

  assert.deepEqual(calls.removeModel, []);
  assert.equal(calls.clearModelDelete, 0);
});

test("AI model import selects the imported category only after persistence succeeds", () => {
  const model = { name: "Model", fileName: "model.zip", fileSize: 2048 };
  const successful = setup();
  assert.equal(successful.actions.importAIModel(model), true);
  assert.deepEqual(successful.calls.persistModel, [model]);
  assert.equal(successful.calls.imported, 1);

  const failed = setup({
    persistAIModel() {
      return false;
    },
  });
  assert.equal(failed.actions.importAIModel(model), false);
  assert.equal(failed.calls.imported, 0);
});
