---
id: recon-settings
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Area Recon settings

For 2D photogrammetry, altitude and overlap drive Area scan/capture spacing; double pattern adds crosshatch. 3D uses base/take-off altitude rules and manual line spacing.

**Relations:** [[area|Area]], [[mission-type|Mission type]], [[waypoint|Waypoint]], [[mission-action|Waypoint action]], [[simulation-plan|Simulation plan]]

**Evidence:**
- [src/domain/mission-types.ts](../../src/domain/mission-types.ts)
- [src/domain/area-scan.ts](../../src/domain/area-scan.ts)
- [src/features/design/panels/reconnaissance-inspector.tsx](../../src/features/design/panels/reconnaissance-inspector.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
