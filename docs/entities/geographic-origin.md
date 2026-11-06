---
id: geographic-origin
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Geographic origin / ENU frame

Anchors local east-north-up meter coordinates to latitude/longitude. Changing origin moves the mission geographically without changing local geometry.

**Relations:** [[mission-document|Studio mission document]], [[world|World]], [[route|Route]], [[area|Area]], [[avoid-zone|Avoid zone]], [[cesium-scene|Cesium scene]], [[address-search|Address search]]

**Evidence:**
- [src/domain/mission-types.ts](../../src/domain/mission-types.ts)
- [src/domain/geo-math.ts](../../src/domain/geo-math.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
