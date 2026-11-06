---
id: scene-entity-layers
entity_type: scene
tags: [mission-studio-entity, entity-scene]
claim_status: prototype_behavior
---

# Scene entity layers

Separates terrain, committed mission geometry, capture/preview geometry, and drafts so updates target owned entities.

**Relations:** [[cesium-scene|Cesium scene]], [[mission-document|Studio mission document]], [[drawing-session|Drawing session]], [[flight-preview|Flight preview]]

**Evidence:**
- [src/features/scene/scene-entity-ownership.ts](../../src/features/scene/scene-entity-ownership.ts)
- [src/features/scene/sync-committed-layer.ts](../../src/features/scene/sync-committed-layer.ts)
- [src/features/scene/scene-draft-sync.ts](../../src/features/scene/scene-draft-sync.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
