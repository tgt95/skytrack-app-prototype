# Typography audit

| Source location | Text expression | Effective size | Role / treatment |
|---|---|---|---|
| `src/features/studio/report-table.tsx:313,545` | PageHeader `.h3` | 24px below `lg`; 30px at `lg` and above | List and Mission Insights page titles; PageHeader renders semantic `h1` |
| `src/features/studio/report-table.tsx:263` | `.h4` | 20px below `lg`; 24px at `lg` and above | Five section titles; semantic `h2` |
| `src/features/studio/report-table.tsx:414` | `text-lg` | 18px | Primary flight metric values |
| `src/features/studio/report-table.tsx:421` | `text-base` | 16px | MQTT trace subgroup heading; semantic `h3` |
| `src/features/studio/report-table.tsx:553` | Package DataTable `text-sm` | 14px | Table header, rows, and controls |
| `src/features/studio/report-table.tsx:222` | Button `size='sm'` | 14px | Row report actions |
| `src/features/studio/report-table.tsx:350` | ToolbarButton `size='sm'` | 12px | Disabled Export action in PageHeader toolbar |

Orca computed styles at the 1919px viewport: Mission Insights `h1.h3` 30px; section `h2.h4` 24px; MQTT `h3.text-base` 16px. Package defaults are retained. No authored `text-xs`, `text-sm`, arbitrary text size, or sub-16px inline font-size override is used in `report-table.tsx`.
