---
id: avoid-zone
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Avoid zone

Polygon or cylinder constraint. Intersecting route legs can be rerouted through generated detours.

**Relations:** [[mission-document|Studio mission document]], [[route|Route]], [[waypoint|Waypoint]], [[mission-validation|Mission validation]], [[cesium-scene|Cesium scene]]

**Evidence:**
- [src/domain/avoid-detour.ts](../../src/domain/avoid-detour.ts)
- [src/features/design/panels/avoid-inspector-card.tsx](../../src/features/design/panels/avoid-inspector-card.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
