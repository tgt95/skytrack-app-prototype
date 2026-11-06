---
id: code-view
entity_type: editing
tags: [mission-studio-entity, entity-editing]
claim_status: prototype_behavior
---

# Code view

JSON view can round-trip mission data. Python editor is a non-executing local draft.

**Relations:** [[design-inspector|Design inspector]], [[mission-document|Studio mission document]]

**Evidence:**
- [src/domain/mission-serialization.ts](../../src/domain/mission-serialization.ts)
- [src/features/design/panels/code-inspector-panel.tsx](../../src/features/design/panels/code-inspector-panel.tsx)
- [src/features/design/panels/python-editor.tsx](../../src/features/design/panels/python-editor.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
