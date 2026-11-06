---
id: home-location
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Home / spawn

Ground launch and return location. Take-off altitude is configured separately.

**Relations:** [[mission-document|Studio mission document]], [[mission-settings|Mission settings]], [[cesium-scene|Cesium scene]], [[simulation-plan|Simulation plan]]

**Evidence:**
- [src/domain/mission-types.ts](../../src/domain/mission-types.ts)
- [src/features/scene/sync-home-entities.ts](../../src/features/scene/sync-home-entities.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
