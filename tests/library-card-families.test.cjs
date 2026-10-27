const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolveFilename.call(this, request.replace(/\?raw$/, ""), ...args);
};

const loadModule = Module._load;
Module._load = function (request, ...args) {
  if (request === "@phosphor-icons/react") {
    const Icon = (props) => React.createElement("svg", props);
    return new Proxy(
      { __esModule: true },
      {
        get: (target, key) => (key === "__esModule" ? true : Icon),
      },
    );
  }
  return loadModule.call(this, request, ...args);
};

require.extensions[".tsx"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
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

for (const extension of [".svg", ".jpg", ".png", ".webp"]) {
  require.extensions[extension] = (module) => {
    module.exports = extension === ".svg" ? "<svg />" : "test-thumbnail";
  };
}

const missionCards = require("../src/features/library/mission-cards.tsx");
const libraryCards = require("../src/features/library/library-cards.tsx");
const libraryAvatar = require("../src/features/library/library-avatar.tsx");
const { emptyMission, snapshotOf } = require("../src/domain/mission-model.ts");

function missionCard(missionData, worldType = "2D") {
  return {
    id: "card-mission",
    name: "Card mission",
    editedAgo: "Edited 2 hours ago",
    starred: true,
    shared: false,
    viewOnly: false,
    worldType,
    world: "Blank space",
    missionData,
  };
}

test("library card families retain compatibility exports without a cycle", () => {
  assert.equal(libraryCards.MissionCard, missionCards.MissionCard);
  assert.equal(libraryCards.RecentMissionCard, missionCards.RecentMissionCard);
  assert.equal(libraryCards.SharedMissionCard, missionCards.SharedMissionCard);
  assert.equal(libraryCards.LibraryAvatar, libraryAvatar.LibraryAvatar);
});

test("LibraryAvatar keeps the existing initial rendering", () => {
  const markup = renderToStaticMarkup(
    React.createElement(libraryAvatar.LibraryAvatar, {
      name: "  Maya Nguyen ",
      testId: "avatar",
    }),
  );
  assert.match(markup, />M</);
  assert.match(markup, /data-testid="avatar"/);

  const initials = renderToStaticMarkup(
    React.createElement(libraryAvatar.LibraryAvatar, {
      name: "Maya Nguyen",
      initials: "MN",
    }),
  );
  assert.match(initials, />MN</);
});

test("mission cards keep Star, More, and context-menu action wiring", () => {
  const mission = emptyMission();
  mission.worldType = "2D";
  const actions = [
    { id: "open", label: "Open", group: "primary", onSelect: () => {} },
    {
      id: "delete",
      label: "Delete",
      group: "destructive",
      destructive: true,
      onSelect: () => {},
    },
  ];

  const markup = renderToStaticMarkup(
    React.createElement(missionCards.MissionCard, {
      projectName: "Project",
      mission: {
        ...missionCard(snapshotOf(mission)),
        starred: true,
      },
      username: "Tuan",
      testId: "ms-lib-mission-card-actions",
      actions,
      onToggleStar: () => {},
      onOpen: () => {},
    }),
  );

  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /text-\(--favorite\)/);
  assert.match(markup, /data-testid="ms-lib-mission-card-actions-star"/);
  assert.match(markup, /data-testid="ms-lib-mission-card-actions-more"/);
  assert.match(markup, /aria-label="More actions for Card mission"/);
  assert.match(markup, /data-slot="context-menu-trigger"/);
});

test("mission summaries use Area metrics when Area geometry exists", () => {
  const mission = emptyMission();
  mission.worldType = "2D";
  mission.areas = [
    {
      id: "area-1",
      label: "Area 1",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    },
  ];
  mission.waypoints = [
    {
      id: "w1",
      x: 0,
      y: 0,
      z: 30,
      seq: 1,
      actions: [{ id: "a1", kind: "photo", label: "Photo capture" }],
    },
    { id: "w2", x: 100, y: 0, z: 30, seq: 2, actions: [] },
    { id: "w3", x: 100, y: 100, z: 30, seq: 3, actions: [] },
  ];

  const markup = renderToStaticMarkup(
    React.createElement(missionCards.MissionCard, {
      projectName: "Project",
      mission: missionCard(snapshotOf(mission)),
      username: "Tuan",
      testId: "ms-lib-mission-card-mission",
      actions: [],
      onOpen: () => {},
    }),
  );

  assert.match(markup, /data-testid="ms-lib-card-summary"/);
  assert.match(markup, /aria-label="10000 square meters"/);
  assert.match(markup, />1 ha</);
  assert.match(markup, /aria-label="3 waypoints"/);
  assert.match(markup, /aria-label="1 drone actions"/);
  assert.match(markup, /aria-label="1 total photos captured"/);
});

test("mission summaries use rounded route length when no Area exists", () => {
  const mission = emptyMission();
  mission.worldType = "3D";
  mission.spawn = { x: 0, y: 0 };
  mission.takeoffAltM = 0;
  mission.returnHomeOnEnd = false;
  mission.waypoints = [
    { id: "w1", x: 0, y: 0, z: 0, seq: 1, actions: [] },
    { id: "w2", x: 100.4, y: 0, z: 0, seq: 2, actions: [] },
  ];

  const markup = renderToStaticMarkup(
    React.createElement(missionCards.MissionCard, {
      projectName: "Project",
      mission: missionCard(snapshotOf(mission), "3D"),
      username: "Tuan",
      testId: "ms-lib-mission-card-mission",
      actions: [],
      onOpen: () => {},
    }),
  );

  assert.match(markup, /aria-label="100 meters"/);
  assert.match(markup, />100 m</);
  assert.doesNotMatch(markup, /square meters/);
});

test("Recent and Shared mission variants retain titles, read-only state, and fallback", () => {
  const mission = missionCard("not a mission snapshot");
  delete mission.missionData;

  const recent = renderToStaticMarkup(
    React.createElement(missionCards.RecentMissionCard, {
      projectName: "Coastal mapping",
      mission,
      username: "Maya Nguyen",
      testId: "ms-lib-recent-card-mission",
      actions: [],
      onOpen: () => {},
    }),
  );
  assert.match(recent, /Coastal mapping \| Card mission/);
  assert.doesNotMatch(recent, /data-testid="ms-lib-card-summary"/);
  assert.match(recent, /data-testid="ms-lib-card-owner"/);
  assert.match(recent, /2h ago/);

  const shared = renderToStaticMarkup(
    React.createElement(missionCards.SharedMissionCard, {
      mission: {
        id: "shared-mission",
        name: "Harbor orthomosaic",
        worldType: "2D",
        world: "Blank space",
        editedAgo: "Edited yesterday",
      },
      ownerName: "Maya Nguyen",
    }),
  );
  assert.match(shared, /class="ms-lib-card is-readonly"/);
  assert.match(shared, /Harbor orthomosaic/);
  assert.match(shared, />View only</);
  assert.doesNotMatch(shared, /data-testid="ms-lib-card-summary"/);
});
