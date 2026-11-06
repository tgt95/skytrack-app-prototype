---
id: transfer-path
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# Transfer path

Connection between consecutive planning blocks, included in sequence and simulation calculations.

**Relations:** [[mission-sequence|Route / Area sequence]], [[route|Route]], [[area|Area]], [[mission-validation|Mission validation]], [[simulation-plan|Simulation plan]]

**Evidence:**
- [src/domain/transfer-planner.ts](../../src/domain/transfer-planner.ts)
- [src/features/design/sequence/sequence-transfer.tsx](../../src/features/design/sequence/sequence-transfer.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
