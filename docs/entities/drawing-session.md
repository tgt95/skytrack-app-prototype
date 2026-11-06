---
id: drawing-session
entity_type: editing
tags: [mission-studio-entity, entity-editing]
claim_status: prototype_behavior
---

# Drawing session

Transient drawing tool, draft geometry, and draft form state. Draft is separate from canonical mission until committed.

**Relations:** [[studio-page|Studio page]], [[design-inspector|Design inspector]], [[cesium-scene|Cesium scene]], [[mission-document|Studio mission document]]

**Evidence:**
- [src/features/studio/use-drawing-session.ts](../../src/features/studio/use-drawing-session.ts)
- [src/features/design/drawing/zone-draft-panel.tsx](../../src/features/design/drawing/zone-draft-panel.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
