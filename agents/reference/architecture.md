# Mission Studio architecture

Short source map for agents working on the Mission Studio prototype. Code is source of truth; update this note when structure or behavior changes.

This repository is the standalone Mission Studio app. Its entry, shell, route, domain, modules, and shared code live directly under `src/`. It does not use Prototype Hub routing or shared state.

## Architecture

- [`index.tsx`](../../src/index.tsx) is the standalone route shell and coordinator. It owns browser-history navigation, mission state, tool/draft/selection state, undo/redo, validation, Design/Simulation stage, and connects panels to the scene. It also sets the browser title from the active route and record. [`modules/library/router.ts`](../../src/modules/library/router.ts) maps Home, Recent, workspace resources, template, shared-project, shared-account, and mission URLs. `/mission/:missionId` is the canonical mission URL; `/detail/:missionId` and `/mission-studio/:missionId` are legacy aliases.
- `index.html` provides the initial page title and links the SkyTrack mark at `public/favicon.svg`; the route shell replaces the title with the active page or record name.
- [`domain/mission-model.ts`](../../src/domain/mission-model.ts) holds mission types, defaults, validation, coordinate helpers, Area scan geometry, Avoid detours, and JSON conversion. Keep geometry and rules pure here.
- [`domain/mission-data.ts`](../../src/domain/mission-data.ts) provides the local seed mission and fixture geometry.
- [`modules/scene/mission-scene.tsx`](../../src/modules/scene/mission-scene.tsx) owns the Cesium viewer, entities, gestures, surface picking, and mission overlays. [`mission-scene-helpers.ts`](../../src/modules/scene/mission-scene-helpers.ts) contains coordinate conversion, entity-ID parsing, marker images, and search-pin helpers without owning Viewer lifecycle. [`mission-map-2d.tsx`](../../src/modules/scene/mission-map-2d.tsx) defines basemap choices and the Leaflet map component; the main Studio scene remains Cesium.
- [`modules/design/`](../../src/modules/design) contains the inspector and Recon settings UI. [`python-editor.tsx`](../../src/modules/design/python-editor.tsx) contains the non-executing Python draft editor. [`modules/simulation/`](../../src/modules/simulation) builds and plays a deterministic mock flight plan.
- [`modules/library/`](../../src/modules/library) contains Home, Recent, workspace resources, Shared with me, mission creation, browser routes, and local library persistence. [`database/store.ts`](../../src/modules/library/database/store.ts) stores workspace-qualified project and mission JSON in `localStorage`; older projects without `workspaceId` load into the default Workspace. [`database/drone-store.ts`](../../src/modules/library/database/drone-store.ts) owns the separate versioned local Drone profile store; profiles include optional use-case, frame fit, payload/performance values, profile/component source metadata, and extensible component specifications. Version-1 Drone profiles migrate to version 2; compatibility is not evaluated. Mission records retain a Drone profile ID plus the legacy display label. [`database/workspace-resources-store.ts`](../../src/modules/library/database/workspace-resources-store.ts) owns versioned, Workspace-scoped World and AI model metadata plus labeled Sample fixtures. `Blank space` remains a system 2D World. Registered Worlds store a source mission or user-entered flight reference and an opaque reconstruction reference; no reconstruction files are uploaded or processed. Mission snapshots add optional stable `worldId` while preserving the legacy World label. [`workspace-data.ts`](../../src/modules/library/workspace-data.ts) owns Workspace and read-only shared-project fixtures. The active Workspace selection is stored locally. Library owns Project, Drone, World, and AI model metadata mutations, while the route shell loads and saves Studio snapshots by stable mission ID. Mission cards display `worldType` and World. Dialog leaf components are in [`library-dialogs.tsx`](../../src/modules/library/library-dialogs.tsx) and [`workspace-resource-dialogs.tsx`](../../src/modules/library/workspace-resource-dialogs.tsx). [`modules/search/`](../../src/modules/search) contains address lookup.
- [`index.css`](../../src/index.css) owns route styles. The Library sidebar follows the supplied reference for layout and content placement only; colors, surfaces, focus states, and corner radii use `skytrack-ui` semantic tokens. Use components from `skytrack-ui` for controls.

## Mission and state logic

