# Component typography audit

| Component | Installed default | Effective size | Role | Override | Evidence |
|---|---|---|---|---|---|
| PageHeader title (`h1.h3`) | `.h3`: 24px, responsive to 30px at `lg`; medium weight | 30px at the Orca desktop viewport | Mission Reports and Mission Insights page titles | `.h3 m-0`; no size override | Orca computed style; `src/features/studio/report-table.tsx:323,614`; package `styles.css` |
| Section titles (`h2.h4`) | `.h4`: 20px, responsive to 24px at `lg`; semibold | 24px at the Orca desktop viewport | Readiness, Flight, Comparison, Versions, Evidence | `.h4 m-0`; no generic `text-lg` override | Orca computed style; `src/features/studio/report-table.tsx:263`; package `styles.css` |
| DataTable header and cells | Package table `text-sm` | 14px | Report columns and row values | None | `node_modules/skytrack-ui/dist-lib/data-table.js:95`; `src/features/studio/report-table.tsx:553` |
| DataTable controls and footer | Package `text-sm` | 14px | Search, column, and pagination controls | None | `node_modules/skytrack-ui/dist-lib/data-table.js:155,178` |
| Row Button (`size='sm'`) | Button small size uses `text-sm` | 14px | Mission Insights and Post Flight Analysis actions | Explicit package size only | `src/features/studio/report-table.tsx:222-226`; package button chunk |
| ToolbarButton (`size='sm'`) | Toolbar small size uses `text-xs` | 12px | Disabled Export action | Explicit package size only | `src/features/studio/report-table.tsx:350-355`; `node_modules/skytrack-ui/dist-lib/toolbar.js:16` |
| Badge | Package `text-xs`, uppercase and tracked | 12px | Type and sample status labels | None; package treatment preserved | `node_modules/skytrack-ui/dist-lib/badge.js:18`; `src/features/studio/report-table.tsx:185-189` |
| Breadcrumb | Package `text-sm` | 14px | Return path | None | `node_modules/skytrack-ui/dist-lib/breadcrumb.js:18`; `src/features/studio/report-table.tsx:316` |
| Alert description | Package `text-sm` | 14px | Static-preview disclosure | None | `node_modules/skytrack-ui/dist-lib/alert.js:34`; `src/features/studio/report-table.tsx:367-374` |
| MQTT subgroup (`h3`) | `text-base` | 16px | Level 3 subgroup heading under Flight | `text-base font-medium text-(--foreground)` | Orca computed style; `src/features/studio/report-table.tsx:421` |
| Flight metric value | `text-lg` | 18px | Primary sample readings | `text-lg font-semibold`; no custom size | `src/features/studio/report-table.tsx:414` |
| Comparison matrix | Inherits 16px body text | 16px | Fixed metric-by-run relationship | None | `src/features/studio/report-table.tsx:456` |

No local typography override changes SkyTrack UI component defaults. Orca computed the PageHeader title at 30px, section titles at 24px, and MQTT heading at 16px in the 1919px viewport.
