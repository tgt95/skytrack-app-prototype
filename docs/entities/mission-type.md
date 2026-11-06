---
id: mission-type
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Mission type

2D means photogrammetry and 3D means 3D mission. Both use the Cesium main scene; type changes World and Area behavior.

**Relations:** [[mission-document|Studio mission document]], [[mission-world|Selected mission World]], [[area|Area]], [[recon-settings|Area Recon settings]], [[cesium-scene|Cesium scene]]

**Evidence:**
- [src/domain/mission-types.ts](../../src/domain/mission-types.ts)
- [src/features/studio/mission-world-picker-dialog.tsx](../../src/features/studio/mission-world-picker-dialog.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
