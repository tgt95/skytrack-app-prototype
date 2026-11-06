# Implementation report — T-367

## Delivered

- Added a searchable `DataTable` report list with illustrative Simulation, Real, and HITL rows, both Succeeded and Failed statuses, and Mission Insights / Post Flight Analysis buttons.
- Added a static HITL Mission Insights subpage using SkyTrack UI `PageHeader`, `Breadcrumb`, `Toolbar`, `Alert`, `Badge`, and `Button` components.
- Followed the approved PageHeader structure: breadcrumb row; page title with toolbar; section title with optional toolbar and content. Card titles use `<h2 className="h4">`; MQTT trace uses `<h3 className="text-base">`.
- Hid Mission Studio top navigation, left sidebar, and status bar while the subpage is open. Breadcrumb return restores them and keeps the report table mounted with search state intact.
- Kept sample values visibly illustrative and unbound to the selected row. Export and unsupported report actions remain disabled.

## Evidence

- `npm run typecheck`: PASS, exit code 0.
- `npm run lint`: PASS, exit code 0.
- Orca runtime/system preview: PASS. `HITL` search returned two rows; Mission Insights hid the shell; breadcrumb restored the shell and retained both rows; subpage reopened and remains on screen.
- Orca detail screenshots: `agents/hitl-mission-insights-preview.png` and `agents/hitl-mission-insights-preview-lower.png`.
- Strict component preflight: PASS, recorded in `agents/PREFLIGHT-GATE-RESULT.md`.
- T-367 file-read record: `agents/task-work/T-367/T-367-SUBPAGE-FILE-READ-LOG.md`.
- No build or tests were run. Dynamic run binding and per-type report logic are deferred to `T-368`.

## Final audit disposition

- The full-source `audit-ui-handoff --stage final` result is `FAIL`.
- Remaining findings are app-wide: unlisted status/severity labels, native fallbacks in other screens, 257 text-size locations missing from the typography inventory, missing SelectItem / SelectValue / FieldLabel typography rows, and radius inventory gaps across unrelated screens. The Report feature's toolbar reconciliation citation is corrected; this does not clear the full-source findings.

## T-369 update — URL-backed detail and list PageHeader

- Added run-specific query navigation for Mission Insights: `?tab=report&report=mission-insights&runId=<id>`. The run ID identifies the selected row in the URL; displayed report values remain illustrative and unbound.
- Initialized subpage state from the URL so refresh restores the detail and hides top navigation, left sidebar, and status bar. Browser back/forward and the Mission Reports breadcrumb return to the mounted list; in-session search remains `HITL` with two rows.
- Kept Mission Reports inside SkyTrack UI `PageHeader` and moved its sample-data introduction into the PageHeader content slot.
- `npm run typecheck`: PASS. `npm run lint`: PASS. No build or tests were run.
- Orca PASS: row click and URL, refresh, browser back/forward, breadcrumb, hidden/restored shell, retained filter, and both PageHeader layouts inspected. Screenshots: `agents/hitl-mission-insights-url-list.png` and `agents/hitl-mission-insights-url-detail.png`.
- Actual Read Log Rows: 68 (`agents/task-work/T-369/T-369-PREFLIGHT-READ-LOG.md`).
- T-369 final strict audit: `FAIL` (exit 1). It reports that the existing content audit cites `report-hitl.md` without it appearing in T-369's immutable pre-code read log, plus workspace-wide content-label, native-fallback, typography, component-typography, controlled SelectValue, and radius inventory gaps. Report-specific radius locations and reconciliation sources have been updated; no unrelated screens were changed. Full output: `agents/task-work/T-369/T-369-FINAL-AUDIT.log`; summary: `agents/task-work/T-369/T-369-COMPLETION-RESULTS.md`.
