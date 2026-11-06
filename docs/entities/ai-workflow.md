---
id: ai-workflow
entity_type: mission
tags: [mission-studio-entity, entity-mission]
claim_status: prototype_behavior
---

# AI Workflow configuration

Local Start/Stop, detection, model reference, and IF/ELSE action configuration between waypoints. It does not execute AI inference.

**Relations:** [[mission-document|Studio mission document]], [[ai-model-record|AI model record]], [[waypoint|Waypoint]], [[mission-action|Waypoint action]]

**Evidence:**
- [src/domain/mission-types.ts](../../src/domain/mission-types.ts)
- [src/features/design/sequence/ai-workflow-card.tsx](../../src/features/design/sequence/ai-workflow-card.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
