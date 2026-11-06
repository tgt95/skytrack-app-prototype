---
id: waypoint
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Waypoint

Authored Route point or generated Area/Avoid point. Provenance supports regeneration; eligible explicit altitude overrides can persist.

**Relations:** [[route|Route]], [[area|Area]], [[avoid-zone|Avoid zone]], [[mission-action|Waypoint action]], [[ai-workflow|AI Workflow configuration]], [[cesium-scene|Cesium scene]], [[simulation-plan|Simulation plan]]

**Evidence:**
- [src/domain/mission-types.ts](../../src/domain/mission-types.ts)
- [src/domain/mission-generation.ts](../../src/domain/mission-generation.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
