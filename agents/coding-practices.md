# Mission Studio Coding Practices

Use these rules with [`AGENTS.md`](./AGENTS.md) and
[`reference/architecture.md`](./reference/architecture.md) when changing the
standalone Mission Studio app. They describe the current prototype architecture;
they do not imply production readiness or full feature coverage.

## Module ownership

- Keep mission rules, geometry, validation, generation, and serialization in
  `src/domain/`. Keep them deterministic and independent of React, Cesium, DOM,
  and browser storage.
- Keep the Cesium `Viewer` lifecycle in `modules/scene/mission-scene.tsx`.
  Scene helpers and synchronizers must have explicit inputs and cleanup. Update
  only entities owned by the relevant scene layer; do not clear unrelated layers
  during an incremental update.
- Keep the canonical mission document and undo/redo history in the Studio
  document reducer. UI drafts may be transient, but commit them through the
  existing callbacks so one completed user action creates at most one history
  entry. No-op edits must not create history.
- Keep presentation and transient form state near the component that renders it.
  Keep Library persistence behind `modules/library/database/` stores and preserve
  Workspace scoping and existing migrations.
- Keep `src/index.tsx` as the Studio composition boundary. Extract cohesive
  responsibilities and render boundaries; do not move a large component body
  wholesale into a hook to reduce a file's line count.
- Keep reusable, feature-neutral UI in `src/shared/`. Feature modules may use
  shared UI and domain contracts; shared code must not depend on feature internals
  or own feature persistence.
- Keep dependency direction explicit: `src/index.tsx` composes feature modules;
  feature modules may depend on `src/domain/` and `src/shared/`; `src/shared/`
  must not depend on feature modules; and `src/domain/` must remain independent
  of UI, scene, storage, and feature modules. Outside `src/domain/`, import its
  public APIs through `mission-model.ts`; use direct imports for internal domain
  helpers when needed.

## State, history, and input

- Prefer React state, reducers, refs, and context already used by the app. Add an
  external state library only for a concrete need that cannot be met by the
  current boundaries, and record the Owner's approval first.
- Keep one canonical `StudioMission` in the Studio document. Child editors may
  keep temporary input drafts; use preview, commit, and cancel callbacks for
  live editing.
- Keep state with the narrowest owner shared by its consumers. Group state that
  changes together; split state by ownership or update frequency, not by a raw
  count of `useState` calls. Memoized slices alone do not isolate rendering when
  a parent still updates or passes fresh objects and callbacks.
- Preserve one undo entry per completed user action. Drag, slider, and form
  previews remain transient until commit. Do not add an entry for a no-op.
- On pointer-move and slider-preview paths, do not serialize whole mission
  collections to detect changes. Prefer explicit change information or
  structural sharing. Reference comparison is valid only when producers preserve
  references for semantic no-ops and replace them for actual changes. Preserve
  no-op, regeneration, and undo behavior; JSON serialization remains appropriate
  for snapshots and import/export where required.
- A committed mission edit must stop or reset active Simulation through the
  existing state path.
- Preserve keyboard priority: focused text/number input or IME; open dialog or
  popover; active drag cancellation; drawing cancellation; selection clearing.
  Global listeners must not be re-registered on every render and must read fresh
  state safely.
- Keep high-frequency state such as simulation ticks, pointer hover, and search
  typing from remounting the Cesium Viewer or needlessly rendering static Studio
  surfaces. A React render does not by itself mean a DOM commit or Viewer remount.
  Measure render boundaries before optimizing. Prefer narrower state ownership;
  use `React.memo` only when consumers have stable, relevant props and callbacks.

## Cesium lifecycle and rendering

- Only `MissionScene` creates or destroys the Cesium `Viewer`.
- Dispose event handlers, DOM listeners, observers, and animation frames on
  unmount and retry. Cleanup must be safe to call more than once.
- Give scene entities explicit, registered layer ownership. Never use
  `viewer.entities.removeAll()` during a partial update or interaction.
- During high-frequency drags, update existing owned entity properties in place
  when Cesium supports it, instead of repeatedly removing and recreating entities.
- With `requestRenderMode` enabled, request a render after imperative scene or
  camera changes that need to appear immediately.
- Guard callbacks against a missing or destroyed Viewer. Preserve the current
  entity IDs, layer ownership, picking, and cleanup behavior when extracting code.

## UI and accessibility

