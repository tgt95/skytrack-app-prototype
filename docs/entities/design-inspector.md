---
id: design-inspector
entity_type: editing
tags: [mission-studio-entity, entity-editing]
claim_status: prototype_behavior
---

# Design inspector

Edits settings, Route/Area sequence, Avoid zones, Recon, AI Workflow, and Code/Preview through preview, commit, and cancel paths.

**Relations:** [[studio-page|Studio page]], [[mission-document|Studio mission document]], [[drawing-session|Drawing session]], [[document-history|Undo / redo history]], [[code-view|Code view]], [[flight-preview|Flight preview]]

**Evidence:**
- [src/features/design/design-panel.tsx](../../src/features/design/design-panel.tsx)
- [src/features/design/use-design-panel-state.ts](../../src/features/design/use-design-panel-state.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
