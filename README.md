# SkyTrack Mission Studio

Standalone Vite app for the Mission Studio route. This copy has its own app entry, package manifest, dependency installation, and Cesium asset serving; it does not use Prototype Hub routing or shell.

## Run

```bash
npm ci
npm run dev
```

Set `VITE_LOGIN_PASSWORD` in `.env` before starting the dev server. The GitHub Pages workflow reads the same value from the repository's `VITE_LOGIN_PASSWORD` Actions secret. The login form checks the password against this value; the username field is temporarily commented out. After sign-in, this browser stores a session flag in `localStorage` until logout or site data is cleared. Vite embeds `VITE_` variables in browser code, so this prototype gate is not secure authentication; use only a demo password that is safe to expose.

Build and typecheck:

```bash
npm run build
```

## GitHub Pages

Live prototype: <https://tgt95.github.io/skytrack-app-prototype/>. Pushes to `main` build and deploy the site through [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). The Pages build uses the repository path as its Vite base and emits a `404.html` fallback so direct mission and library URLs load correctly.

## Project map

- `src/` — complete standalone app, route, and source modules.
- `src/App.tsx` and `src/main.tsx` — standalone entry and host wrapper.
- `vite.config.ts` — React, Tailwind, and Cesium worker/static asset setup.
- [`agents/`](./agents/README.md) — current agent instructions and architecture notes.

### Source organization

The `domain/`, `modules/`, and `shared/` folders under `src/` separate business rules, feature implementation, and reusable app code:

| Folder | Responsibility | Examples |
| --- | --- | --- |
| `src/domain/` | Mission types and deterministic rules such as geometry, validation, generation, and serialization. Keep it independent of React, Cesium, the DOM, and browser storage. | `mission-generation.ts`, `mission-validation.ts` |
| `src/modules/` | Feature UI, state, and integrations. Subfolders group related responsibilities such as auth, Studio orchestration, Design inspectors, Cesium scene rendering, Library pages, and address search. | `auth/`, `studio/`, `design/`, `scene/`, `library/`, `search/` |
| `src/shared/` | Reusable, feature-neutral UI and helpers used by multiple modules. Keep feature internals and feature persistence out. | `map-control-tooltip.tsx`, `theme-preference.ts` |

Modules may use domain rules and shared helpers. Domain code and shared code should not depend on feature modules. `src/shared/` is app-internal code; design-system controls come from `skytrack-ui`.

The app supports direct URLs for its pages:

| Page | URL |
| --- | --- |
| Home | `/home` |
| Recent | `/recent` |
| Projects | `/projects` |
| Project detail | `/projects/:projectId` |
| Worlds | `/worlds` |
| Drones | `/drones` |
| Starred missions | `/starred-missions` |
| Shared with me | `/shared-with-me` |
| Shared project detail | `/shared-projects/:projectId` |
| Shared accounts | `/shared-accounts/:missionId` |
| Learn | `/learn` |
| Templates | `/templates` |
| Template detail | `/template/:templateId` |
| Documentation, AI models, Logs, Notifications | `/docs`, `/ai-models`, `/logs`, `/notifications` |
| Mission detail | `/mission/:missionId` (`/detail/:missionId` and `/mission-studio/:missionId` are legacy aliases) |

The browser title follows the active page, project, template, or mission name. The favicon uses the SkyTrack brand mark.

Projects and missions are stored as JSON in browser `localStorage`; each project belongs to a Workspace, and the selected Workspace is also remembered locally. The Design **Save** action stores the full mission snapshot. Drone profiles and World/AI model records use separate versioned local stores scoped to their Workspace. Drone hardware and performance values are descriptive; profiles do not connect to a drone or configure real flight. World and Workspace AI model fixtures are labeled **Sample**. `Blank space` remains the system 2D World. A registered World stores a source 2D mission or user-entered flight reference plus a reconstruction reference. References are text only: this prototype does not upload or process assets. The AI model import preview saves model name and package metadata locally; it does not upload, store, or validate the selected ZIP. Models are not run or deployed. Data stays in this browser and does not sync to Prototype Hub or a server.

The Mini-Pro and Mini-Base reference profiles use owner-provided hardware inventory. Their PX4 firmware and Pixhawk 6C Mini flight controller are recorded; firmware versions, fit dimensions, payload, and performance values remain unspecified unless confirmed. Profiles support mission use case, frame fit, payload/performance values, and component-level model, part, revision, installation, source, and flexible specification details. Version-1 Drone records migrate to version 2 without changing project or mission storage. These values are descriptive; compatibility is not checked and no flight hardware is connected.

Library mission cards show the mission mode (`2D` or `3D`) and its World. The Shared with me page demonstrates read-only projects from other owners and Workspaces; it does not send invitations or provide live sharing.

The standalone app installs from its own checkout. Its pinned `skytrack-ui` build package is stored under `vendor/`. This is a prototype; it does not sync data to a server or control a drone.

Workspace Projects, Worlds, and AI model records are stored locally. A World asset reference is descriptive only: this prototype does not upload, validate, or render reconstruction files.
