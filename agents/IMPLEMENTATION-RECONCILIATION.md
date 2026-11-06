# Implementation reconciliation

## Component map reconciliation

| Coverage row | UI need | Implemented with | Source location | DOM evidence |
|---|---|---|---|---|
| 1 | Searchable, sortable, paginated run list | `DataTable` | `src/features/studio/report-table.tsx:553` | Orca showed Run, Type, Status, Started, Duration, and Reports columns with eight sample rows. |
| 2 | Run type and outcome labels | `Badge` plus table cell values | `src/features/studio/report-table.tsx:185` | Status cells render Succeeded/Failed badges; Type values include Simulation, Real, and HITL. |
| 3 | Report actions and preview entry | `Button` | `src/features/studio/report-table.tsx:222` | Mission Insights is enabled only on HITL rows; other actions are disabled in this static preview. |
| 4 | URL-backed report detail and return path | SkyTrack `Breadcrumb` and `BreadcrumbLink` plus History API | `src/features/studio/report-table.tsx:326`; `src/features/studio/mission-report-url.ts` | HITL action adds `tab=report&report=mission-insights&runId=<id>`; browser history and Mission Reports breadcrumb return to the mounted list. |
| 5 | Sample-data disclosure | `Alert` | `src/features/studio/report-table.tsx:367` | Detail states values/statuses are illustrative and not linked to the selected row. |
| 6 | Grouped report surfaces and Level 1 card titles | Native semantic `<section>` surface; `<h2 className="h4">` | `src/features/studio/report-table.tsx:258` | Readiness, Flight, Comparison, Versions, and Evidence are named regions with `h2.h4` headings. |
| 7 | Five readiness checks | Native `<ul>` with `Badge` outcomes | `src/features/studio/report-table.tsx:412` | Orca showed five checklist rows, each with an illustrative PASS badge. |
| 8 | Flight metrics and MQTT trace | Native `<dl>` plus `<h3 className="text-base">` | `src/features/studio/report-table.tsx:410` | Five metrics and the MQTT command/action subgroup appear under Flight. |
| 9 | Simulation comparison matrix | Native semantic `<table>` | `src/features/studio/report-table.tsx:456` | Captioned Metric / Sim run / HITL sample table has three metric rows. |
| 10 | Page title, breadcrumb, and page actions | `PageHeader` | `src/features/studio/report-table.tsx:323-378,614-622` | Detail PageHeader renders breadcrumb above the `h1` title and toolbar. Mission Reports list uses PageHeader for its title and supporting sample-data introduction. |
| 11 | Page action toolbar and disabled Export | `Toolbar` | `src/features/studio/report-table.tsx:345` | Named Mission Insights actions toolbar contains a grouped control with disabled Export report. |
| 12 | Hide Studio shell while detail is open | Mission Studio shell state initialized from URL | `src/ui/layout/page-layout.tsx:84-86,185-189` | Orca showed no top navigation, complementary left rail, or status footer on detail; all return on breadcrumb. URL initialization also restores the subpage on refresh. |

## Landmark and heading reconciliation

| IA item | Source location | Rendered DOM evidence |
|---|---|---|
| Application main landmark | `src/App.tsx:137` | Orca snapshot contains one `main`. |
| Report container | `src/features/studio/studio-map-overlays.tsx:89` | Region named Report; no extra Report heading wraps the subpage. |
| Mission Reports list title and supporting introduction | `src/features/studio/report-table.tsx:614-622` | PageHeader renders `Mission Reports` as `h1.h3` and places the illustrative-data introduction in its lower content slot. |
| Mission Insights page title | `src/features/studio/report-table.tsx:313` | PageHeader renders `Mission Insights` as `h1.h3`. |
| Readiness, Flight, Comparison, Versions, Evidence | `src/features/studio/report-table.tsx:263` | Five `h2.h4` section titles; Orca observed level 2. |
| MQTT command & action trace | `src/features/studio/report-table.tsx:421` | `h3` with `text-base`; Orca observed level 3. |
| Conditional top navigation and left sidebar | `src/ui/layout/page-layout.tsx:213` and `:228` | Both are absent while the Mission Insights detail is open. |
| Conditional status bar | `src/ui/layout/page-layout.tsx:370` | Status footer is absent on detail and restored on list return. |

## Preview scope

The list `DataTable` remains mounted and hidden while the static detail is displayed. The URL identifies the selected HITL row for navigation only; breadcrumb return restores the shell and preserves the search filter. Detail content is an illustrative fixed sample with no selected-run binding, backend reads, export behavior, or Simulation/Real detail pages. `T-368` tracks the deferred data and per-type behavior.
