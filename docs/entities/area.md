---
id: area
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Area

Survey footprint that generates scan lines and Area-owned waypoints; behavior depends on mission type and scan settings.

**Relations:** [[mission-sequence|Route / Area sequence]], [[mission-type|Mission type]], [[recon-settings|Area Recon settings]], [[waypoint|Waypoint]], [[mission-action|Waypoint action]], [[mission-settings|Mission settings]], [[transfer-path|Transfer path]], [[mission-validation|Mission validation]]

**Evidence:**
- [src/domain/area-scan.ts](../../src/domain/area-scan.ts)
- [src/features/design/sequence/area-inspector-card.tsx](../../src/features/design/sequence/area-inspector-card.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
