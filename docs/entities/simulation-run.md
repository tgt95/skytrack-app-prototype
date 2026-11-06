---
id: simulation-run
entity_type: simulation
tags: [mission-studio-entity, entity-simulation]
claim_status: prototype_behavior
---

# Mock simulation

Local timed playback with pause/resume/restart and optional injected mock failure; it is not real flight physics or vehicle control.

**Relations:** [[simulation-plan|Simulation plan]], [[sampled-telemetry|Sampled telemetry and events]], [[flight-preview|Flight preview]], [[mission-report|Mission report]]

**Evidence:**
- [src/features/simulation/simulation.ts](../../src/features/simulation/simulation.ts)
- [src/features/simulation/simulation-types.ts](../../src/features/simulation/simulation-types.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
