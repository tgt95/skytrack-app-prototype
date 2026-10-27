const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === "@phosphor-icons/react") {
    const Icon = (props) => React.createElement("svg", props);
    return new Proxy(
      { __esModule: true },
      { get: (target, key) => (key === "__esModule" ? true : Icon) },
    );
  }
  if (request.startsWith("skytrack-ui/")) {
    const Primitive = ({ children }) =>
      React.createElement(React.Fragment, null, children);
    if (request === "skytrack-ui/button") {
      return {
        Button: ({ children, ...props }) =>
          React.createElement(
            "button",
            Object.fromEntries(
              Object.entries(props).filter(([key]) =>
                ["type", "aria-label", "data-testid"].includes(key),
              ),
            ),
            children,
          ),
      };
    }
    if (request === "skytrack-ui/badge") return { Badge: Primitive };
    return new Proxy(
      { __esModule: true },
      { get: (target, key) => (key === "__esModule" ? true : Primitive) },
    );
  }
  return originalLoad.call(this, request, ...args);
};

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

const { DronesPage } = require("../src/features/library/pages/drones-page.tsx");
const { WorldsPage } = require("../src/features/library/pages/worlds-page.tsx");
Module._load = originalLoad;

test("empty Drones view keeps its page heading and create action without cards", () => {
  const markup = renderToStaticMarkup(
    React.createElement(DronesPage, {
      workspaceName: "Empty test workspace",
      drones: [],
      onCreate: () => {},
      onEdit: () => {},
      onDelete: () => {},
    }),
  );

  assert.match(markup, /Drones/);
  assert.match(markup, /Add Drone/);
  assert.doesNotMatch(markup, /data-testid="ms-lib-drone-profile-card"/);
});

test("empty Worlds view keeps its empty copy and create action without cards", () => {
  const markup = renderToStaticMarkup(
    React.createElement(WorldsPage, {
      workspaceName: "Empty test workspace",
      worlds: [],
      onCreate: () => {},
      onEdit: () => {},
      onDelete: () => {},
    }),
  );

  assert.match(markup, /No Worlds yet/);
  assert.match(markup, /Add a 3D reconstruction to this Workspace/);
  assert.match(markup, /Add World/);
  assert.doesNotMatch(markup, /data-testid="ms-lib-world-/);
});
