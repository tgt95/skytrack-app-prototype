# Radius audit

The installed package defines `--radius` as 2px. Report section surfaces and badges use this token; no authored radius value is introduced for those elements.

| Source occurrence | Element | Radius token | Reason |
|---|---|---|---|
| `src/features/studio/report-table.tsx:192` | Run status Badge | `rounded-(--radius)` | Preserve compact package badge geometry |
| `src/features/studio/report-table.tsx:267` | Semantic section surface | `rounded-(--radius)` | Use the package radius for report cards |
| `src/features/studio/report-table.tsx:356` | HITL type badge | `rounded-(--radius)` | Preserve package badge geometry |
| `src/features/studio/report-table.tsx:357` | Sample status badge | `rounded-(--radius)` | Preserve package badge geometry |
| `src/features/studio/report-table.tsx:394` | Readiness count badge | `rounded-(--radius)` | Preserve package badge geometry |
| `src/features/studio/report-table.tsx:413` | Readiness outcome badge | `rounded-(--radius)` | Preserve package badge geometry |
| `src/features/studio/report-table.tsx:496` | Comparison outcome badge | `rounded-(--radius)` | Preserve package badge geometry |
| `src/features/studio/report-table.tsx:521` | Evidence outcome badge | `rounded-(--radius)` | Preserve package badge geometry |

Evidence: `node_modules/skytrack-ui/dist-lib/styles.css` defines `--radius: .125rem`; the installed DataTable uses the token-linked border/surface pattern. No charts render in this view.
