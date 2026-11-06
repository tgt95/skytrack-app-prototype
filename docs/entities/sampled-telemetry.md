---
id: sampled-telemetry
entity_type: simulation
tags: [mission-studio-entity, entity-simulation]
claim_status: prototype_behavior
---

# Sampled telemetry and events

Position, status, and events derived from mock plan/time; not live drone telemetry.

**Relations:** [[simulation-run|Mock simulation]], [[flight-preview|Flight preview]], [[mission-report|Mission report]], [[mission-insights|Mission Insights]]

**Evidence:**
- [src/features/simulation/simulation-sampling.ts](../../src/features/simulation/simulation-sampling.ts)
- [src/features/simulation/simulation-details.tsx](../../src/features/simulation/simulation-details.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