- Use `skytrack-ui` controls and semantic tokens for buttons, inputs, selects,
  dialogs, menus, tabs, tooltips, and status colors. Keep app-specific layout in
  `.ms-*` classes; avoid local visual overrides that fork a library control.
- Preserve current public props, route contracts, `data-testid` values, and
  `window.__missionStudio` hooks unless an approved task changes them.
- Give icon-only controls accessible names and use the app's tooltip pattern.
  Preserve keyboard focus and touch access for Library card actions.
- Keep modal keyboard behavior intact: move focus into an opened dialog, keep
  keyboard navigation within the modal, close with Escape where supported, and
  return focus to the trigger. Check keyboard behavior, not only ARIA attributes.
- Keep More and context-menu actions sourced from the same definitions, ordered
  primary, common, destructive. Keep menu items text-only and do not add inert
  actions.
- Keep user-facing state changes and storage errors announced through the
  existing polite status mechanism. Avoid duplicate announcements when combining
  live regions; preserve route-specific status and test hooks.

## Data and prototype boundaries

- Read and write local data through the existing versioned stores. Preserve
  Workspace isolation and backward-compatible migrations.
- Treat parsed JSON, localStorage values, URL data, and imported files as
  untrusted runtime input. Parse into `unknown`, validate the shape and version,
  then normalize or migrate before using domain types. A TypeScript assertion or
  compiler setting does not validate runtime data; check the effective
  TypeScript configuration before claiming strict mode is enabled.
- Keep snapshot hydration and Library database validation at their owning input
  boundaries. Preserve legacy optional fields and the current throwing/caller-
  catch contract for invalid mission snapshots; reject invalid Library records
  as a whole database and let the existing seed fallback handle them.
- Handle storage failures without losing the in-memory state or crashing the UI;
  report failures through the existing status announcement.
- Do not imply server sync, uploaded reconstruction assets, live telemetry, or
  real flight control. Keep sample and mock behavior labeled accurately.
- Do not change storage schemas, keys, or data migration behavior as incidental
  refactor work.

## File size and decomposition

- Treat large files as a signal to inspect ownership and render boundaries, not
  as a reason to split code mechanically.
- During the approved scale-refactor plan, use these targets: UI components at
  or below 400 lines, domain and other non-scene TypeScript modules at or below
  450 lines, imperative scene modules at or below 500 lines, and Library
  persistence modules at or below 500 lines. If cohesion or public contracts
  require an exception, record its exact ceiling and rationale in
  [`file-size-baseline.json`](./file-size-baseline.json); remove the entry when
  the file reaches its target. New crossings and growth past a reviewed ceiling
  fail the guardrail.
- Split by one responsibility and preserve existing imports through explicit
  re-exports when needed. Avoid creating generic abstractions used by only one
  caller without a clear boundary benefit.

## Executable architecture and storage contracts

- `npm run check:architecture` parses TypeScript imports to enforce pure
  `src/domain/` dependencies and prevent `src/shared/` from depending on feature
  modules. It also checks path-specific line targets and their reviewed
  ceilings. Keep fixtures for both accepted and rejected imports and size cases
  in `tests/architecture-guardrails.test.cjs`.
- Keep browser storage names in [`storage-keys.ts`](../src/shared/storage-keys.ts)
  and versioned payload numbers in the same registry. `tests/storage-contracts.test.cjs`
  pins those names and versions and exercises store save/load round trips. Any
  key or payload-version change needs an explicit migration and updated
  compatibility evidence.
- Keep mission commit, preview, undo, redo, and no-op behavior covered by the
  `mission-document.test.cjs` contracts. Do not rely on a source-text rule for
  runtime behavior or ban `JSON.stringify`; snapshots and import/export still
  require serialization.

## Verification and handback

- Follow the task's required `STATIC`, `RUNTIME`, and `SYSTEM` checks. A build
  does not prove runtime behavior. Record skipped checks as `NOT_RUN` with their
  impact; do not claim unobserved behavior.
- For source changes, run the scoped typecheck and lint, then `npm run build` as
  required by this project. Run deterministic parity checks for changed domain,
  history, or scene-ownership logic when available.
- Add or run tests only when the task asks for them or its acceptance criteria
  require them. Do not add a test framework or dependency as incidental cleanup.
- Update the architecture map when module ownership or source boundaries change.
- Report changed paths, actual commands and results, runtime evidence, and
  unresolved limits. A self-check is not an independent review.
