---
id: document-history
entity_type: editing
tags: [mission-studio-entity, entity-editing]
claim_status: prototype_behavior
---

# Undo / redo history

Committed mission edits create history snapshots; transient preview state is not canonical until commit.

**Relations:** [[mission-document|Studio mission document]], [[design-inspector|Design inspector]]

**Evidence:**
- [src/features/studio/mission-document.ts](../../src/features/studio/mission-document.ts)
- [src/features/studio/use-studio-document.ts](../../src/features/studio/use-studio-document.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
