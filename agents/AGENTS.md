# Mission Studio agent instructions

Read this file before changing this standalone project.

## Source of truth and protected copy

- The active standalone source is `../src/`; this app has no nested prototype source directory.
- The independent app shell, package, and Cesium setup live at the project root and under `../src/`.
- The Prototype Hub copy lives outside this repository. Keep all standalone changes here; do not add a second parent-workspace source tree.
- Treat this project as a prototype. Do not claim production parity or full feature coverage without current evidence.
- Workspace-only prompts, receipts, reviews, and task state are not part of this public repository.

## Work and checks

- Keep user-visible behavior and UI stable unless the Owner approves a feature change.
- Keep mission calculations in `../src/domain/`, Viewer lifecycle and picking in `../src/modules/scene/mission-scene.tsx`, coordinate/entity helpers in `../src/modules/scene/mission-scene-helpers.ts`, inspector and leaf controls in `../src/modules/design/`, library flow in `../src/modules/library/`, and playback in `../src/modules/simulation/`.
- Use `skytrack-ui` components and semantic tokens for controls.
- For actionable library cards, show supported Star and More (`DotsThreeIcon`) actions in an overlay on hover and keyboard focus; keep actions visible on touch devices. Use `skytrack-ui` Button variants and sizes without card-specific visual overrides.
- Use the `skytrack-ui` semantic `--favorite` token for the active Star icon; do not reuse the warning color for favorite state.
- Use one supported action list for the More menu and right-click `skytrack-ui` ContextMenu. Order primary actions first, common actions next, and destructive actions last, with dividers between groups. Do not add inert actions or controls.
- Keep library menu items text-only; do not add leading icons.
- Run `npm run build` after code changes. Run focused runtime and system checks for affected behavior. See `qc-test-cases.md` for the full planned regression suite; a planned case is not a claim that it passed.
- Keep agent documentation in this `agents/` tree. Update architecture references when source boundaries change.
- This app has separate storage under its own browser origin and does not sync with Prototype Hub.
