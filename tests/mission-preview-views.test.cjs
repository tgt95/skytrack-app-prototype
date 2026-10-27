const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const React = require("react");
const ts = require("typescript");
const { renderToStaticMarkup } = require("react-dom/server");

const read = (path) => fs.readFileSync(path, "utf8");
const preview = read("src/features/simulation/mission-preview.tsx");
const map = read("src/features/simulation/mission-preview-map.tsx");
const controls = read("src/features/simulation/mission-preview-controls.tsx");

const originalLoad = Module._load;
const originalTsxLoader = require.extensions[".tsx"];
require.extensions[".tsx"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};
const primitive =
  (tag) =>
  ({ children, ...props }) => {
    const safeProps = Object.fromEntries(
      Object.entries(props).filter(
        ([key]) =>
          key === "aria-label" ||
          key === "aria-pressed" ||
          key === "aria-checked" ||
          key === "className" ||
          key === "data-testid" ||
          key === "disabled" ||
          key === "max" ||
          key === "min" ||
          key === "role" ||
          key === "step" ||
          key === "type" ||
          key === "value",
      ),
    );
    return React.createElement(tag, safeProps, children);
  };
Module._load = function (request, parentModule, isMain) {
  if (request === "skytrack-ui/button") return { Button: primitive("button") };
  if (request === "skytrack-ui/badge") return { Badge: primitive("span") };
  if (request === "skytrack-ui/slider") {
    return {
      Slider: primitive("div"),
      SliderControl: primitive("div"),
      SliderIndicator: primitive("span"),
      SliderThumb: primitive("input"),
      SliderTrack: primitive("div"),
    };
  }
  if (request === "skytrack-ui/switch") {
    return { Switch: primitive("button"), SwitchThumb: primitive("span") };
  }
  if (request === "skytrack-ui/select") {
    return {
      Select: primitive("div"),
      SelectIcon: primitive("span"),
      SelectItem: primitive("div"),
      SelectItemIndicator: primitive("span"),
      SelectItemText: primitive("span"),
      SelectList: primitive("div"),
      SelectPopup: primitive("div"),
      SelectPortal: primitive("div"),
      SelectPositioner: primitive("div"),
      SelectTrigger: primitive("button"),
      SelectValue: primitive("span"),
    };
  }
  return originalLoad.call(this, request, parentModule, isMain);
};
const MissionPreview =
  require("../src/features/simulation/mission-preview.tsx").default;
Module._load = originalLoad;
if (originalTsxLoader) require.extensions[".tsx"] = originalTsxLoader;
else delete require.extensions[".tsx"];

const previewMission = {
  id: "preview-fixture",
  name: "Preview fixture",
  world: "Blank space",
  worldType: "3D",
  vehicle: "Drone x500 Livox Mid 360",
  spawn: { x: 0, y: 0 },
  takeoffAltM: 10,
  targetSpeedMS: 2,
  returnHomeOnEnd: true,
  cameraSafetyCheck: true,
  routes: [{ id: "route-1", label: "Route 1", targetSpeedMS: 2 }],
  sequenceOrder: [{ type: "route", id: "route-1" }],
  waypoints: [
    {
      id: "preview-wp-1",
      seq: 1,
      x: 2,
      y: 0,
      z: 10,
      routeId: "route-1",
      actions: [{ id: "preview-photo", kind: "photo", label: "Photo" }],
    },
    {
      id: "preview-wp-2",
      seq: 2,
      x: 6,
      y: 0,
      z: 10,
      routeId: "route-1",
      actions: [],
    },
  ],
  areas: [],
  avoids: [],
};

test("MissionPreview retains playback, selection, and preview ref ownership", () => {
  assert.match(preview, /useState\(false\)/);
  assert.match(preview, /window\.setInterval/);
  assert.match(preview, /previewPositionRef\.current = null/);
  assert.match(preview, /previewCaptureRef\.current = null/);
  assert.match(preview, /onSelectWaypoint\(waypoint\.id\)/);
  assert.match(preview, /<MissionPreviewMap/);
  assert.match(preview, /<MissionPreviewControls/);
});

test("preview controls stay controlled and keep the 0–1000 scrub range", () => {
  assert.doesNotMatch(controls, /useState|useEffect/);
  assert.match(controls, /min=\{0\}/);
  assert.match(controls, /max=\{1000\}/);
  assert.match(controls, /value=\{scrub\}/);
  assert.match(controls, /onValueChange=\{onScrubChange\}/);
  assert.match(controls, /onClick=\{onPlayToggle\}/);
});

test("preview map owns projection and view leaves do not import their parent", () => {
  assert.match(map, /const boundsPoints =/);
  assert.match(map, /const project =/);
  assert.match(map, /data-testid="ms-preview-home-marker"/);
  assert.doesNotMatch(map, /from ["']\.\/mission-preview["']/);
  assert.doesNotMatch(controls, /from ["']\.\/mission-preview["']/);
});

test("MissionPreview renders the route map, photo marker, scrub range, and waypoint table", () => {
  const markup = renderToStaticMarkup(
    React.createElement(MissionPreview, {
      mission: previewMission,
      onSelectWaypoint: () => {},
      previewPositionRef: { current: null },
      previewCaptureRef: { current: null },
    }),
  );

  assert.match(markup, /aria-label="Mini map of areas and flight path"/);
  assert.match(markup, /data-testid="ms-preview-photo-ring"/);
  assert.match(markup, /data-testid="ms-preview-home-marker"/);
  assert.match(markup, /data-testid="ms-preview-waypoint-1"/);
  assert.match(markup, /min="0"/);
  assert.match(markup, /max="1000"/);
  assert.match(markup, /data-testid="ms-preview-play"/);
});
