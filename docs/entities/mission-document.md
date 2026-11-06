---
id: mission-document
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Studio mission document

Canonical editable mission state and source for scene, validation, and simulation.

**Relations:** [[mission-type|Mission type]], [[geographic-origin|Geographic origin / ENU frame]], [[mission-drone|Selected mission drone]], [[mission-world|Selected mission World]], [[home-location|Home / spawn]], [[mission-settings|Mission settings]], [[mission-sequence|Route / Area sequence]], [[route|Route]], [[area|Area]], [[avoid-zone|Avoid zone]], [[ai-workflow|AI Workflow configuration]], [[mission-validation|Mission validation]], [[cesium-scene|Cesium scene]], [[simulation-plan|Simulation plan]], [[local-persistence|Browser-local persistence]]

**Evidence:**
- [src/domain/mission-types.ts](../../src/domain/mission-types.ts)
- [src/features/studio/mission-document.ts](../../src/features/studio/mission-document.ts)
- [src/features/studio/use-studio-document.ts](../../src/features/studio/use-studio-document.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
