const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");
const parent = read("src/features/studio/studio-dialogs.tsx");
const world = read("src/features/studio/mission-world-picker-dialog.tsx");
const edit = read("src/features/studio/edit-mission-dialog.tsx");
const shortcuts = read("src/features/studio/shortcuts-dialog.tsx");
const focusReturn = read("src/features/studio/use-dialog-focus-return.ts");

test("studio dialog parent retains edit draft and reset effect", () => {
  assert.match(parent, /useEffect\(\(\) => \{/);
  assert.match(parent, /if \(!editOpen\) return/);
  assert.match(parent, /\[droneProfiles, editOpen, mission, worldOptions\]/);
  assert.match(parent, /<MissionWorldPickerDialog/);
  assert.match(parent, /<EditMissionDialog/);
  assert.match(parent, /<ShortcutsDialog/);
  assert.doesNotMatch(parent, /<Dialog /);
});

test("world picker and mission editor remain controlled leaf views", () => {
  assert.match(parent, /restoreDialogFocus/);
  assert.match(focusReturn, /activeElement instanceof HTMLElement/);
  assert.match(focusReturn, /openWithFocusReturn/);
  assert.match(world, /data-testid="ms-world-picker"/);
  assert.match(world, /data-testid="ms-world-type-tabs"/);
  assert.match(world, /onSelectWorldType/);
  assert.match(world, /finalFocus=\{restoreDialogFocus\}/);
  assert.match(edit, /aria-label="Edit mission"/);
  assert.match(edit, /initialFocus=\{missionNameRef\}/);
  assert.match(edit, /finalFocus=\{restoreDialogFocus\}/);
  assert.match(edit, /onNameChange\(String\(value\)\)/);
  assert.match(edit, /onValueChange=\{onWorldChange\}/);
  assert.match(edit, /onValueChange=\{onDroneChange\}/);
  assert.match(edit, /onClick=\{onSave\}/);
  assert.match(shortcuts, /finalFocus=\{restoreDialogFocus\}/);
  for (const source of [world, edit])
    assert.doesNotMatch(source, /from ["']\.\/studio-dialogs["']/);
});

test("shortcuts dialog preserves accessible groups and descriptions", () => {
  assert.match(shortcuts, /aria-label="Keyboard shortcuts"/);
  assert.match(shortcuts, /data-testid="ms-shortcut-groups"/);
  assert.match(shortcuts, /data-testid="ms-shortcut-group"/);
  assert.match(shortcuts, /data-testid="ms-shortcut-row"/);
  assert.match(shortcuts, /Shortcuts are ignored while typing/);
});
