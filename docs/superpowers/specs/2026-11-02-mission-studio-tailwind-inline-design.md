# Mission Studio app CSS migration design

## Intent

Move Mission Studio's app-owned component and layout styling from standalone selector rules into Tailwind utility classes on the React elements that use them. The Owner selected the whole Mission Studio app, including Report, Library, Design, Fly/Simulation, dialogs, and login. The reason is to keep each style beside its source component and reduce the app's custom stylesheet layer.

## Goals

- Replace `.ms-*` and other app-owned component selectors with Tailwind utilities in `className` at their render sites.
- Preserve current layout, responsive behavior, themes, focus/hover/disabled states, reduced-motion behavior, and route transitions.
- Remove the app-owned style imports and selector files when their rules have been migrated and verified.
- Keep Mission Studio's existing SkyTrack UI components and semantic tokens.

## Non-goals

- Change component semantics, interactions, data, routes, or information architecture.
- Edit the `skytrack-ui` package, its vendored tarball, or `node_modules`.
- Replace Tailwind utilities with authored `style={{...}}` values when a utility class can express the style.
- Change Mission Studio's simulation, library persistence, or mission behavior.

## Approaches considered

1. **Colocate Tailwind utilities in JSX/TSX — selected.** Replace app-owned CSS class rules with supported Tailwind classes at the consuming markup, retaining the Tailwind utility generator and the required `skytrack-ui/styles.css` package theme. This directly follows the Owner's requested source style and removes the component CSS selector layer.
2. **Keep `.ms-*` selectors and use `@apply`.** This would preserve a shorter JSX surface, but leaves styling in external app CSS and does not meet the Owner's chosen direction.
3. **Remove every stylesheet import, including package and Tailwind CSS.** Rejected because `skytrack-ui/styles.css` supplies the installed component styles, tokens, base styles, and fonts. Tailwind `className` utilities also need the existing Tailwind compiler entry to emit their CSS.

## Constraints and calls

- Keep `skytrack-ui/styles.css` imported exactly once from `src/main.tsx`; this is required by the installed SkyTrack UI package.
- Keep `src/ui/styles/tailwind-utilities.css` as the Tailwind v4 utility-generation and token-mapping entry. Remove `src/ui/styles/main.css`, its `index.css` aggregator, and app-owned component style files only after their rules have moved and no import/use remains.
- The current app has 11 app-owned selector/style files, about 989 CSS lines across the style directory, plus the Tailwind generator. `base.css` includes dialog-slot styling, screen-reader treatment, View Transition pseudo-elements/keyframes, and a Cesium credit selector. Other files include responsive and input states, login animation, and Python editor syntax styling. These need explicit utility or runtime equivalents so behavior survives.
- Where a rule targets a document pseudo-element or a DOM node owned by Cesium and cannot be attached through a React `className`, first look for a supported app/library API or a safe class assignment. Do not silently drop the behavior. If any app-owned CSS rule must remain, list its exact selector and reason in the handback and request Owner approval before retaining it.
- Preserve the existing local Tailwind version and token mapping; do not add packages or create a new stylesheet.
- Keep dynamic numeric values in the existing data/state path when Tailwind cannot represent them statically; do not convert unrelated domain values.

## Implementation and validation plan

- Inventory each app stylesheet rule and its consuming JSX/TSX location; use the existing source tree and current UI as the visual baseline.
- Migrate one cohesive area at a time in a single implementation worktree: shared shell/base, Library, Design/inspector and scene, Fly/Simulation, dialogs, and login. Replace class-state strings with explicit Tailwind variant/data-attribute classes while preserving markup and test IDs.
- Remove selector definitions and imports only after searching for remaining references and checking Tailwind generation.
- Run `npm run typecheck` and `npm run lint`. Do not run a production build during active development.
- Inspect Orca at desktop and narrow viewports for Library home/dialog, Report list and Mission Insights, Design/inspector, Fly/Simulation, and Login. Check active, hover/focus, disabled, dark theme, route-transition, and reduced-motion states where applicable. Record any state not exercised.
- Run the required SkyTrack UI preflight before app source changes and final handoff audit afterward. Existing workspace-wide audit findings must be reported separately from migration findings.

## Delegated implementation boundary

- Builder: Orca `opencode2` using a DeepSeek model, after Owner approval of this design.
- Writable scope: `designs/prototypes/skytrack-mission-studio/src/ui/styles/` and the existing `src/` React source files whose styles are defined there, plus task/evidence records for this migration.
- Exclusions: `skytrack-ui` repository/package, `node_modules`, external services, mission data/logic, and unrelated workspace artifacts.
- Handback: exact changed paths, style rules migrated, any residual rules and reasons, checks actually run, Orca screenshots/states, and known gaps.

## Open approval point

The Owner selected an app-wide Tailwind migration and keeping `skytrack-ui/styles.css`. This migration also needs `src/ui/styles/tailwind-utilities.css` so Tailwind can generate the utility classes used in `className`; it is a compiler/token entry, not a hand-authored component stylesheet. The proposed end state keeps those two imports, removes the app-owned style aggregator and selector files after migration, and leaves no residual app-owned CSS unless the Owner approves each exact selector and reason first.

**Owner decision requested before implementation:** approve this stylesheet boundary and the stop-and-review rule for app-owned global, pseudo-element, or vendor-DOM rules that cannot be moved safely to a React `className` or supported API.

**Builder check:** A fresh frontend engineer review found one material planning question: whether the Owner approves this CSS boundary. No other important unanswered questions were raised.
