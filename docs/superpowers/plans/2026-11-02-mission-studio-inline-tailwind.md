# Mission Studio Inline Tailwind Migration Implementation Plan

> **For agentic workers:** Execute these tasks in order. Check off each step and return a concise handback with the changed files, checks, and any blocked selector.

**Goal:** Move all Mission Studio app-owned style rules into Tailwind utility classes at their React source while preserving the current UI and required SkyTrack UI theme.

**Architecture:** Keep semantic markup and behavior in the existing components. Put layout, state, responsive, focus, and hover utilities on the elements they style; keep only the SkyTrack UI package stylesheet and Tailwind generation/token entry imported by the application. Remove the app stylesheet chain once its rules have migrated and the source scan confirms no remaining use.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Vite, `skytrack-ui@0.1.5`, Orca browser.

**Spec:** `docs/superpowers/specs/2026-11-02-mission-studio-tailwind-inline-design.md`

## Global Constraints

- Keep `skytrack-ui/styles.css` imported exactly once from `src/main.tsx`.
- Keep `src/ui/styles/tailwind-utilities.css` as the Tailwind v4 utility-generation and token-mapping entry.
- Do not edit the SkyTrack UI package, its vendored tarball, or `node_modules`.
- Do not change component semantics, interactions, data, routes, or information architecture.
- Do not replace utility classes with authored `style={{...}}` values when a Tailwind utility can express the style.
- Preserve current layout, responsive behavior, themes, focus/hover/disabled states, reduced-motion behavior, and route transitions.
- If an app-owned global, pseudo-element, keyframe, or vendor-DOM rule cannot move safely to an element utility or supported API, report its exact selector and reason; pause that rule for Owner review before retaining or removing it.
- Run `npm run typecheck`, `npm run lint`, `git diff --check`, and the required runtime/UI audit. Do not run a production build or test suite during this active-development slice.
- Do not commit. Preserve all existing changes in the Mission Studio worktree.

## File map

- CSS sources to migrate: `src/ui/styles/base.css`, `studio-shell.css`, `studio-scene.css`, `studio-scene-overlays.css`, `studio-inspector.css`, `studio-inspector-sequence.css`, `library-chunk-1.css` through `library-chunk-4.css`, and `login.css`.
- Import chain to remove after migration: `src/ui/styles/main.css`, `src/ui/styles/index.css`, and the `./ui/styles/main.css` import in `src/main.tsx`.
- Required CSS entry to preserve: `src/ui/styles/tailwind-utilities.css` and the `skytrack-ui/styles.css` import in `src/main.tsx`.
- React consumers: the exact `src/**/*.tsx` and `src/**/*.ts` paths listed in `agents/task-work/T-370/T-370-COMPONENT-COVERAGE-MAP.md`; affected families include `src/ui/layout/`, `src/ui/components/`, `src/features/design/`, `src/features/studio/`, `src/features/library/`, `src/features/simulation/`, `src/features/search/`, `src/features/scene/`, `src/pages/`, and `src/App.tsx`.
- T-370 evidence artifacts: `agents/task-work/T-370/T-370-FILE-READ-LOG.md`, `agents/task-work/T-370/T-370-COMPONENT-COVERAGE-MAP.md`, `agents/task-work/T-370/T-370-IA-OUTLINE.md`, `agents/task-work/T-370/T-370-PREFLIGHT-GATE-RESULT.md`, `agents/task-work/T-370/T-370-CONTENT-AUDIT.md`, `agents/task-work/T-370/T-370-INTERACTION-AUDIT.md`, `agents/task-work/T-370/T-370-IMPLEMENTATION-RECONCILIATION.md`, `agents/task-work/T-370/T-370-COMPONENT-TYPOGRAPHY-AUDIT.md`, `agents/task-work/T-370/T-370-SEMANTIC-COLOR-AUDIT.md`, `agents/task-work/T-370/T-370-RADIUS-AUDIT.md`, `agents/task-work/T-370/T-370-IMPLEMENTATION-REPORT.md`, and `agents/task-work/T-370/T-370-FINAL-AUDIT.log`.

## Tasks

### Task 1: Build the source map and pass STRICT preflight

**Files:**
- Read: workspace `AGENTS.md`, Mission Studio `agents/AGENTS.md`, `agents/coding-practices.md`, `agents/reference/architecture.md`, SkyTrack UI `AGENTS.md`, the required SkyTrack UI router/gates/implementation guide/rules/component router, the relevant `AGENT_GUIDE.md` headings, the approved design doc, current style files, and the installed package evidence.
- Create: `agents/task-work/T-370/T-370-FILE-READ-LOG.md`, `agents/task-work/T-370/T-370-COMPONENT-COVERAGE-MAP.md`, `agents/task-work/T-370/T-370-IA-OUTLINE.md`, `agents/task-work/T-370/T-370-PREFLIGHT-GATE-RESULT.md`.

- [x] Record each required guide, installed package, declaration, runtime entry, closest compatible demo, stylesheet, font asset, and pinned tarball read through `read-and-log.mjs`.
- [x] Map each distinct existing styled UI need to its current component/composition and verified `skytrack-ui@0.1.5` candidate; cite exact installed paths and read-log row numbers. State when a Tailwind class migration preserves the current semantic markup instead of substituting a library component.
- [ ] Record the app's existing route/page hierarchy and one `main` landmark per route.
  > Remains open: current source count is two because Library still nests a `main`; T-370 scope preserves semantics and records this in the final reconciliation. Include the visible heading inventory, each heading's parent, semantic level, visual role, and role class. State that the migration does not change the IA.
