---
id: local-persistence
entity_type: storage
tags: [mission-studio-entity, entity-storage]
claim_status: prototype_behavior
---

# Browser-local persistence

Stores mission snapshots and resource metadata in browser storage; GLB models and previews use IndexedDB. No server sync.

**Relations:** [[mission-record|Mission record]], [[workspace|Workspace]], [[world|World]], [[drone-profile|Drone profile]], [[ai-model-record|AI model record]]

**Evidence:**
- [src/features/library/database/store.ts](../../src/features/library/database/store.ts)
- [src/features/library/database/world-glb-database.ts](../../src/features/library/database/world-glb-database.ts)
- [src/shared/storage-keys.ts](../../src/shared/storage-keys.ts)

**Claim boundary:** This note describes the current prototype source/architecture. It is not an approved product requirement unless a linked approved spec or decision says so.
