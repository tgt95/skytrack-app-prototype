# Report tab IA outline

## Report list

- **Audience / task:** Mission Studio user locating and comparing run records.
- **Pattern:** SkyTrack UI `PageHeader` titled Mission Reports with the short sample-data introduction in its lower content slot, followed by a searchable run list with sortable columns and row report actions.
- **Existing content:** Run name, type, status, start time, duration, and report actions.
- **Main landmark:** Existing application `<main>` in `src/App.tsx`; the Report tab remains inside it.

## HITL Mission Insights static preview

- **Audience / task:** Mission operator reviewing one HITL run summary, then returning to the run list.
- **Traceability:** operator → review one HITL run → run/readiness/flight/evidence data → object detail → breadcrumb return; show sample PASS layout only.
- **Navigation:** Click `Mission Insights` in a HITL row to push `?tab=report&report=mission-insights&runId=<row-id>` onto the current mission URL. That URL restores the subpage on refresh/direct open. Browser back returns to the Report list; browser forward restores the detail; the `Mission Reports` breadcrumb returns to the list. Keep the DataTable mounted while the detail preview is open so search and sort state survive.
- **Page pattern:** Use the current package's `PageHeader` as the page-level header. Its breadcrumbs row sits above the page-title + toolbar row. The Report container is a full-width page region, not a card around another page header. Do not add another route or `main` landmark.
- **Subpage shell:** While Mission Insights is open, including when restored from its URL, hide Mission Studio's top navigation, left sidebar, and bottom status bar. Restore all three when browser history or the breadcrumb returns to the Report list.
- **Page toolbar:** Show HITL and illustrative PASS badges with a disabled Export report `ToolbarButton` as the static toolbar example.
- **Sections, in order:**
- **Header layout:** `PageHeader` breadcrumb row; `Mission Insights` title and toolbar row; sample identity and timestamp in its lower content slot.
- **Content order:**
  1. Informational disclosure that values are illustrative and not linked to the selected row.
  2. Readiness card: title and optional count adornment in one header row; five verdict rows in content.
  3. Flight card: title row; five exact metrics and MQTT command/action trace in content.
  4. Comparison with simulation card: title row; fixed three-metric comparison table, marked illustrative because parity metrics are not produced by the current collector.
  5. Versions card: title row; hardware, firmware, profile, world/model, and camera-chain summary. Omit internal host addresses and device paths.
  6. Evidence card: title and optional checksum-status adornment in one header row; sample run folder and artifact names in content.
- **Decision-critical information:** readiness result, flight readings and trace completeness, simulation comparison context, configuration identity, and evidence status.
- **Responsive priority:** one column on narrow screens; two-column section layout on wide screens. Keep five flight metrics wrapping into readable columns. Keep comparison table horizontally usable without clipping.
- **Preview scope:** one static PASS snapshot only. URL state includes the clicked run ID for navigation identity, while sample detail values remain unbound to that row. No backend data, alternate incomplete/failed state, or Simulation/Real report view in this slice. Export stays disabled until the later logic task.
- **Assumptions:** Source example values are shown only to preview grouping and hierarchy. The current table rows are independent sample rows.

## Heading inventory

| Heading | Parent | Semantic element/level | Visual hierarchy role | Required class |
|---|---|---|---|---|
| Mission Reports | Report list PageHeader | `h1` | Page title | `.h3` via PageHeader |
| Mission Insights | Detail PageHeader | `h1` | Page title | `.h3` via PageHeader |
| Readiness | Mission Insights / readiness card | `h2` | Level 1 card title | `.h4` |
| Flight | Mission Insights / flight card | `h2` | Level 1 card title | `.h4` |
| MQTT command & action trace | Flight card / trace group | `h3` | Level 3 subgroup heading | `text-base font-medium text-(--foreground)` |
| Comparison with simulation | Mission Insights / comparison card | `h2` | Level 1 card title | `.h4` |
| Versions | Mission Insights / versions card | `h2` | Level 1 card title | `.h4` |
| Evidence | Mission Insights / evidence card | `h2` | Level 1 card title | `.h4` |

The detail cards use `.h4` for their Level 1 card titles. `text-lg` is reserved for Level 2 group headings; it must not replace the `.h4` role on these card titles. PageHeader supplies the page-level `<h1 class="h3">`.

## Browser preflight

- **Surface:** Orca embedded browser.
- **Control tool:** `orca` CLI via the `orca-cli` skill, as required by workspace `AGENTS.md`.
- **Starting URL:** `http://localhost:5173/mission/m-local-mvrqcly0-101?tab=report`.
- **Required observation:** Open `Mission Insights` from a HITL row; verify its PageHeader, one `main` landmark, and the absence of the top navigation, left sidebar, and status bar; use `Mission Reports` to return and confirm all shell chrome and the report list are restored.
