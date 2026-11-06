# Semantic color audit

| State/category | Token | Code evidence |
|---|---|---|
| Succeeded / illustrative readiness result | SkyTrack UI `Badge status='success'` | `src/features/studio/report-table.tsx:185-189,399-403` |
| Failed run | SkyTrack UI `Badge status='error'` | `src/features/studio/report-table.tsx:185-189` |
| Run type / HITL type label | SkyTrack UI `Badge status='outline'` | `src/features/studio/report-table.tsx:343` |
| Illustrative PASS status | SkyTrack UI `Badge status='success'` | `src/features/studio/report-table.tsx:344,482-486,507-511` |
| Readiness count | SkyTrack UI `Badge status='secondary'` | `src/features/studio/report-table.tsx:380-384` |
| Preview disclosure | SkyTrack UI `Alert variant='info'` | `src/features/studio/report-table.tsx:367-374` |
| Section surface and borders | `bg-(--card)` and `border-border` | `src/features/studio/report-table.tsx:258-260` |
| Main and secondary text | `text-(--foreground)` and `text-(--muted-foreground)` | `src/features/studio/report-table.tsx:284,362,421` |
| Comparison-table borders | `border-border` | `src/features/studio/report-table.tsx:461,475` |

No raw palette class represents status meaning. PASS and status values remain explicitly illustrative in the detail disclosure and are not verified operational results.