- `StudioMission` is the design source of truth. Geometry uses local ENU meters (`x` east, `y` north, `z` up) anchored to per-mission `origin`; old missions fall back to Redlands.
- Committed edits go through `commit`: snapshot current mission for undo, clear redo, update mission, clear selection. Inspector drags can preview transient state, then commit or cancel as one edit.
- Drawing draft, active tool, selected entity, camera state, basemap, and view toggles are UI state; drafts do not change the mission until committed.
- Area generation: polygon/circle footprint → clipped serpentine scan lines → traversal waypoints tagged `generatedByArea`. With Recon enabled, Front overlap sets along-track photo spacing and Side overlap sets cross-track lane spacing from the mock camera footprint; generated photo actions, markers, and downstream Preview/Simulation use the same Area waypoints. Recon-off Areas retain manual `lineSpacingM`. Area `Orientation` sets lane direction; Area Recon `Double grid` adds a perpendicular crosshatch pass. Area changes regenerate those waypoints. Avoid changes reroute intersecting legs with generated detours. Generated points keep derived XY; explicit per-point altitude overrides survive regeneration only while the point still matches the same generated coordinates. Avoid altitude edits remain subject to mission validation.
- Camera footprint and Recon estimates: photo-action pitch overrides Recon pitch. 2D, 3D, and Preview share the mock camera ground projection; Nadir lands below its waypoint and oblique pitch projects forward. Projection uses a flat z=0 reference plane and is conceptual, not terrain-aware or payload-calibrated. In 2D, Area Recon altitude is labeled AGL and drives the mock GSD/footprint and regenerated photo density. Design-card duration/battery are Area-segment estimates; Preview duration covers the full mock route, including transfers and Home paths.
- Mission type is `worldType`: `2D` means photogrammetry; `3D` means legacy 3D mission. The main scene uses Cesium for both. 2D uses Blank space and Recon flight altitude for Area scan; 3D Areas use their saved base altitude and take-off altitude rules. Blank space 3D shows a local grid; non-blank 3D Worlds use local terrain fixtures. Basemap is available in 2D and non-blank 3D.
- Home (`spawn`) is a ground location. `takeoffAltM` sets climb height. Area flight height in 2D comes from Area Recon altitude; Area flight height in 3D uses `max(baseAltM, takeoffAltM)`.
- `validateMission` plus transfer validation gates Simulation. `buildSimPlan` orders routes, Areas, transfers, actions, and optional return-home. Simulation is a prototype estimate, not drone control.

## User flow

1. Open a Library page directly by URL or navigate within Library. Create a mission to store its Library record, then open it at `/mission/:missionId`. The mission's complete design state is saved to the browser when Save is pressed and restored when that URL is opened again. The browser title follows the active page name.
2. Choose drone and open World card to choose mission type. 2D fixes World to Blank space; 3D allows mock Worlds.
3. Set Home, then draw Route, Area, or Avoid in any order. Place points on the scene; close and commit polygons. Area commit generates scan lanes and photo waypoints. Area-only missions remain valid and expose END behavior; Route can be added later.
4. Select an entity to edit it in the right inspector. Recon settings preview generated Area results while editing.
5. Resolve validation errors, then enter Simulation. Play, pause, scrub, or inspect estimated flight. Design edits abort an active simulation.
6. Save in the prototype to record mission state in the standalone app's local JSON store. This does not sync to a server and is not a real drone command.

## Agent change guide

- Change domain rules in `domain/mission-model.ts`; connect the rule through `index.tsx` only where needed.
- Change map rendering, picking, or gestures in `modules/scene/mission-scene.tsx`; keep reusable entity/coordinate helpers in `mission-scene-helpers.ts`.
- Change inspector behavior in `modules/design/`; keep Python draft editing in `python-editor.tsx` and toolbar leaf controls in `design-controls.tsx`. Simulation plan/playback stays in `modules/simulation/`.
- Preserve the boundary between authored and generated waypoints. Recompute generated geometry when its inputs change. Keep undo/redo and validation on the normal commit path.
- For map edits, distinguish `worldType` from basemap style and World fixture. Do not treat “2D photogrammetry” as a separate map renderer.

## GitHub Pages

- Set `VITE_BASE_PATH` at build time for the project site path. Vite and the route helpers use the same base.
- `npm run build:pages` emits `dist/404.html` from the app entry so GitHub Pages can serve direct mission URLs.
- Local development keeps the default `/` base.