- [x] Run the preflight command from the Mission Studio root:

```sh
node ../../components/skytrack-ui/designs/components/skytrack-ui/skills/skytrack-ui/references/scripts/audit-ui-handoff.mjs \
  --stage preflight \
  --source-root src \
  --coverage agents/task-work/T-370/T-370-COMPONENT-COVERAGE-MAP.md \
  --read-log agents/task-work/T-370/T-370-FILE-READ-LOG.md \
  --ia agents/task-work/T-370/T-370-IA-OUTLINE.md \
  --package-tarball vendor/skytrack-ui-0.1.5.tgz \
  --gate-record agents/task-work/T-370/T-370-PREFLIGHT-GATE-RESULT.md
```

- [x] Continue to Task 2 only if the gate passes and installed package files match the pinned tarball. If it fails, resolve evidence only and rerun; do not modify app source before PASS.
### Task 2: Migrate global base and shell styles

**Files:** `src/ui/styles/base.css`, `src/ui/styles/studio-shell.css`, and the exact consumers recorded in the T-370 map, including `src/main.tsx`, `src/pages/mission-studio-page.tsx`, `src/ui/layout/header.tsx`, and `src/ui/layout/page-layout.tsx` where applicable.

- [x] Move classable root, screen-reader-only, route-content, breadcrumb, focus, and responsive declarations to utilities on their existing elements. Preserve dynamic state conditions and DOM roles.
- [x] Inspect each route-transition pseudo-element/keyframe and Cesium credit-container selector. Use an existing supported API or a Tailwind class on the owned element when it preserves behavior. Record any unclassable selector for Owner review and leave its current behavior intact until that review.
- [x] Search the source and style files for each migrated selector; remove a rule only after every consumer is migrated and verified.

### Task 3: Migrate Studio scene, overlays, inspector, and simulation styles

**Files:** `src/ui/styles/studio-scene.css`, `studio-scene-overlays.css`, `studio-inspector.css`, and `studio-inspector-sequence.css`, plus the exact mapped consumers under `src/features/design/`, `src/features/studio/`, `src/features/scene/`, and `src/features/simulation/`.

- [x] Move element layout, responsive sizing, surface, typography, data-state, disabled, focus, hover, editor token, and selection utilities onto the existing React elements.
- [x] Use Tailwind state/data variants for current `.is-*`, `[data-*]`, pseudo-class, dark-theme, and responsive behavior; preserve existing class-conditioned behavior and state paths.
- [x] Keep SkyTrack UI component typography and semantic tokens intact; do not add normalization utilities such as `text-base` to library-owned text.
- [x] Remove migrated selectors only after searching every mapped consumer. Report any non-classable global/editor/vendor rule before changing its behavior.

### Task 4: Migrate Library styles

**Files:** `src/ui/styles/library-chunk-1.css` through `library-chunk-4.css`, plus exact mapped consumers under `src/features/library/`, `src/features/search/`, `src/ui/components/`, and `src/features/design/`.

- [x] Migrate sidebar, account area, cards, thumbnails, previews, dialogs, forms, wizard rows, responsive layouts, hover/focus/touch and disabled states to classes at their existing render sites.
- [x] Preserve current `skytrack-ui` controls and variants; make no data, persistence, menu, accessibility, or route changes.
- [x] Keep module ordering and behavior unchanged while deleting only selectors whose consumers no longer use them.

### Task 5: Remove the app CSS import chain and preserve required entries

**Files:** `src/main.tsx`, `src/ui/styles/main.css`, `src/ui/styles/index.css`, `src/ui/styles/login.css`; keep `src/ui/styles/tailwind-utilities.css`.

- [x] Search all source and config files for imports of `main.css`, `index.css`, and the app-owned selector files. Remove `./ui/styles/main.css` from `src/main.tsx` after migrated classes compile through the required Tailwind entry.
- [x] Delete `main.css`, `index.css`, and migrated style files only when no rule remains pending Owner review. Remove `login.css` only if its animation is unused or migrated without a stylesheet rule; report any active keyframe needing approval.
- [x] Confirm `skytrack-ui/styles.css` occurs exactly once and resolves, `tailwind-utilities.css` remains imported, and no app-owned selector stylesheet import remains.

### Task 6: Validate, reconcile, and report

**Files:** all changed source plus the T-370 evidence artifacts listed in the File map.

- [x] Run `npm run typecheck`, `npm run lint`, and `git diff --check` from the Mission Studio root; record exact results. Do not run build or tests.
- [x] Inspect the existing Mission Studio app through Orca at desktop and narrow viewports: Library and a representative dialog, Report and Mission Insights, Design/inspector, Fly/Simulation, and Login. Record actual viewport, route, states exercised, and any state not checked. Verify one primary action and one meaningful control result without changing persistent mission data.
- [x] Complete content, interaction, component-typography, semantic-color, and radius audits for migrated UI; record only changes/evidence relevant to T-370 and identify unchanged content as unchanged from the baseline.
- [ ] Reconcile every coverage row in `agents/task-work/T-370/T-370-IMPLEMENTATION-RECONCILIATION.md`, including source location and expected rendered DOM role. Run the SkyTrack UI final audit with the same package tarball and preflight evidence; preserve the exact result. A FAIL leaves T-370 IN_PROGRESS.
- [x] Return exact changed paths, CSS rules migrated, any pending selector decisions, checks actually run, Orca evidence, and remaining limits. Do not commit.
