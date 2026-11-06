---
id: route
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Route

Authored path of waypoints with optional camera or LiDAR actions.

**Relations:** [[mission-sequence|Route / Area sequence]], [[waypoint|Waypoint]], [[mission-action|Waypoint action]], [[avoid-zone|Avoid zone]], [[transfer-path|Transfer path]], [[mission-validation|Mission validation]]

**Evidence:**
- [src/domain/mission-types.ts](../../src/domain/mission-types.ts)
- [src/features/design/sequence/route-sequence-card.tsx](../../src/features/design/sequence/route-sequence-card.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
