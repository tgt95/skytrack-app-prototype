---
id: cesium-scene
entity_type: scene
tags: [mission-studio-entity, entity-scene]
claim_status: prototype_behavior
---

# Cesium scene

Renders mission entities, selected World layers, basemap, camera, and editing interactions.

**Relations:** [[studio-page|Studio page]], [[mission-document|Studio mission document]], [[mission-world|Selected mission World]], [[geographic-origin|Geographic origin / ENU frame]], [[scene-entity-layers|Scene entity layers]], [[scene-camera|Scene camera and compass]], [[basemap|Basemap]], [[address-search|Address search]]

**Evidence:**
- [src/features/scene/mission-scene.tsx](../../src/features/scene/mission-scene.tsx)
- [src/features/scene/scene-viewer-runtime.ts](../../src/features/scene/scene-viewer-runtime.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
