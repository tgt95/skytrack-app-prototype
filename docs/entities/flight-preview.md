---
id: flight-preview
entity_type: simulation
tags: [mission-studio-entity, entity-simulation]
claim_status: prototype_behavior
---

# Flight preview

Timeline and map representation of the estimated mission path; selection can focus the scene.

**Relations:** [[simulation-run|Mock simulation]], [[sampled-telemetry|Sampled telemetry and events]], [[design-inspector|Design inspector]], [[cesium-scene|Cesium scene]], [[scene-entity-layers|Scene entity layers]]

**Evidence:**
- [src/features/simulation/mission-preview-model.ts](../../src/features/simulation/mission-preview-model.ts)
- [src/features/simulation/mission-preview.tsx](../../src/features/simulation/mission-preview.tsx)
- [src/features/studio/use-studio-simulation-event-focus.ts](../../src/features/studio/use-studio-simulation-event-focus.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
