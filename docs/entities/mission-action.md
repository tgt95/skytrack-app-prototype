---
id: mission-action
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Waypoint action

Photo, video, or LiDAR action attached to a waypoint; drone compatibility is validated.

**Relations:** [[waypoint|Waypoint]], [[mission-drone|Selected mission drone]], [[area|Area]], [[mission-validation|Mission validation]], [[simulation-plan|Simulation plan]]

**Evidence:**
- [src/domain/mission-types.ts](../../src/domain/mission-types.ts)
- [src/domain/mission-validation.ts](../../src/domain/mission-validation.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
