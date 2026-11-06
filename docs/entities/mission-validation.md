---
id: mission-validation
entity_type: simulation
tags: [mission-studio-entity, entity-simulation]
claim_status: prototype_behavior
---

# Mission validation

Checks mission structure, geometry, actions, drone compatibility, Avoid intersections, and transfer constraints; results gate Simulation.

**Relations:** [[mission-document|Studio mission document]], [[mission-drone|Selected mission drone]], [[route|Route]], [[area|Area]], [[avoid-zone|Avoid zone]], [[mission-action|Waypoint action]], [[transfer-path|Transfer path]], [[simulation-plan|Simulation plan]]

**Evidence:**
- [src/domain/mission-validation.ts](../../src/domain/mission-validation.ts)
- [src/features/design/panels/mission-settings-card.tsx](../../src/features/design/panels/mission-settings-card.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
