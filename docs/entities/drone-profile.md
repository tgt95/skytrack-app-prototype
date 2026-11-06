---
id: drone-profile
entity_type: library
tags: [mission-studio-entity, entity-library]
claim_status: prototype_behavior
---

# Drone profile

Workspace resource describing drone capabilities and performance; mission selection and validation consume it.

**Relations:** [[workspace|Workspace]], [[mission-drone|Selected mission drone]], [[mission-validation|Mission validation]]

**Evidence:**
- [src/features/library/database/drone-store.ts](../../src/features/library/database/drone-store.ts)
- [src/features/library/drone-profile-dialog.tsx](../../src/features/library/drone-profile-dialog.tsx)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
