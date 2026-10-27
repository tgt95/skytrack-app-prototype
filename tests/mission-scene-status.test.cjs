const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const React = require("react");
const ts = require("typescript");
const { renderToStaticMarkup } = require("react-dom/server");

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
Module._load = function (request, parentModule, isMain) {
  if (request === "skytrack-ui/button") {
    return {
      Button: ({ children, ...props }) =>
        React.createElement(
          "button",
          Object.fromEntries(
            Object.entries(props).filter(([key]) => key === "data-testid"),
          ),
          children,
        ),
    };
  }
  return originalLoad.call(this, request, parentModule, isMain);
};
const {
  MissionSceneStatus,
} = require("../src/features/scene/mission-scene-status.tsx");
Module._load = originalLoad;
if (originalTsxLoader) require.extensions[".tsx"] = originalTsxLoader;
else delete require.extensions[".tsx"];

const render = (props) =>
  renderToStaticMarkup(
    React.createElement(MissionSceneStatus, {
      status: "ready",
      without3d: false,
      errorMessage: null,
      onRetry() {},
      onContinueWithout3D() {},
      ...props,
    }),
  );

test("scene status keeps the loading announcement", () => {
  const markup = render({ status: "loading" });
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-label="3D scene loading"/);
  assert.match(markup, /Loading mission scene\./);
});

test("scene error retains its message and recovery actions", () => {
  const markup = render({ status: "error", errorMessage: "Renderer offline" });
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Renderer offline/);
  assert.match(markup, /data-testid="ms-scene-retry"/);
  assert.match(markup, /Continue without 3D/);
});

test("no-3D fallback keeps a retry action and ready scene has no status overlay", () => {
  const fallback = render({ status: "error", without3d: true });
  assert.match(fallback, /data-testid="ms-scene-fallback"/);
  assert.match(fallback, /3D off — edit from the waypoint list\./);
  assert.match(fallback, /Retry 3D/);
  assert.equal(render({ status: "ready", without3d: false }), "");
});
